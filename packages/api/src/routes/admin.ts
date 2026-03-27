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

export { router as adminRouter }
