import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth, requireRestaurant } from '../middleware/auth'

const router = Router({ mergeParams: true }) // params from /api/restaurants/:id/waitlist
const prisma = new PrismaClient()

// ─── Push helper ─────────────────────────────────────────────────────────────
async function sendExpoPush(pushToken: string, title: string, body: string, data?: object) {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: pushToken, title, body, data, sound: 'default' }),
    })
  } catch (err) {
    console.error('[Push] Failed to send expo push:', err)
  }
}

const joinSchema = z.object({
  date:      z.string(), // "2024-03-20"
  timeSlot:  z.string(), // "19:00"
  partySize: z.number().int().min(1).max(20),
  guestName: z.string().min(2),
  guestPhone:z.string().min(9),
  guestEmail:z.string().email().optional(),
})

// ─── POST /api/restaurants/:id/waitlist — join ───────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const restaurantId = (req.params as any).id as string
    const data = joinSchema.parse(req.body)

    // Prevent duplicate: same phone + restaurant + date + timeSlot
    const existing = await prisma.waitlist.findFirst({
      where: {
        restaurantId,
        date:      new Date(`${data.date}T${data.timeSlot}:00`),
        timeSlot:  data.timeSlot,
        guestPhone: data.guestPhone,
        status:    'waiting',
      },
    })
    if (existing) return res.json({ success: true, entry: existing, duplicate: true })

    // Count position
    const position = await prisma.waitlist.count({
      where: { restaurantId, date: new Date(`${data.date}T00:00:00`), timeSlot: data.timeSlot, status: 'waiting' },
    })

    // Attach userId if authenticated
    let userId: string | undefined
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const jwt = await import('jsonwebtoken')
        const decoded = jwt.default.verify(authHeader.slice(7), process.env.JWT_SECRET!) as any
        userId = decoded.userId
      } catch {}
    }

    const entry = await prisma.waitlist.create({
      data: {
        restaurantId,
        date:      new Date(`${data.date}T${data.timeSlot}:00`),
        timeSlot:  data.timeSlot,
        partySize: data.partySize,
        guestName: data.guestName,
        guestPhone:data.guestPhone,
        guestEmail:data.guestEmail,
        ...(userId ? { userId } : {}),
      },
    })

    res.status(201).json({ success: true, entry, position: position + 1 })
  } catch (err) { next(err) }
})

// ─── GET /api/restaurants/:id/waitlist — list (dashboard, owner only) ────────
router.get('/', requireAuth, requireRestaurant, async (req, res, next) => {
  try {
    const restaurantId = (req.params as any).id as string
    const { date } = req.query

    const where: any = { restaurantId }
    if (date) {
      where.date = {
        gte: new Date(`${date}T00:00:00`),
        lte: new Date(`${date}T23:59:59`),
      }
    }

    // Auto-expire entries older than 24h past their slot
    const expireBefore = new Date(Date.now() - 24 * 60 * 60 * 1000)
    await prisma.waitlist.updateMany({
      where: { restaurantId, date: { lt: expireBefore }, status: 'waiting' },
      data:  { status: 'expired' },
    })

    const entries = await prisma.waitlist.findMany({
      where,
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    })

    res.json(entries)
  } catch (err) { next(err) }
})

// ─── DELETE /api/restaurants/:id/waitlist/:entryId — leave ───────────────────
router.delete('/:entryId', async (req, res, next) => {
  try {
    const restaurantId = (req.params as any).id as string
    const { entryId } = req.params
    const entry = await prisma.waitlist.findUnique({ where: { id: entryId } })
    if (!entry || entry.restaurantId !== restaurantId) {
      return res.status(404).json({ error: 'Not found' })
    }
    await prisma.waitlist.delete({ where: { id: entryId } })
    res.json({ success: true })
  } catch (err) { next(err) }
})

// ─── POST /api/restaurants/:id/waitlist/:entryId/notify — manual notify ──────
router.post('/:entryId/notify', requireAuth, requireRestaurant, async (req, res, next) => {
  try {
    const entry = await prisma.waitlist.findUnique({
      where: { id: req.params.entryId },
      include: { restaurant: { select: { name: true } } },
    })
    if (!entry) return res.status(404).json({ error: 'Not found' })

    // Send push if user has token
    if (entry.userId) {
      const user = await prisma.user.findUnique({
        where: { id: entry.userId },
        select: { expoPushToken: true },
      })
      if (user?.expoPushToken) {
        await sendExpoPush(
          user.expoPushToken,
          '🪑 Table available!',
          `A table opened at ${entry.restaurant.name}! Tap to book now.`,
          { screen: 'booking', restaurantId: entry.restaurantId, date: entry.timeSlot },
        )
      }
    }

    await prisma.waitlist.update({
      where: { id: entry.id },
      data:  { status: 'notified', notifiedAt: new Date() },
    })

    res.json({ success: true })
  } catch (err) { next(err) }
})

// ─── Exported helper: notify first waiting entry for a slot ──────────────────
export async function notifyWaitlistForSlot(
  restaurantId: string,
  date: Date,
  timeSlot: string,
  restaurantName: string,
): Promise<void> {
  const entry = await prisma.waitlist.findFirst({
    where: {
      restaurantId,
      date:     { gte: new Date(date.toISOString().slice(0, 10) + 'T00:00:00'), lte: new Date(date.toISOString().slice(0, 10) + 'T23:59:59') },
      timeSlot,
      status:   'waiting',
    },
    include: { user: { select: { expoPushToken: true } } },
    orderBy: { createdAt: 'asc' },
  })

  if (!entry) return

  if (entry.user?.expoPushToken) {
    await sendExpoPush(
      entry.user.expoPushToken,
      '🪑 Table available!',
      `A table opened at ${restaurantName} at ${timeSlot}! Tap to book now.`,
      { screen: 'booking', restaurantId, date: date.toISOString().slice(0, 10), time: timeSlot },
    )
  }

  await prisma.waitlist.update({
    where: { id: entry.id },
    data:  { status: 'notified', notifiedAt: new Date() },
  })
}

export { router as waitlistRouter }
