import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// ─── Helper: verify user owns the restaurant ─────────────────────────────────

async function ownerOf(restaurantId: string, userId: string) {
  return prisma.restaurant.findFirst({
    where: { id: restaurantId, ownerId: userId },
  })
}

// ─── GET /api/guests/:restaurantId — list with optional search ────────────────

router.get('/:restaurantId', requireAuth, async (req, res) => {
  const userId = (req as any).userId
  const { restaurantId } = req.params
  const { search } = req.query

  const restaurant = await ownerOf(restaurantId, userId)
  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found or access denied' })
  }

  const guests = await prisma.guestProfile.findMany({
    where: {
      restaurantId,
      ...(search ? {
        OR: [
          { phone: { contains: search as string, mode: 'insensitive' } },
          { name:  { contains: search as string, mode: 'insensitive' } },
        ],
      } : {}),
    },
    orderBy: [{ isVip: 'desc' }, { lastVisit: 'desc' }],
  })

  res.json(guests)
})

// ─── GET /api/guests/:restaurantId/:guestId — guest profile ──────────────────

router.get('/:restaurantId/:guestId', requireAuth, async (req, res) => {
  const userId = (req as any).userId
  const { restaurantId, guestId } = req.params

  const restaurant = await ownerOf(restaurantId, userId)
  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found or access denied' })
  }

  const guest = await prisma.guestProfile.findFirst({
    where: { id: guestId, restaurantId },
    include: {
      // last 10 bookings for this guest (matched by phone)
      restaurant: false,
    },
  })

  if (!guest) {
    return res.status(404).json({ error: 'Guest not found' })
  }

  // fetch booking history separately to avoid cross-model relation gap
  const bookings = await prisma.booking.findMany({
    where: { restaurantId, guestPhone: guest.phone },
    select: {
      id: true, bookingRef: true, date: true, time: true,
      guestCount: true, status: true, notes: true, createdAt: true,
      table: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
    take: 20,
  })

  res.json({ ...guest, bookings })
})

// ─── PATCH /api/guests/:restaurantId/:guestId — update CRM fields ─────────────

const updateGuestSchema = z.object({
  name:      z.string().min(1).optional(),
  email:     z.string().email().optional(),
  notes:     z.string().optional(),
  tags:      z.array(z.string()).optional(),
  isVip:     z.boolean().optional(),
  isBlocked: z.boolean().optional(),
})

router.patch('/:restaurantId/:guestId', requireAuth, async (req, res) => {
  const userId = (req as any).userId
  const { restaurantId, guestId } = req.params

  const restaurant = await ownerOf(restaurantId, userId)
  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found or access denied' })
  }

  const guest = await prisma.guestProfile.findFirst({
    where: { id: guestId, restaurantId },
  })
  if (!guest) {
    return res.status(404).json({ error: 'Guest not found' })
  }

  try {
    const data = updateGuestSchema.parse(req.body)
    const updated = await prisma.guestProfile.update({
      where: { id: guestId },
      data,
    })
    res.json(updated)
  } catch (err) {
    res.status(400).json({ error: 'Invalid data', details: err })
  }
})

export { router as guestsRouter }
