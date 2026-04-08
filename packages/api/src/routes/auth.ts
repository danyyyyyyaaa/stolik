import { Router } from 'express'
import { PrismaClient, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { randomUUID, randomBytes } from 'crypto'
import { requireAuth } from '../middleware/auth'
import { sendVerificationEmail } from '../services/email'

function generateReferralCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

const router = Router()
const prisma = new PrismaClient()

const REFRESH_TOKEN_TTL_DAYS     = 30
const ACCESS_TOKEN_TTL           = '15m'
const EMAIL_VERIFY_TTL_HOURS     = 24
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://stolik-dashboard.vercel.app'

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

const registerSchema = z.object({
  email:        z.string().email(),
  password:     z.string().min(6),
  firstName:    z.string().min(1),
  lastName:     z.string().min(1),
  phone:        z.string().optional(),
  role:         z.enum(['guest', 'owner']).default('guest'),
  referralCode: z.string().optional(),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(6),
})

// ─── Helper: create email verification record + send email ───────────────────
async function createAndSendEmailVerification(userId: string, email: string, firstName: string): Promise<void> {
  const token     = randomUUID()
  const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000)
  await prisma.emailVerification.create({ data: { token, userId, expiresAt } })
  sendVerificationEmail(email, firstName, token).catch(err =>
    console.error('[Email] Verification send failed:', err)
  )
}

// ─── Helper: create refresh token in DB ──────────────────────────────────────
async function createRefreshToken(userId: string): Promise<string> {
  const token     = randomUUID()
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } })
  return token
}

// ─── Helper: build auth response ─────────────────────────────────────────────
function buildUserPayload(user: { id: string; email: string; role: string; firstName: string; lastName: string; isVerified: boolean }) {
  return { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, isVerified: user.isVerified }
}

// ─── REGISTER ────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    return res.status(400).json({ error: first?.message ?? 'Invalid data' })
  }

  const { password, referralCode: inputReferralCode, ...userData } = parsed.data
  try {
    const passwordHash = await bcrypt.hash(password, 10)
    const newReferralCode = generateReferralCode()

    // Find referrer if code provided
    let referrerId: string | undefined
    if (inputReferralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: inputReferralCode.toUpperCase() } })
      if (referrer) referrerId = referrer.id
    }

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { ...userData, passwordHash, referralCode: newReferralCode, ...(referrerId ? { referredById: referrerId } : {}) },
      })
      if (referrerId) {
        await tx.referral.create({ data: { referrerId, referredId: u.id } }).catch(() => {})
      }
      return u
    })

    const accessToken  = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: ACCESS_TOKEN_TTL })
    const refreshToken = await createRefreshToken(user.id)

    // Fire-and-forget email verification
    createAndSendEmailVerification(user.id, user.email, user.firstName).catch(() => {})

    res.status(201).json({
      token: accessToken,
      accessToken,
      refreshToken,
      user: buildUserPayload(user),
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }
    console.error('Register error:', err)
    res.status(500).json({ error: 'Registration failed — please try again' })
  }
})

// ─── LOGIN ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })
  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

  const accessToken  = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: ACCESS_TOKEN_TTL })
  const refreshToken = await createRefreshToken(user.id)

  res.json({
    token: accessToken,   // backwards-compatible field
    accessToken,
    refreshToken,
    user: buildUserPayload(user),
  })
})

// ─── REFRESH ──────────────────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'refreshToken required' })

  const { refreshToken } = parsed.data
  try {
    const record = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid refresh token' })
    }

    // Rotation: revoke old token, issue new pair
    const [newAccessToken, newRefreshToken] = await prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: record.id },
        data:  { revokedAt: new Date() },
      })
      const at = jwt.sign({ userId: record.userId }, process.env.JWT_SECRET!, { expiresIn: ACCESS_TOKEN_TTL })
      const rt = randomUUID()
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
      await tx.refreshToken.create({ data: { token: rt, userId: record.userId, expiresAt } })
      return [at, rt]
    })

    res.json({ accessToken: newAccessToken, token: newAccessToken, refreshToken: newRefreshToken })
  } catch (err) {
    console.error('Refresh error:', err)
    res.status(500).json({ error: 'Token refresh failed' })
  }
})

// ─── LOGOUT ──────────────────────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body)
  if (!parsed.success) return res.status(200).json({ ok: true }) // silently ignore

  const { refreshToken } = parsed.data
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken, revokedAt: null },
    data:  { revokedAt: new Date() },
  }).catch(() => {})

  res.json({ ok: true })
})

// ─── ME ───────────────────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  const userId = (req as any).userId
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return res.status(404).json({ error: 'User not found' })
  const payload = buildUserPayload(user)
  res.json({
    ...payload,
    birthdayMonth: user.dateOfBirth ? user.dateOfBirth.getMonth() + 1 : null,
    birthdayDay:   user.dateOfBirth ? user.dateOfBirth.getDate()       : null,
    hasDob:        !!user.dateOfBirth,
  })
})

// ─── CHANGE PASSWORD ─────────────────────────────────────────────────────────
router.patch('/change-password', requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid data' })

  const userId = (req as any).userId
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.passwordHash) return res.status(404).json({ error: 'User not found' })

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10)

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } }),
    // Revoke all refresh tokens on password change
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data:  { revokedAt: new Date() },
    }),
  ])

  res.json({ ok: true })
})

// ─── DELETE ACCOUNT ───────────────────────────────────────────────────────────
router.delete('/account', requireAuth, async (req, res) => {
  const userId = (req as any).userId
  try {
    // Cancel pending bookings first, then delete user (cascade handles tokens)
    await prisma.$transaction(async (tx) => {
      await tx.booking.updateMany({
        where: { userId, status: { in: ['pending', 'confirmed'] } },
        data:  { status: 'cancelled' },
      })
      await tx.user.delete({ where: { id: userId } })
    })
    res.json({ ok: true })
  } catch (err) {
    console.error('Delete account error:', err)
    res.status(500).json({ error: 'Could not delete account' })
  }
})

// ─── VERIFY EMAIL ─────────────────────────────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  const { token } = req.query
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token required' })
  }

  try {
    const record = await prisma.emailVerification.findUnique({ where: { token } })

    if (!record) return res.status(400).json({ error: 'Invalid token' })
    if (record.expiresAt < new Date()) return res.status(410).json({ error: 'Token expired — request a new one' })

    // Already used — just redirect
    if (record.usedAt) return res.redirect(`${DASHBOARD_URL}/dashboard?verified=1`)

    await prisma.$transaction([
      prisma.emailVerification.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: record.userId }, data: { isVerified: true } }),
    ])

    res.redirect(`${DASHBOARD_URL}/dashboard?verified=1`)
  } catch (err) {
    console.error('Verify email error:', err)
    res.status(500).json({ error: 'Verification failed' })
  }
})

// ─── RESEND VERIFICATION ──────────────────────────────────────────────────────
router.post('/resend-verification', requireAuth, async (req, res) => {
  const userId = (req as any).userId
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return res.status(404).json({ error: 'User not found' })
  if (user.isVerified) return res.json({ ok: true }) // already verified

  // Rate limit: 1 per 5 minutes
  const recent = await prisma.emailVerification.findFirst({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
  })
  if (recent) return res.status(429).json({ error: 'Please wait 5 minutes before requesting a new link' })

  await createAndSendEmailVerification(userId, user.email, user.firstName)
  res.json({ ok: true })
})

// ─── FORGOT PASSWORD ─────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email required' })

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (user) {
      // Invalidate any existing tokens
      await prisma.passwordReset.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() }
      })

      const token = randomUUID()
      await prisma.passwordReset.create({
        data: {
          token,
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        }
      })

      const dashboardUrl = process.env.DASHBOARD_URL || 'https://stolik-dashboard.vercel.app'
      console.log(`[PasswordReset] Reset link: ${dashboardUrl}/reset-password?token=${token}`)
      // Try to send email via Resend REST API if configured
      if (process.env.RESEND_API_KEY) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: process.env.EMAIL_FROM || 'Stolik <no-reply@stolik.pl>',
              to: email,
              subject: 'Reset your Stolik password',
              html: `<p>Hi ${user.firstName},</p><p>Click below to reset your password:</p><p><a href="${dashboardUrl}/reset-password?token=${token}">Reset Password</a></p><p>Link expires in 1 hour.</p>`,
            }),
          })
        } catch {}
      }
    }
    // Always return 200 for security
    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' })
  } catch (err) {
    console.error('Forgot password error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// ─── RESET PASSWORD ──────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body
  if (!token || !newPassword) return res.status(400).json({ error: 'token and newPassword required' })
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

  try {
    const reset = await prisma.passwordReset.findUnique({ where: { token } })
    if (!reset || reset.usedAt) return res.status(400).json({ error: 'Invalid or already used token' })
    if (reset.expiresAt < new Date()) return res.status(410).json({ error: 'Token expired. Request a new reset link.' })

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      prisma.refreshToken.deleteMany({ where: { userId: reset.userId } }),
    ])

    res.json({ success: true })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// ─── CHANGE EMAIL (step 1: send verification to new address) ─────────────────
router.post('/change-email', requireAuth, async (req, res) => {
  const { newEmail } = req.body
  const userId = (req as any).userId
  if (!newEmail || !newEmail.includes('@')) return res.status(400).json({ error: 'Invalid email' })

  const taken = await prisma.user.findFirst({ where: { email: newEmail, NOT: { id: userId } } })
  if (taken) return res.status(409).json({ error: 'Email already in use' })

  const token     = randomUUID()
  const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000)
  await prisma.emailVerification.create({ data: { token, userId, newEmail, expiresAt } })

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true } })
  sendVerificationEmail(newEmail, user?.firstName ?? 'there', token).catch(err =>
    console.error('[Email] Change-email verification failed:', err)
  )
  res.json({ success: true })
})

// ─── CHANGE EMAIL (step 2: confirm via token) ─────────────────────────────────
router.post('/verify-new-email', requireAuth, async (req, res) => {
  const { token } = req.body
  const userId = (req as any).userId
  if (!token) return res.status(400).json({ error: 'Token required' })

  const record = await prisma.emailVerification.findUnique({ where: { token } })
  if (!record || record.userId !== userId || !record.newEmail) {
    return res.status(400).json({ error: 'Invalid token' })
  }
  if (record.usedAt || record.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Token expired or already used' })
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { email: record.newEmail } }),
    prisma.emailVerification.update({ where: { token }, data: { usedAt: new Date() } }),
  ])

  res.json({ success: true, email: record.newEmail })
})

// ─── CHANGE PHONE (step 1: send 6-digit SMS code) ────────────────────────────
router.post('/change-phone', requireAuth, async (req, res) => {
  const { newPhone } = req.body
  const userId = (req as any).userId
  if (!newPhone || newPhone.length < 9) return res.status(400).json({ error: 'Invalid phone number' })

  const code      = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 min

  // Invalidate previous codes for this user
  await prisma.phoneVerification.deleteMany({ where: { userId } })
  await prisma.phoneVerification.create({ data: { code, userId, newPhone, expiresAt } })

  // Send via Twilio if configured, otherwise log
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_FROM_NUMBER
  if (accountSid && authToken && fromNumber) {
    const twilio = (await import('twilio')).default(accountSid, authToken)
    await twilio.messages.create({
      from: fromNumber,
      to:   newPhone,
      body: `Stolik: Your verification code is ${code}. Valid for 15 minutes.`,
    }).catch(err => console.error('[SMS] Change-phone code failed:', err))
  } else {
    console.log(`[SMS] Change-phone code for ${newPhone}: ${code}`)
  }

  res.json({ success: true })
})

// ─── CHANGE PHONE (step 2: verify code) ──────────────────────────────────────
router.post('/verify-new-phone', requireAuth, async (req, res) => {
  const { code } = req.body
  const userId = (req as any).userId
  if (!code) return res.status(400).json({ error: 'Code required' })

  const record = await prisma.phoneVerification.findFirst({
    where: { userId, code, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  if (!record) return res.status(400).json({ error: 'Invalid or expired code' })

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { phone: record.newPhone } }),
    prisma.phoneVerification.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ])

  res.json({ success: true, phone: record.newPhone })
})

// ─── UPDATE PROFILE ──────────────────────────────────────────────────────────
router.patch('/profile', requireAuth, async (req, res) => {
  const { firstName, lastName, phone, avatarUrl, dateOfBirth } = req.body
  const userId = (req as any).userId

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        // Accept ISO date string or null; never expose exact DOB to restaurants
        ...(dateOfBirth !== undefined && {
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        }),
        lastActiveAt: new Date(),
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, avatarUrl: true, role: true, isVerified: true,
        dateOfBirth: true,
      }
    })
    // Strip exact DOB before sending — expose only month + day for birthday perks
    const { dateOfBirth: dob, ...rest } = user
    res.json({
      ...rest,
      birthdayMonth: dob ? dob.getMonth() + 1 : null,   // 1-12
      birthdayDay:   dob ? dob.getDate()        : null,
      hasDob:        !!dob,
    })
  } catch (err) {
    console.error('Update profile error:', err)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

export { router as authRouter }
