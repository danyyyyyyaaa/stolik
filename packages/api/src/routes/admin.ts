import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
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

// ─── GET /api/admin/restaurants — all restaurants with owner info ─────────────
router.get('/restaurants', requireAdmin, async (req, res) => {
  const restaurants = await prisma.restaurant.findMany({
    select: {
      id:         true,
      name:       true,
      slug:       true,
      cuisine:    true,
      city:       true,
      address:    true,
      isActive:   true,
      isPremium:  true,
      plan:       true,
      coverImage: true,
      emoji:      true,
      createdAt:  true,
      owner: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json(restaurants)
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

// ─── GET /api/admin/users — paginated user list ─────────────────────────────
router.get('/users', requireAdmin, async (req, res) => {
  const { role, page = '1', limit = '20' } = req.query
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
  const where = role ? { role: role as string } : {}
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isVerified: true, createdAt: true, lastActiveAt: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.user.count({ where }),
  ])
  res.json({ users, total, page: parseInt(page as string), limit: parseInt(limit as string) })
})

// ─── GET /api/admin/stats — platform statistics ─────────────────────────────
router.get('/stats', requireAdmin, async (req, res) => {
  const today = new Date(); today.setHours(0,0,0,0)
  const todayEnd = new Date(today); todayEnd.setHours(23,59,59,999)
  const [totalRestaurants, activeRestaurants, totalBookings, totalUsers, bookingsToday] = await Promise.all([
    prisma.restaurant.count(),
    prisma.restaurant.count({ where: { isActive: true } }),
    prisma.booking.count(),
    prisma.user.count(),
    prisma.booking.count({ where: { date: { gte: today, lte: todayEnd } } }),
  ])
  res.json({ totalRestaurants, activeRestaurants, totalBookings, totalUsers, bookingsToday })
})

// ─── PATCH /api/admin/users/:id/role — change user role ─────────────────────
router.patch('/users/:id/role', requireAdmin, async (req, res) => {
  const { role } = req.body
  if (!['guest', 'owner', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role. Must be: guest, owner, or admin' })
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, role: true }
    })
    res.json(user)
  } catch {
    res.status(404).json({ error: 'User not found' })
  }
})

// ─── GET /api/admin/restaurants/:id/dashboard — restaurant detail for admin ──
router.get('/restaurants/:id/dashboard', requireAdmin, async (req, res) => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: req.params.id },
    include: { tables: true, owner: { select: { id: true, email: true, firstName: true, lastName: true } } }
  })
  if (!restaurant) return res.status(404).json({ error: 'Not found' })
  res.json(restaurant)
})

export { router as adminRouter }
