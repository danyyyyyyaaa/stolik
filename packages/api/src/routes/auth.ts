import { Router } from 'express'
import { PrismaClient, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { requireAuth } from '../middleware/auth'
import { sendVerificationEmail } from '../services/email'

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
  email:     z.string().email(),
  password:  z.string().min(6),
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  phone:     z.string().optional(),
  role:      z.enum(['guest', 'owner']).default('guest'),
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

  const { password, ...userData } = parsed.data
  try {
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { ...userData, passwordHash },
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
  res.json(buildUserPayload(user))
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

export { router as authRouter }
