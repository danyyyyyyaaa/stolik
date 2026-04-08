import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import { requireAuth, requireRestaurant } from '../middleware/auth'
import { sendBookingConfirmation, scheduleReminders } from '../services/sms'
import { getIo } from '../lib/socket'
import {
  sendBookingConfirmedEmail,
  sendBookingCancelledEmail,
  sendNewBookingNotificationEmail,
} from '../services/email'
import { notifyWaitlistForSlot } from './waitlist'

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
  specialRequests: z.string().optional(),
  seatingPreference: z.enum(['window', 'kids', 'quiet', 'wheelchair']).optional(),
  allergies: z.array(z.string()).optional(),
  source: z.enum(['app', 'widget', 'manual', 'instagram']).default('app'),
})

router.post('/', async (req, res) => {
  try {
    const data = createBookingSchema.parse(req.body)

    const bookingDate = new Date(`${data.date}T${data.time}:00`)
    const bookingRef  = `#ST${Math.floor(Math.random() * 9000 + 1000)}`
    const shortCode   = randomBytes(4).toString('hex') // 8 hex chars

    // Attach userId if a valid JWT is present (app users)
    let userId: string | undefined
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET!) as any
        userId = decoded.userId
      } catch {}
    }

    // Detect birthday perk: user DOB within 7 days of booking date
    let isBirthdayBooking = false
    if (userId) {
      const [userRecord, restaurant] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { dateOfBirth: true } }),
        prisma.restaurant.findUnique({ where: { id: data.restaurantId }, select: { birthdayPerkEnabled: true } }),
      ])
      if (userRecord?.dateOfBirth && restaurant?.birthdayPerkEnabled) {
        const dob = userRecord.dateOfBirth
        const bookingMonth = bookingDate.getMonth()
        const bookingDay   = bookingDate.getDate()
        // Check if DOB month/day falls within ±7 days of booking date (calendar-based)
        for (let offset = -3; offset <= 3; offset++) {
          const check = new Date(bookingDate)
          check.setDate(check.getDate() + offset)
          if (check.getMonth() === dob.getMonth() && check.getDate() === dob.getDate()) {
            isBirthdayBooking = true
            break
          }
        }
      }
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
        specialRequests: data.specialRequests,
        seatingPreference: data.seatingPreference,
        allergies: data.allergies ?? [],
        source: data.source,
        status: 'confirmed',
        isBirthdayBooking,
        shortCode,
        ...(userId ? { userId } : {}),
      },
      include: { restaurant: true, table: true }
    })

    sendBookingConfirmation(booking).catch(err =>
      console.error('[SMS] Confirmation failed:', err)
    )
    scheduleReminders(booking)

    // Upsert GuestProfile (CRM)
    prisma.guestProfile.upsert({
      where: { phone_restaurantId: { phone: data.guestPhone, restaurantId: data.restaurantId } },
      create: {
        phone:        data.guestPhone,
        name:         data.guestName,
        email:        data.guestEmail,
        restaurantId: data.restaurantId,
        visitCount:   1,
        lastVisit:    bookingDate,
      },
      update: {
        name:       data.guestName,
        email:      data.guestEmail ?? undefined,
        visitCount: { increment: 1 },
        lastVisit:  bookingDate,
      },
    }).catch(err => console.error('[CRM] GuestProfile upsert failed:', err))

    // Email: confirmation to guest
    if (data.guestEmail) {
      const dateLabel = bookingDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      sendBookingConfirmedEmail(data.guestEmail, {
        guestName:       data.guestName,
        restaurantName:  booking.restaurant.name,
        restaurantAddress: booking.restaurant.address ?? undefined,
        date:            dateLabel,
        time:            data.time,
        partySize:       data.guestCount,
        tableName:       booking.table?.name ?? undefined,
        notes:           data.notes,
        bookingRef:      booking.bookingRef,
      }).catch(err => console.error('[Email] Confirmation failed:', err))
    }

    // Email: new booking notification to restaurant owner
    const ownerEmail = booking.restaurant.email
    if (ownerEmail) {
      const dateLabel = bookingDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      sendNewBookingNotificationEmail(ownerEmail, {
        guestName:  data.guestName,
        guestPhone: data.guestPhone,
        guestEmail: data.guestEmail,
        date:       dateLabel,
        time:       data.time,
        partySize:  data.guestCount,
        tableName:  booking.table?.name ?? undefined,
        notes:      data.notes,
        source:     data.source,
        bookingRef: booking.bookingRef,
        replyTo:    data.guestEmail,
      }).catch(err => console.error('[Email] Owner notification failed:', err))
    }

    // Real-time: notify restaurant owner
    getIo()?.to(`restaurant:${booking.restaurantId}`).emit('booking:new', {
      bookingId:  booking.id,
      bookingRef: booking.bookingRef,
      guestName:  booking.guestName,
      date:       booking.date,
      time:       booking.time,
      guests:     booking.guestCount,
      tableName:  booking.table?.name ?? null,
    })

    res.json({ success: true, booking })

    // Referral: mark completed on first booking by referred user
    if (booking.userId) {
      prisma.referral.updateMany({
        where: { referredId: booking.userId, status: 'pending' },
        data:  { status: 'completed', completedAt: new Date() },
      }).catch(() => {})
    }
  } catch (err) {
    res.status(400).json({ error: 'Invalid booking data', details: err })
  }
})

// ─── GET BOOKING BY SHORT CODE (public share link) ────────────────────────────
router.get('/s/:shortCode', async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { shortCode: req.params.shortCode },
      select: {
        bookingRef: true, date: true, time: true, guestCount: true,
        restaurant: { select: { name: true, address: true, emoji: true } },
      },
    })
    if (!booking) return res.status(404).json({ error: 'Not found' })
    res.json(booking)
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
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

// ─── GET BOOKINGS BY DATE RANGE (owner) ──────────────────────────────────────
// Query params: restaurantId, status, from, to, search, page, limit, sortBy, sortOrder
router.get('/', requireAuth, requireRestaurant, async (req, res, next) => {
  try {
    const restaurantId = ((req as any).restaurant.id) as string
    const { date, from, to, status, search, page = '1', limit = '20', sortBy = 'date', sortOrder = 'desc' } = req.query

    const where: any = { restaurantId }

    // Date filter
    if (from && to) {
      where.date = { gte: new Date(`${from}T00:00:00`), lte: new Date(`${to}T23:59:59`) }
    } else if (date) {
      where.date = { gte: new Date(`${date}T00:00:00`), lte: new Date(`${date}T23:59:59`) }
    }

    // Status filter
    if (status && status !== 'all') {
      where.status = status as string
    }

    // Search filter
    if (search) {
      where.OR = [
        { guestName: { contains: search as string, mode: 'insensitive' } },
        { guestPhone: { contains: search as string, mode: 'insensitive' } },
        { bookingRef: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const pageNum = Math.max(1, parseInt(page as string))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)))
    const skip = (pageNum - 1) * limitNum

    // Build orderBy
    const validSortFields = ['date', 'time', 'guestCount', 'createdAt', 'status']
    const sortField = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'date'
    const order = sortOrder === 'asc' ? 'asc' : 'desc'
    const orderBy = sortField === 'date' ? [{ date: order }, { time: order }] : [{ [sortField]: order }]

    const [bookings, total, statusAgg] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: { table: { select: { name: true } } },
        orderBy: orderBy as any,
        skip,
        take: limitNum,
      }),
      prisma.booking.count({ where }),
      prisma.booking.groupBy({
        by: ['status'],
        where: { restaurantId, ...(where.date ? { date: where.date } : {}) },
        _count: true,
      }),
    ])

    const stats: Record<string, number> = { confirmed: 0, pending: 0, cancelled: 0, no_show: 0, completed: 0 }
    for (const s of statusAgg) stats[s.status] = s._count

    const mapped = bookings.map(b => ({
      id: b.id,
      bookingRef: b.bookingRef,
      guestName: b.guestName,
      guestEmail: b.guestEmail,
      guestPhone: b.guestPhone,
      partySize: b.guestCount,
      date: b.date.toISOString(),
      time: b.time,
      duration: b.duration,
      notes: b.notes,
      specialRequests: b.specialRequests,
      seatingPreference: b.seatingPreference,
      allergies: b.allergies,
      isBirthdayBooking: b.isBirthdayBooking,
      source: b.source,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
      table: b.table?.name ?? null,
      tableZone: null,
    }))

    res.json({
      bookings: mapped,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      stats,
    })
  } catch (err) { next(err) }
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

// ─── CANCEL / UPDATE STATUS (PATCH) ──────────────────────────────────────────
router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status, cancelledByRestaurant } = req.body
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data:  { status },
      include: { restaurant: { select: { id: true, name: true, slug: true, email: true } }, table: { select: { name: true } } },
    })

    // Waitlist: notify first waiting guest when slot opens up
    if (status === 'cancelled') {
      notifyWaitlistForSlot(
        booking.restaurantId,
        booking.date,
        booking.time,
        booking.restaurant.name,
      ).catch(err => console.error('[Waitlist] notify failed:', err))
    }

    // Email: cancellation to guest
    if (status === 'cancelled' && booking.guestEmail) {
      sendBookingCancelledEmail(booking.guestEmail, {
        guestName:             booking.guestName,
        restaurantName:        booking.restaurant.name,
        date:                  booking.date.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        time:                  booking.time,
        cancelledByRestaurant: !!cancelledByRestaurant,
        restaurantSlug:        booking.restaurant.slug,
      }).catch(err => console.error('[Email] Cancellation failed:', err))
    }

    // Email: no-show → increment GuestProfile
    if (status === 'no_show') {
      prisma.guestProfile.updateMany({
        where: { phone: booking.guestPhone, restaurantId: booking.restaurantId },
        data:  { noShowCount: { increment: 1 } },
      }).catch(err => console.error('[CRM] NoShow increment failed:', err))
    }

    const io = getIo()
    if (io) {
      const room = `restaurant:${booking.restaurantId}`
      if (status === 'cancelled') {
        io.to(room).emit('booking:cancelled', { bookingId: booking.id, guestName: booking.guestName })
      } else {
        io.to(room).emit('booking:updated', booking)
      }
    }

    res.json(booking)
  } catch (err) { next(err) }
})

// ─── UPDATE STATUS (PUT) ─────────────────────────────────────────────────────
router.put('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body
    const validStatuses = ['confirmed', 'cancelled', 'no_show', 'completed', 'pending']
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' })

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status },
      include: { table: { select: { name: true } }, restaurant: { select: { id: true } } },
    })

    const io = getIo()
    if (io) {
      io.to(`restaurant:${booking.restaurantId}`).emit('booking:updated', booking)
    }

    res.json(booking)
  } catch (err) { next(err) }
})

// ─── ABANDON BOOKING (track incomplete bookings for re-engagement) ──────────
router.post('/abandon', requireAuth, async (req, res) => {
  const { restaurantId, date, time, guests } = req.body
  const userId = (req as any).userId
  if (!restaurantId) return res.status(400).json({ error: 'restaurantId required' })

  try {
    // Only one abandoned booking per user per restaurant
    await prisma.abandonedBooking.deleteMany({ where: { userId, restaurantId } })
    const abandoned = await prisma.abandonedBooking.create({
      data: { userId, restaurantId, date, time, guests: guests ? parseInt(guests) : null }
    })
    res.json({ success: true, id: abandoned.id })
  } catch (err) {
    console.error('Abandon booking error:', err)
    res.status(500).json({ error: 'Failed to track abandoned booking' })
  }
})

export { router as bookingsRouter }
