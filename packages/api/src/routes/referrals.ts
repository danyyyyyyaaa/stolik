import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth'
import { randomBytes } from 'crypto'

export const router = Router()
const prisma = new PrismaClient()

// ─── Generate unique referral code ───────────────────────────────────────────
export function generateReferralCode(): string {
  return randomBytes(4).toString('hex').toUpperCase() // e.g. "A1B2C3D4"
}

// ─── GET /api/referrals/stats ─────────────────────────────────────────────────
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId as string
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    // Ensure user has a referral code
    let referralCode = user.referralCode
    if (!referralCode) {
      referralCode = generateReferralCode()
      await prisma.user.update({ where: { id: userId }, data: { referralCode } })
    }

    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      include: { referred: { select: { firstName: true, lastName: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const pending   = referrals.filter(r => r.status === 'pending').length
    const completed = referrals.filter(r => r.status === 'completed').length

    res.json({
      referralCode,
      totalReferrals:    referrals.length,
      pendingReferrals:  pending,
      completedReferrals: completed,
      referrals: referrals.map(r => ({
        id: r.id,
        name: `${r.referred.firstName} ${r.referred.lastName}`.trim(),
        status: r.status,
        completedAt: r.completedAt,
        joinedAt: r.createdAt,
      })),
    })
  } catch (err) { next(err) }
})

export { router as referralsRouter }
