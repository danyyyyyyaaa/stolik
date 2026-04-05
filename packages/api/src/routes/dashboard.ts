import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// ─── GET /api/dashboard/overview?restaurantId=xxx ────────────────────────────
// Returns: today's bookings count, guests expected, pending count,
//          avg rating, trend vs yesterday, month total
router.get('/overview', requireAuth, async (req, res, next) => {
  try {
    const { restaurantId } = req.query
    if (!restaurantId) return res.status(400).json({ error: 'restaurantId required' })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const [todayBookings, yesterdayBookings, pendingBookings, monthBookings, avgRating] = await Promise.all([
      prisma.booking.count({ where: { restaurantId: String(restaurantId), date: { gte: today, lt: tomorrow }, status: { not: 'cancelled' } } }),
      prisma.booking.count({ where: { restaurantId: String(restaurantId), date: { gte: yesterday, lt: today }, status: { not: 'cancelled' } } }),
      prisma.booking.count({ where: { restaurantId: String(restaurantId), date: { gte: today, lt: tomorrow }, status: 'pending' } }),
      prisma.booking.count({ where: { restaurantId: String(restaurantId), date: { gte: monthStart }, status: { not: 'cancelled' } } }),
      prisma.review.aggregate({ where: { restaurantId: String(restaurantId) }, _avg: { rating: true } }),
    ])

    const guestsToday = await prisma.booking.aggregate({
      where: { restaurantId: String(restaurantId), date: { gte: today, lt: tomorrow }, status: { not: 'cancelled' } },
      _sum: { guestCount: true },
    })

    res.json({
      todayBookings,
      yesterdayBookings,
      trend: yesterdayBookings > 0 ? Math.round(((todayBookings - yesterdayBookings) / yesterdayBookings) * 100) : null,
      guestsExpected: guestsToday._sum.guestCount ?? 0,
      pendingCount: pendingBookings,
      monthBookings,
      avgRating: avgRating._avg.rating ?? 0,
    })
  } catch (err) { next(err) }
})

// ─── GET /api/dashboard/calendar?restaurantId=xxx&month=2026-04 ──────────────
// Returns days array with booking counts and booking details per day
router.get('/calendar', requireAuth, async (req, res, next) => {
  try {
    const { restaurantId, month } = req.query
    if (!restaurantId || !month) return res.status(400).json({ error: 'restaurantId and month required' })

    const [year, m] = String(month).split('-').map(Number)
    const start = new Date(year, m - 1, 1)
    const end = new Date(year, m, 1)

    const bookings = await prisma.booking.findMany({
      where: { restaurantId: String(restaurantId), date: { gte: start, lt: end } },
      select: { id: true, date: true, time: true, guestCount: true, status: true, guestName: true, bookingRef: true },
      orderBy: { date: 'asc' },
    })

    // Group by date
    const byDate: Record<string, typeof bookings> = {}
    for (const b of bookings) {
      const key = b.date.toISOString().split('T')[0]
      if (!byDate[key]) byDate[key] = []
      byDate[key].push(b)
    }

    const days = Object.entries(byDate).map(([date, bks]) => ({
      date,
      bookingCount: bks.length,
      bookings: bks,
    }))

    res.json({ days })
  } catch (err) { next(err) }
})

// ─── GET /api/dashboard/analytics?restaurantId=xxx&from=2026-01-01&to=2026-04-01
// Returns: bookings by day, status breakdown, peak hours, totals, rates
router.get('/analytics', requireAuth, async (req, res, next) => {
  try {
    const { restaurantId, from, to } = req.query
    if (!restaurantId || !from || !to) return res.status(400).json({ error: 'restaurantId, from, to required' })

    const fromDate = new Date(String(from))
    const toDate = new Date(String(to))

    const bookings = await prisma.booking.findMany({
      where: { restaurantId: String(restaurantId), date: { gte: fromDate, lte: toDate } },
      select: { date: true, status: true, guestCount: true, time: true, userId: true, createdAt: true },
    })

    const byDay: Record<string, number> = {}
    const statusBreakdown: Record<string, number> = {}
    const peakHours: Record<string, number> = {}
    let totalGuests = 0
    let noShows = 0
    let cancellations = 0

    for (const b of bookings) {
      const day = b.date.toISOString().split('T')[0]
      byDay[day] = (byDay[day] ?? 0) + 1
      statusBreakdown[b.status] = (statusBreakdown[b.status] ?? 0) + 1
      const hour = b.time?.split(':')[0] ?? '12'
      peakHours[hour] = (peakHours[hour] ?? 0) + 1
      totalGuests += b.guestCount
      if (b.status === 'no_show') noShows++
      if (b.status === 'cancelled') cancellations++
    }

    const total = bookings.length
    const uniqueGuests = new Set(bookings.filter(b => b.userId).map(b => b.userId)).size

    res.json({
      bookingsByDay: Object.entries(byDay).map(([date, count]) => ({ date, count })),
      statusBreakdown,
      peakHours: Object.entries(peakHours).map(([hour, count]) => ({ hour: parseInt(hour), count })),
      totalBookings: total,
      totalGuests,
      uniqueGuests,
      avgPartySize: total > 0 ? (totalGuests / total).toFixed(1) : 0,
      noShowRate: total > 0 ? ((noShows / total) * 100).toFixed(1) : 0,
      cancellationRate: total > 0 ? ((cancellations / total) * 100).toFixed(1) : 0,
    })
  } catch (err) { next(err) }
})

export { router as dashboardRouter }
