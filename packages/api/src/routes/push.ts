import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// ─── POST /api/push/register-token — save expo push token for user ──────────
router.post('/register-token', requireAuth, async (req, res) => {
  const { expoPushToken } = req.body
  const userId = (req as any).userId
  if (!expoPushToken) return res.status(400).json({ error: 'expoPushToken required' })

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { expoPushToken, lastActiveAt: new Date() }
    })
    res.json({ success: true })
  } catch (err) {
    console.error('Register push token error:', err)
    res.status(500).json({ error: 'Failed to register push token' })
  }
})

export { router as pushRouter }
