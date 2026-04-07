// Email cron jobs:
// - Booking reminder emails (runs every hour)
// - Daily summary (runs at 7:00 AM)
// - Weekly report (runs Monday 8:00 AM)

import { PrismaClient } from '@prisma/client'
import {
  sendBookingReminderEmail,
  sendDailySummaryEmail,
  sendWeeklyReportEmail,
} from '../services/email'

const prisma = new PrismaClient()

// ─── Booking reminder emails ──────────────────────────────────────────────────
// Sends email reminder X hours before a confirmed booking (default 2h)
// Uses the existing Reminder table to avoid double-sends.

export async function processEmailReminders(): Promise<void> {
  const now   = new Date()
  const in2h  = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const in3h  = new Date(now.getTime() + 3 * 60 * 60 * 1000)

  // Find confirmed bookings in the 2–3 hour window with no sent email reminder
  const bookings = await prisma.booking.findMany({
    where: {
      status:    'confirmed',
      date:      { gte: in2h, lte: in3h },
      guestEmail: { not: null },
      reminders:  { none: { type: 'email', status: 'sent' } },
    },
    include: { restaurant: { select: { name: true, address: true, slug: true } } },
  })

  for (const booking of bookings) {
    if (!booking.guestEmail) continue
    try {
      const dateLabel = booking.date.toLocaleDateString('en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
      await sendBookingReminderEmail(booking.guestEmail, {
        guestName:         booking.guestName,
        restaurantName:    booking.restaurant.name,
        restaurantAddress: booking.restaurant.address ?? undefined,
        date:              dateLabel,
        time:              booking.time,
        partySize:         booking.guestCount,
        bookingRef:        booking.bookingRef,
      })
      // Record as sent
      await prisma.reminder.create({
        data: {
          type:      'email',
          status:    'sent',
          sentAt:    new Date(),
          bookingId: booking.id,
        },
      })
      console.log(`[EmailCron] Reminder sent to ${booking.guestEmail}`)
    } catch (err) {
      console.error(`[EmailCron] Reminder failed for ${booking.id}:`, err)
      await prisma.reminder.create({
        data: { type: 'email', status: 'failed', bookingId: booking.id },
      }).catch(() => {})
    }
  }
}

// ─── Daily summary ────────────────────────────────────────────────────────────

export async function processDailySummary(): Promise<void> {
  const today   = new Date()
  const start   = new Date(today); start.setHours(0, 0, 0, 0)
  const end     = new Date(today); end.setHours(23, 59, 59, 999)
  const dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  // All active restaurants with email
  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true, email: { not: null } },
    select: { id: true, name: true, email: true },
  })

  for (const restaurant of restaurants) {
    if (!restaurant.email) continue
    try {
      const bookings = await prisma.booking.findMany({
        where: { restaurantId: restaurant.id, date: { gte: start, lte: end } },
        orderBy: { time: 'asc' },
        select: { time: true, guestName: true, guestCount: true, status: true },
      })

      await sendDailySummaryEmail(restaurant.email, {
        restaurantName: restaurant.name,
        date:           dateStr,
        bookings:       bookings.map(b => ({
          time:      b.time,
          guestName: b.guestName,
          partySize: b.guestCount,
          status:    b.status,
        })),
      })
    } catch (err) {
      console.error(`[EmailCron] Daily summary failed for ${restaurant.id}:`, err)
    }
  }
}

// ─── Weekly report ────────────────────────────────────────────────────────────

export async function processWeeklyReport(): Promise<void> {
  const now       = new Date()
  const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0)
  const weekEnd   = new Date(now); weekEnd.setHours(23, 59, 59, 999)

  const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const lastWeekEnd   = new Date(weekStart); lastWeekEnd.setMilliseconds(-1)

  const periodLabel = `${weekStart.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}`

  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true, email: { not: null } },
    select: { id: true, name: true, email: true },
  })

  for (const restaurant of restaurants) {
    if (!restaurant.email) continue
    try {
      const [thisWeek, lastWeek] = await Promise.all([
        prisma.booking.findMany({
          where: { restaurantId: restaurant.id, date: { gte: weekStart, lte: weekEnd } },
          select: { status: true, guestCount: true, time: true, date: true },
        }),
        prisma.booking.count({
          where: { restaurantId: restaurant.id, date: { gte: lastWeekStart, lte: lastWeekEnd } },
        }),
      ])

      const totalBookings = thisWeek.length
      const noShows       = thisWeek.filter(b => b.status === 'no_show').length
      const noShowRate    = totalBookings > 0 ? `${((noShows / totalBookings) * 100).toFixed(1)}%` : '0%'
      const totalPax      = thisWeek.reduce((s, b) => s + b.guestCount, 0)
      const avgPartySize  = totalBookings > 0 ? (totalPax / totalBookings).toFixed(1) : '0'

      // Unique guests (by day)
      const uniqueGuests = new Set(thisWeek.map(b => b.date.toISOString().slice(0, 10))).size

      // Top day
      const dayCount: Record<string, number> = {}
      for (const b of thisWeek) {
        const d = b.date.toLocaleDateString('en-GB', { weekday: 'long' })
        dayCount[d] = (dayCount[d] ?? 0) + 1
      }
      const topDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

      // Peak hour
      const hourCount: Record<string, number> = {}
      for (const b of thisWeek) {
        const h = b.time.slice(0, 5)
        hourCount[h] = (hourCount[h] ?? 0) + 1
      }
      const peakHour = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

      await sendWeeklyReportEmail(restaurant.email, {
        restaurantName: restaurant.name,
        periodLabel,
        totalBookings,
        uniqueGuests,
        noShowRate,
        avgPartySize,
        vsLastWeek: totalBookings - lastWeek,
        topDay,
        peakHour,
      })
    } catch (err) {
      console.error(`[EmailCron] Weekly report failed for ${restaurant.id}:`, err)
    }
  }
}
