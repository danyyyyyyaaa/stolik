import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'

const router = Router({ mergeParams: true })
const prisma = new PrismaClient()

// GET /api/bookings/:bookingId/messages
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { bookingId } = req.params
    const userId = (req as any).userId

    // Verify user can access this booking (guest or restaurant owner or admin)
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { restaurant: { select: { ownerId: true } } },
    })
    if (!booking) return res.status(404).json({ error: 'Booking not found' })

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const isOwner = booking.restaurant.ownerId === userId
    const isGuest = booking.userId === userId
    if (user.role !== 'admin' && !isOwner && !isGuest) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const messages = await prisma.bookingMessage.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    })
    res.json(messages)
  } catch (err) { next(err) }
})

// POST /api/bookings/:bookingId/messages
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { bookingId } = req.params
    const userId = (req as any).userId

    const schema = z.object({ message: z.string().min(1).max(1000) })
    const { message } = schema.parse(req.body)

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { restaurant: { select: { ownerId: true } } },
    })
    if (!booking) return res.status(404).json({ error: 'Booking not found' })

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const isOwner = booking.restaurant.ownerId === userId || user.role === 'admin'
    const isGuest = booking.userId === userId

    if (!isOwner && !isGuest) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const senderRole = isOwner ? 'restaurant' : 'guest'
    const msg = await prisma.bookingMessage.create({
      data: { bookingId, senderId: userId, senderRole, message },
    })
    res.status(201).json(msg)
  } catch (err) { next(err) }
})

export { router as messagesRouter }
