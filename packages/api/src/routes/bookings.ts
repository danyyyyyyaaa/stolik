import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { sendBookingConfirmation, scheduleReminders } from '../services/sms'

const router = Router()
const prisma = new PrismaClient()

// ─── CREATE BOOKING (public — used by widget and app) ────────────────────────
const createBookingSchema = z.object({
  restaurantId: z.string(),
  date: z.string(), // "2024-03-20"
  time: z.string(), // "19:00"
  guestCount: z.number().min(1).max(20),
  guestName: z.string().min(2),
  guestPhone: z.string().min(9),
  guestEmail: z.string().email().optional(),
  notes: z.string().optional(),
  source: z.enum(['app', 'widget', 'manual', 'instagram']).default('app'),
})

router.post('/', async (req, res) => {
  try {
    const data = createBookingSchema.parse(req.body)

    // Find available table
    const bookingDate = new Date(`${data.date}T${data.time}:00`)

    // Generate booking ref
    const bookingRef = `#ST${Math.floor(Math.random() * 9000 + 1000)}`

    const booking = await prisma.booking.create({
      data: {
        bookingRef,
        restaurantId: data.restaurantId,
        date: bookingDate,
        time: data.time,
        guestCount: data.guestCount,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        guestEmail: data.guestEmail,
        notes: data.notes,
        source: data.source,
        status: 'confirmed',
      },
      include: { restaurant: true, table: true }
    })

    sendBookingConfirmation(booking).catch(err =>
      console.error('[SMS] Confirmation failed:', err)
    )
    scheduleReminders(booking)

    res.json({ success: true, booking })
  } catch (err) {
    res.status(400).json({ error: 'Invalid booking data', details: err })
  }
})

// ─── GET AVAILABLE SLOTS ──────────────────────────────────────────────────────
router.get('/slots', async (req, res) => {
  const { restaurantId, date, guestCount } = req.query

  if (!restaurantId || !date) {
    return res.status(400).json({ error: 'restaurantId and date required' })
  }

  // Get all bookings for that day
  const dayStart = new Date(`${date}T00:00:00`)
  const dayEnd = new Date(`${date}T23:59:59`)

  const existingBookings = await prisma.booking.findMany({
    where: {
      restaurantId: restaurantId as string,
      date: { gte: dayStart, lte: dayEnd },
      status: { in: ['pending', 'confirmed'] }
    }
  })

  // Generate available slots (simple version — full logic in production)
  const allSlots = ['12:00','12:30','13:00','13:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30']
  const bookedTimes = existingBookings.map(b => b.time)

  const availableSlots = allSlots.filter(slot => {
    const bookingsAtSlot = bookedTimes.filter(t => t === slot).length
    return bookingsAtSlot < 3 // max 3 concurrent bookings per slot
  })

  res.json({ slots: availableSlots, date })
})

// ─── GET MY BOOKINGS (authenticated user) ────────────────────────────────────
router.get('/my', requireAuth, async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { userId: (req as any).userId },
    include: { restaurant: true, table: true },
    orderBy: { date: 'desc' }
  })
  res.json(bookings)
})

// ─── RESTAURANT: GET TODAY'S BOOKINGS ────────────────────────────────────────
router.get('/today/:restaurantId', requireAuth, async (req, res) => {
  const today = new Date()
  const start = new Date(today.setHours(0,0,0,0))
  const end = new Date(today.setHours(23,59,59,999))

  const bookings = await prisma.booking.findMany({
    where: {
      restaurantId: req.params.restaurantId,
      date: { gte: start, lte: end }
    },
    include: { table: true },
    orderBy: { time: 'asc' }
  })

  res.json(bookings)
})

// ─── CANCEL / UPDATE STATUS ───────────────────────────────────────────────────
router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body
  const booking = await prisma.booking.update({
    where: { id: req.params.id },
    data: { status }
  })
  res.json(booking)
})

export { router as bookingsRouter }
