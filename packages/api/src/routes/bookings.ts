import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
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

    const bookingDate = new Date(`${data.date}T${data.time}:00`)
    const bookingRef  = `#ST${Math.floor(Math.random() * 9000 + 1000)}`

    // Attach userId if a valid JWT is present (app users)
    let userId: string | undefined
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET!) as any
        userId = decoded.userId
      } catch {}
    }

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
        ...(userId ? { userId } : {}),
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

// ─── RESTAURANT: STATS (yesterday counts + 7-day daily totals) ───────────────
router.get('/stats/:restaurantId', requireAuth, async (req, res) => {
  const { restaurantId } = req.params

  const now       = new Date()
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0)

  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const yesterdayEnd   = new Date(todayStart); yesterdayEnd.setMilliseconds(-1)

  const sevenDaysAgo = new Date(todayStart); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  const [yesterdayBookings, weekBookings] = await Promise.all([
    prisma.booking.findMany({
      where: { restaurantId, date: { gte: yesterdayStart, lte: yesterdayEnd } },
      select: { status: true },
    }),
    prisma.booking.findMany({
      where: { restaurantId, date: { gte: sevenDaysAgo } },
      select: { date: true, status: true },
    }),
  ])

  const yesterday = {
    total:     yesterdayBookings.length,
    confirmed: yesterdayBookings.filter(b => b.status === 'confirmed').length,
    pending:   yesterdayBookings.filter(b => b.status === 'pending').length,
    noShow:    yesterdayBookings.filter(b => b.status === 'no_show').length,
  }

  // Build daily counts for last 7 days (including today)
  const daily: { date: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const count = weekBookings.filter(b => b.date.toISOString().slice(0, 10) === dateStr).length
    daily.push({ date: dateStr, count })
  }

  res.json({ yesterday, daily })
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
