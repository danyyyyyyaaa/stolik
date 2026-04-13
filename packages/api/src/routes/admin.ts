import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { requireAdmin } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// ─── POST /api/admin/seed — create admin user (one-time, only if none exists) ─
router.post('/seed', async (req, res) => {
  const existing = await prisma.user.findFirst({ where: { role: 'admin' } })
  if (existing) {
    return res.status(409).json({ error: 'Admin user already exists' })
  }

  const passwordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.create({
    data: {
      email:     'admin@stolik.pl',
      firstName: 'Admin',
      lastName:  'Stolik',
      role:      'admin',
      passwordHash,
    },
  })

  const token = jwt.sign({ userId: admin.id }, process.env.JWT_SECRET!, { expiresIn: '30d' })
  res.status(201).json({
    message: 'Admin user created',
    email:   admin.email,
    token,
  })
})

// ─── GET /api/admin/restaurants — paginated list with search & filter ─────────
router.get('/restaurants', requireAdmin, async (req, res, next) => {
  try {
    const { search, status, plan, page = '1', limit = '20', sortBy = 'createdAt', sortOrder = 'desc' } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (plan) where.plan = plan
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { owner: { email: { contains: search as string, mode: 'insensitive' } } },
        { owner: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { owner: { lastName: { contains: search as string, mode: 'insensitive' } } },
      ]
    }

    type SortDir = 'asc' | 'desc'
    const dir = (sortOrder === 'asc' ? 'asc' : 'desc') as SortDir
    type RestaurantOrderBy = { createdAt?: SortDir; name?: SortDir; rating?: SortDir }
    const validSortFields: Record<string, RestaurantOrderBy> = {
      createdAt: { createdAt: dir },
      name:      { name: dir },
      rating:    { rating: dir },
    }
    const orderBy: RestaurantOrderBy = validSortFields[sortBy as string] ?? { createdAt: 'desc' }

    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        select: {
          id:          true,
          name:        true,
          slug:        true,
          cuisine:     true,
          district:    true,
          city:        true,
          address:     true,
          isActive:    true,
          isPremium:   true,
          isPublished: true,
          plan:        true,
          status:      true,
          coverImage:  true,
          emoji:       true,
          rating:      true,
          reviewCount: true,
          createdAt:   true,
          owner: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          _count: { select: { bookings: true } },
        },
        orderBy,
        skip,
        take: parseInt(limit as string),
      }),
      prisma.restaurant.count({ where }),
    ])

    const pages = Math.ceil(total / parseInt(limit as string))
    res.json({ restaurants, total, page: parseInt(page as string), pages })
  } catch (err) { next(err) }
})

// ─── GET /api/admin/restaurants/:id — full detail with owner, bookings, stats ─
router.get('/restaurants/:id', requireAdmin, async (req, res, next) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.params.id },
      include: {
        tables: true,
        owner:  { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, bookingRef: true, guestName: true, guestCount: true, date: true, time: true, status: true, source: true, createdAt: true },
        },
        _count: { select: { bookings: true, guests: true, reviews: true } },
      },
    })
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' })

    // No-show rate
    const [noShowCount, totalBookings] = await Promise.all([
      prisma.booking.count({ where: { restaurantId: req.params.id, status: 'no_show' } }),
      prisma.booking.count({ where: { restaurantId: req.params.id } }),
    ])
    const noShowRate = totalBookings > 0 ? Math.round((noShowCount / totalBookings) * 100) : 0

    res.json({ ...restaurant, noShowRate, totalBookings })
  } catch (err) { next(err) }
})

// ─── PATCH /api/admin/restaurants/:id — edit any field ───────────────────────
router.patch('/restaurants/:id', requireAdmin, async (req, res, next) => {
  try {
    const schema = z.object({
      name:        z.string().optional(),
      status:      z.enum(['active', 'draft', 'suspended']).optional(),
      plan:        z.enum(['free', 'pro', 'business']).optional(),
      isActive:    z.boolean().optional(),
      isPublished: z.boolean().optional(),
      phone:       z.string().optional(),
      email:       z.string().email().optional(),
      address:     z.string().optional(),
      district:    z.string().optional(),
      city:        z.string().optional(),
    })
    const data = schema.parse(req.body)
    const updated = await prisma.restaurant.update({ where: { id: req.params.id }, data })
    res.json(updated)
  } catch (err) { next(err) }
})

// ─── DELETE /api/admin/restaurants/:id ───────────────────────────────────────
router.delete('/restaurants/:id', requireAdmin, async (req, res, next) => {
  try {
    await prisma.restaurant.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) { next(err) }
})

// ─── PATCH /api/admin/restaurants/:id/approve — set isActive: true ───────────
router.patch('/restaurants/:id/approve', requireAdmin, async (req, res) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: req.params.id } })
  if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' })

  const updated = await prisma.restaurant.update({
    where: { id: req.params.id },
    data:  { isActive: true },
  })
  res.json(updated)
})

// ─── PATCH /api/admin/restaurants/:id/deactivate ─────────────────────────────
router.patch('/restaurants/:id/deactivate', requireAdmin, async (req, res) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: req.params.id } })
  if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' })

  const updated = await prisma.restaurant.update({
    where: { id: req.params.id },
    data:  { isActive: false },
  })
  res.json(updated)
})

// ─── PUT /api/admin/restaurants/:id/status — update restaurant status ────────
router.put('/restaurants/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const { status, isPublished } = req.body
    const data: Record<string, unknown> = { status }
    if (typeof isPublished === 'boolean') data.isPublished = isPublished
    const r = await prisma.restaurant.update({ where: { id: req.params.id }, data })
    res.json(r)
  } catch (err) { next(err) }
})

// ─── GET /api/admin/users — paginated with search ────────────────────────────
router.get('/users', requireAdmin, async (req, res, next) => {
  try {
    const { role, search, page = '1', limit = '20' } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    const where: Record<string, unknown> = {}
    if (role) where.role = role
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id:           true,
          email:        true,
          firstName:    true,
          lastName:     true,
          role:         true,
          isActive:     true,
          isVerified:   true,
          createdAt:    true,
          lastActiveAt: true,
          lastLoginAt:  true,
          _count: { select: { bookings: true, restaurants: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.user.count({ where }),
    ])

    const pages = Math.ceil(total / parseInt(limit as string))
    res.json({ users, total, page: parseInt(page as string), pages })
  } catch (err) { next(err) }
})

// ─── GET /api/admin/users/:id — full user detail ─────────────────────────────
router.get('/users/:id', requireAdmin, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id:           true,
        email:        true,
        firstName:    true,
        lastName:     true,
        phone:        true,
        avatarUrl:    true,
        role:         true,
        isActive:     true,
        isVerified:   true,
        language:     true,
        dateOfBirth:  true,
        referralCode: true,
        createdAt:    true,
        lastActiveAt: true,
        lastLoginAt:  true,
        restaurants:  { select: { id: true, name: true, plan: true, status: true } },
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true, bookingRef: true, date: true, time: true,
            guestCount: true, status: true, createdAt: true,
            restaurant: { select: { id: true, name: true } },
          },
        },
        _count: { select: { bookings: true, restaurants: true, reviews: true } },
      },
    })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) { next(err) }
})

// ─── PATCH /api/admin/users/:id — update role / status ───────────────────────
router.patch('/users/:id', requireAdmin, async (req, res, next) => {
  try {
    const schema = z.object({
      role:     z.enum(['guest', 'owner', 'admin']).optional(),
      isActive: z.boolean().optional(),
    })
    const data = schema.parse(req.body)
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, role: true, isActive: true },
    })
    res.json(user)
  } catch (err) { next(err) }
})

// ─── PATCH /api/admin/users/:id/role — legacy change role endpoint ────────────
router.patch('/users/:id/role', requireAdmin, async (req, res, next) => {
  try {
    const { role } = req.body
    if (!['guest', 'owner', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be: guest, owner, or admin' })
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, role: true },
    })
    res.json(user)
  } catch (err) { next(err) }
})

// ─── GET /api/admin/stats — quick platform KPIs ──────────────────────────────
router.get('/stats', requireAdmin, async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - 7)

    const [
      totalRestaurants, activeRestaurants, totalBookings, totalUsers,
      bookingsToday, bookingsThisMonth, planBreakdown,
      newRestaurantsThisWeek, newUsersThisWeek, noShowBookings,
    ] = await Promise.all([
      prisma.restaurant.count(),
      prisma.restaurant.count({ where: { isActive: true } }),
      prisma.booking.count(),
      prisma.user.count(),
      prisma.booking.count({ where: { date: { gte: today, lte: todayEnd } } }),
      prisma.booking.count({ where: { date: { gte: monthStart } } }),
      prisma.restaurant.groupBy({ by: ['plan'], _count: { id: true } }),
      prisma.restaurant.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.booking.count({ where: { status: 'no_show' } }),
    ])

    const plans: Record<string, number> = {}
    for (const p of planBreakdown) plans[p.plan ?? 'free'] = p._count.id

    let mrr = 0
    for (const p of planBreakdown) {
      if (p.plan === 'pro') mrr += p._count.id * 149
      else if (p.plan === 'business') mrr += p._count.id * 349
    }

    const noShowRate = totalBookings > 0 ? Math.round((noShowBookings / totalBookings) * 100) : 0

    res.json({
      totalRestaurants, activeRestaurants, totalBookings, totalUsers,
      bookingsToday, bookingsThisMonth, planBreakdown: plans,
      newRestaurantsThisWeek, newUsersThisWeek, mrr, noShowRate,
    })
  } catch (err) { next(err) }
})

// ─── GET /api/admin/statistics — comprehensive analytics ─────────────────────
router.get('/statistics', requireAdmin, async (req, res, next) => {
  try {
    const { from, to } = req.query
    const fromDate = from ? new Date(String(from)) : new Date(new Date().getFullYear(), 0, 1)
    const toDate = to ? new Date(String(to)) : new Date()

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999)

    const [
      totalRestaurants, activeRestaurants, totalUsers, totalBookings, todayBookings,
      planDistribution, bookingSourceDistribution, userRoleDistribution,
      restaurants, bookings, users, noShowCount,
    ] = await Promise.all([
      prisma.restaurant.count(),
      prisma.restaurant.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.booking.count(),
      prisma.booking.count({ where: { date: { gte: today, lte: todayEnd } } }),
      prisma.restaurant.groupBy({ by: ['plan'], _count: { id: true } }),
      prisma.booking.groupBy({ by: ['source'], _count: { id: true } }),
      prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
      prisma.restaurant.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        select: { id: true, name: true, district: true, plan: true, rating: true, createdAt: true,
          _count: { select: { bookings: true } } },
      }),
      prisma.booking.findMany({
        where: { date: { gte: fromDate, lte: toDate } },
        select: { restaurantId: true, date: true, createdAt: true, status: true },
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        select: { createdAt: true },
      }),
      prisma.booking.count({ where: { status: 'no_show' } }),
    ])

    // MRR estimate
    let mrr = 0
    for (const p of planDistribution) {
      if (p.plan === 'pro') mrr += p._count.id * 149
      else if (p.plan === 'business') mrr += p._count.id * 349
    }

    const noShowRate = totalBookings > 0 ? Math.round((noShowCount / totalBookings) * 100) : 0

    function groupByMonth(items: { createdAt: Date }[]) {
      const byMonth: Record<string, number> = {}
      for (const item of items) {
        const key = item.createdAt.toISOString().slice(0, 7)
        byMonth[key] = (byMonth[key] ?? 0) + 1
      }
      return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }))
    }

    const bookingsByMonth: Record<string, number> = {}
    for (const b of bookings) {
      const key = b.date.toISOString().slice(0, 7)
      bookingsByMonth[key] = (bookingsByMonth[key] ?? 0) + 1
    }
    const bookingsGrowth = Object.entries(bookingsByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))

    // Peak hours heatmap
    const allBookingsForHeatmap = await prisma.booking.findMany({
      select: { date: true, time: true },
    })
    const heatmap: Record<string, Record<string, number>> = {}
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (const b of allBookingsForHeatmap) {
      const day = days[new Date(b.date).getDay()]
      const hour = b.time.split(':')[0]
      if (!heatmap[day]) heatmap[day] = {}
      heatmap[day][hour] = (heatmap[day][hour] ?? 0) + 1
    }

    // Top restaurants
    const allRestaurants = await prisma.restaurant.findMany({
      select: { id: true, name: true, rating: true, _count: { select: { bookings: true } } },
      orderBy: { bookings: { _count: 'desc' } },
      take: 10,
    })
    const topRestaurants = allRestaurants.map(r => ({
      id: r.id, name: r.name, bookings: r._count.bookings, rating: r.rating,
    }))

    // Top districts
    const districtData = await prisma.restaurant.findMany({
      select: { district: true, _count: { select: { bookings: true } } },
    })
    const districtMap: Record<string, { restaurantCount: number; bookingCount: number }> = {}
    for (const r of districtData) {
      if (!r.district) continue
      if (!districtMap[r.district]) districtMap[r.district] = { restaurantCount: 0, bookingCount: 0 }
      districtMap[r.district].restaurantCount++
      districtMap[r.district].bookingCount += r._count.bookings
    }
    const topDistricts = Object.entries(districtMap)
      .map(([district, data]) => ({ district, ...data }))
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 10)

    // Average party size
    const partySizeAgg = await prisma.booking.aggregate({ _avg: { guestCount: true } })
    const avgPartySize = Math.round((partySizeAgg._avg.guestCount ?? 0) * 10) / 10

    res.json({
      overview: { totalRestaurants, activeRestaurants, totalUsers, totalBookings, todayBookings, mrr, noShowRate, avgPartySize },
      growth: { restaurants: groupByMonth(restaurants), users: groupByMonth(users), bookings: bookingsGrowth },
      topRestaurants,
      topDistricts,
      planDistribution: planDistribution.map(p => ({ plan: p.plan, count: p._count.id })),
      bookingSourceDistribution: bookingSourceDistribution.map(s => ({ source: s.source, count: s._count.id })),
      userRoleDistribution: userRoleDistribution.map(r => ({ role: r.role, count: r._count.id })),
      heatmap,
    })
  } catch (err) { next(err) }
})

// ─── GET /api/admin/settings — platform settings ─────────────────────────────
router.get('/settings', requireAdmin, async (req, res) => {
  // Return current env-derived settings (read-only for sensitive keys)
  const stripeConfigured   = !!process.env.STRIPE_SECRET_KEY
  const twilioConfigured   = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  const googleConfigured   = !!process.env.GOOGLE_PLACES_API_KEY
  const r2Configured       = !!(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY)
  const jwtConfigured      = !!process.env.JWT_SECRET

  res.json({
    platform: {
      name:            process.env.PLATFORM_NAME ?? 'Stolik',
      supportEmail:    process.env.SUPPORT_EMAIL ?? 'support@stolik.pl',
      defaultLanguage: process.env.DEFAULT_LANGUAGE ?? 'en',
    },
    plans: {
      pro:      { price: 149, currency: 'PLN' },
      business: { price: 349, currency: 'PLN' },
    },
    integrations: { stripe: stripeConfigured, twilio: twilioConfigured, google: googleConfigured, r2: r2Configured, jwt: jwtConfigured },
  })
})

// ─── POST /api/admin/restaurants/:id/no-show — mark booking as no-show ───────
router.post('/restaurants/:restaurantId/bookings/:bookingId/no-show', requireAdmin, async (req, res, next) => {
  try {
    const { bookingId, restaurantId } = req.params
    const booking = await prisma.booking.findFirst({ where: { id: bookingId, restaurantId } })
    if (!booking) return res.status(404).json({ error: 'Booking not found' })

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({ where: { id: bookingId }, data: { status: 'no_show' } })
      // Update guest profile no-show count
      await tx.guestProfile.updateMany({
        where: { phone: booking.guestPhone, restaurantId },
        data: { noShowCount: { increment: 1 } },
      })
      return b
    })
    res.json(updated)
  } catch (err) { next(err) }
})

// ─── CRUD /api/admin/partners ────────────────────────────────────────────────
router.post('/partners', requireAdmin, async (req, res, next) => {
  try {
    const schema = z.object({
      name:       z.string().min(1),
      email:      z.string().email(),
      phone:      z.string().optional(),
      company:    z.string().optional(),
      commission: z.number().min(0).max(100).optional(),
    })
    const data = schema.parse(req.body)
    const partner = await prisma.partner.create({ data })
    res.status(201).json(partner)
  } catch (err) { next(err) }
})

router.get('/partners', requireAdmin, async (req, res, next) => {
  try {
    const partners = await prisma.partner.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { restaurants: true } } },
    })
    res.json(partners)
  } catch (err) { next(err) }
})

router.patch('/partners/:id', requireAdmin, async (req, res, next) => {
  try {
    const schema = z.object({
      name:       z.string().min(1).optional(),
      email:      z.string().email().optional(),
      phone:      z.string().optional(),
      company:    z.string().optional(),
      notes:      z.string().optional(),
      isActive:   z.boolean().optional(),
      commission: z.number().min(0).max(100).optional(),
    })
    const data = schema.parse(req.body)
    const partner = await prisma.partner.update({ where: { id: req.params.id }, data })
    res.json(partner)
  } catch (err) { next(err) }
})

router.delete('/partners/:id', requireAdmin, async (req, res, next) => {
  try {
    await prisma.partner.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) { next(err) }
})

export { router as adminRouter }
