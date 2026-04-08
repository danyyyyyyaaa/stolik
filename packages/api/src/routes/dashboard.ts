import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireRestaurant } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// ─── GET /api/dashboard/overview?restaurantId=xxx ────────────────────────────
// Returns: today's bookings count, guests expected, pending count,
//          avg rating, trend vs yesterday, month total
router.get('/overview', requireAuth, requireRestaurant, async (req, res, next) => {
  try {
    const restaurantId = ((req as any).restaurant.id) as string

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const [todayBookings, yesterdayBookings, pendingBookings, monthBookings, avgRating] = await Promise.all([
      prisma.booking.count({ where: { restaurantId, date: { gte: today, lt: tomorrow }, status: { not: 'cancelled' } } }),
      prisma.booking.count({ where: { restaurantId, date: { gte: yesterday, lt: today }, status: { not: 'cancelled' } } }),
      prisma.booking.count({ where: { restaurantId, date: { gte: today, lt: tomorrow }, status: 'pending' } }),
      prisma.booking.count({ where: { restaurantId, date: { gte: monthStart }, status: { not: 'cancelled' } } }),
      prisma.review.aggregate({ where: { restaurantId }, _avg: { rating: true } }),
    ])

    const guestsToday = await prisma.booking.aggregate({
      where: { restaurantId, date: { gte: today, lt: tomorrow }, status: { not: 'cancelled' } },
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
// Returns days array with booking counts, guest counts, and full booking details per day
router.get('/calendar', requireAuth, requireRestaurant, async (req, res, next) => {
  try {
    const restaurantId = ((req as any).restaurant.id) as string
    const { month } = req.query
    if (!month) return res.status(400).json({ error: 'month required' })

    const [year, m] = String(month).split('-').map(Number)
    const start = new Date(year, m - 1, 1)
    const end = new Date(year, m, 1)

    const bookings = await prisma.booking.findMany({
      where: { restaurantId, date: { gte: start, lt: end } },
      include: { table: { select: { name: true } } },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    })

    const byDate: Record<string, typeof bookings> = {}
    for (const b of bookings) {
      const key = b.date.toISOString().split('T')[0]
      if (!byDate[key]) byDate[key] = []
      byDate[key].push(b)
    }

    const days = Object.entries(byDate).map(([date, bks]) => ({
      date,
      bookingCount: bks.length,
      guestCount: bks.reduce((s, b) => s + b.guestCount, 0),
      bookings: bks.map(b => ({
        id: b.id,
        bookingCode: b.bookingRef,
        guestName: b.guestName,
        guestPhone: b.guestPhone,
        partySize: b.guestCount,
        time: b.time,
        endTime: calcEndTime(b.time, b.duration),
        tableName: b.table?.name ?? null,
        status: b.status,
      })),
    }))

    res.json({ days })
  } catch (err) { next(err) }
})

function calcEndTime(time: string, duration: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + duration
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// ─── GET /api/dashboard/analytics?restaurantId=xxx&from=2026-01-01&to=2026-04-01
// Returns: KPIs with change %, bookings over time, status breakdown, peak hours heatmap,
//          guest distribution, table utilization, top guests
router.get('/analytics', requireAuth, requireRestaurant, async (req, res, next) => {
  try {
    const restaurantId = ((req as any).restaurant.id) as string
    const { from, to } = req.query
    if (!from || !to) return res.status(400).json({ error: 'from and to required' })

    const fromDate = new Date(String(from))
    const toDate = new Date(String(to))

    // Previous period for change calculation
    const periodMs = toDate.getTime() - fromDate.getTime()
    const prevFrom = new Date(fromDate.getTime() - periodMs)
    const prevTo = new Date(fromDate)

    const [bookings, prevBookings, tables] = await Promise.all([
      prisma.booking.findMany({
        where: { restaurantId, date: { gte: fromDate, lte: toDate } },
        include: { table: { select: { name: true } } },
      }),
      prisma.booking.findMany({
        where: { restaurantId, date: { gte: prevFrom, lte: prevTo } },
        select: { userId: true, guestCount: true, status: true },
      }),
      prisma.table.findMany({ where: { restaurantId }, select: { id: true, name: true } }),
    ])

    const total = bookings.length
    const prevTotal = prevBookings.length
    const uniqueGuests = new Set(bookings.filter(b => b.userId).map(b => b.userId)).size
    const prevUniqueGuests = new Set(prevBookings.filter(b => b.userId).map(b => b.userId)).size
    const avgPartySize = total > 0 ? bookings.reduce((s, b) => s + b.guestCount, 0) / total : 0
    const prevAvgPartySize = prevTotal > 0 ? prevBookings.reduce((s, b) => s + b.guestCount, 0) / prevTotal : 0
    const noShows = bookings.filter(b => b.status === 'no_show').length
    const prevNoShows = prevBookings.filter(b => b.status === 'no_show').length
    const cancellations = bookings.filter(b => b.status === 'cancelled').length
    const prevCancellations = prevBookings.filter(b => b.status === 'cancelled').length

    const noShowRate = total > 0 ? (noShows / total) * 100 : 0
    const prevNoShowRate = prevTotal > 0 ? (prevNoShows / prevTotal) * 100 : 0
    const cancelRate = total > 0 ? (cancellations / total) * 100 : 0
    const prevCancelRate = prevTotal > 0 ? (prevCancellations / prevTotal) * 100 : 0

    // New KPIs
    const totalGuests = bookings.reduce((s, b) => s + b.guestCount, 0)
    const confirmed   = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length
    const bookingConversion = total > 0 ? parseFloat(((confirmed / total) * 100).toFixed(1)) : 0

    const phoneVisits: Record<string, number> = {}
    for (const b of bookings) phoneVisits[b.guestPhone] = (phoneVisits[b.guestPhone] ?? 0) + 1
    const totalUniqueGuests = Object.keys(phoneVisits).length
    const repeatGuests = Object.values(phoneVisits).filter(v => v > 1).length
    const repeatGuestRate = totalUniqueGuests > 0 ? parseFloat(((repeatGuests / totalUniqueGuests) * 100).toFixed(1)) : 0

    const avgLeadTime = bookings.length > 0
      ? bookings.reduce((s, b) => {
          const lead = (b.date.getTime() - b.createdAt.getTime()) / 86400000
          return s + Math.max(0, lead)
        }, 0) / total
      : 0

    function pctChange(curr: number, prev: number) {
      if (prev === 0) return null
      return parseFloat(((curr - prev) / prev * 100).toFixed(1))
    }

    // Bookings over time
    const byDay: Record<string, { confirmed: number; cancelled: number; noShow: number }> = {}
    for (const b of bookings) {
      const day = b.date.toISOString().split('T')[0]
      if (!byDay[day]) byDay[day] = { confirmed: 0, cancelled: 0, noShow: 0 }
      if (b.status === 'confirmed' || b.status === 'completed') byDay[day].confirmed++
      else if (b.status === 'cancelled') byDay[day].cancelled++
      else if (b.status === 'no_show') byDay[day].noShow++
    }
    const bookingsOverTime = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v }))

    // Status breakdown
    const statusCounts: Record<string, number> = {}
    for (const b of bookings) statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1
    const statusColors: Record<string, string> = { confirmed: '#1B7A4A', pending: '#F5A623', cancelled: '#E53E3E', no_show: '#9CA3AF', completed: '#6366F1' }
    const bookingsByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count, color: statusColors[status] ?? '#9CA3AF' }))

    // Peak hours heatmap
    const heatmap: Record<string, number> = {}
    for (const b of bookings) {
      const day = b.date.getDay()
      const hour = parseInt(b.time.split(':')[0])
      const key = `${day}_${hour}`
      heatmap[key] = (heatmap[key] ?? 0) + 1
    }
    const peakHoursHeatmap = Object.entries(heatmap).map(([key, count]) => {
      const [day, hour] = key.split('_').map(Number)
      return { day, hour, count }
    })

    // Guest distribution
    const distBuckets: Record<string, number> = { '1-2': 0, '3-4': 0, '5-6': 0, '7+': 0 }
    for (const b of bookings) {
      if (b.guestCount <= 2) distBuckets['1-2']++
      else if (b.guestCount <= 4) distBuckets['3-4']++
      else if (b.guestCount <= 6) distBuckets['5-6']++
      else distBuckets['7+']++
    }
    const guestDistribution = Object.entries(distBuckets).map(([partySize, count]) => ({ partySize, count }))

    // Table utilization
    const dayCount = Math.max(1, Math.ceil(periodMs / 86400000))
    const tableBookings: Record<string, number> = {}
    for (const b of bookings) if (b.tableId) tableBookings[b.tableId] = (tableBookings[b.tableId] ?? 0) + 1
    const tableUtilization = tables.map(t => ({
      tableName: t.name,
      utilizationPercent: Math.min(100, Math.round(((tableBookings[t.id] ?? 0) / dayCount) * 100)),
    }))

    // Top guests
    const guestVisits: Record<string, { name: string; count: number; lastVisit: string }> = {}
    for (const b of bookings) {
      const key = b.guestPhone
      if (!guestVisits[key]) guestVisits[key] = { name: b.guestName, count: 0, lastVisit: b.date.toISOString().split('T')[0] }
      guestVisits[key].count++
      if (b.date.toISOString() > guestVisits[key].lastVisit) guestVisits[key].lastVisit = b.date.toISOString().split('T')[0]
    }
    const topGuests = Object.values(guestVisits).sort((a, b) => b.count - a.count).slice(0, 10).map(g => ({
      name: g.name, visits: g.count, lastVisit: g.lastVisit,
    }))

    res.json({
      kpis: {
        totalBookings: total, totalBookingsChange: pctChange(total, prevTotal),
        uniqueGuests, uniqueGuestsChange: pctChange(uniqueGuests, prevUniqueGuests),
        avgPartySize: parseFloat(avgPartySize.toFixed(1)), avgPartySizeChange: pctChange(avgPartySize, prevAvgPartySize),
        noShowRate: parseFloat(noShowRate.toFixed(1)), noShowRateChange: pctChange(noShowRate, prevNoShowRate),
        cancellationRate: parseFloat(cancelRate.toFixed(1)), cancellationRateChange: pctChange(cancelRate, prevCancelRate),
        avgLeadTimeDays: parseFloat(avgLeadTime.toFixed(1)), avgLeadTimeDaysChange: null,
        totalGuests,
        bookingConversion,
        repeatGuestRate,
      },
      dailyBookingsTrend: Object.entries(byDay).sort(([a],[b])=>a.localeCompare(b)).map(([date,v])=>({ date, total: v.confirmed+v.cancelled+v.noShow, ...v })),
      bookingsOverTime,
      bookingsByStatus,
      peakHoursHeatmap,
      guestDistribution,
      tableUtilization,
      topGuests,
    })
  } catch (err) { next(err) }
})

export { router as dashboardRouter }
