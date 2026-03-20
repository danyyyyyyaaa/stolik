import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { restaurantTablesRouter } from './tables'

const router = Router()
const prisma = new PrismaClient()

// ─── GET /api/restaurants — public, filters: cuisine, city, search ───────────
router.get('/', async (req, res) => {
  const { cuisine, city, search } = req.query

  const restaurants = await prisma.restaurant.findMany({
    where: {
      isActive: true,
      ...(cuisine ? { cuisine: cuisine as string } : {}),
      ...(city    ? { city:    city    as string } : {}),
      ...(search  ? {
        OR: [
          { name:        { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { address:     { contains: search as string, mode: 'insensitive' } },
        ],
      } : {}),
    },
    select: {
      id: true, name: true, slug: true, description: true,
      cuisine: true, district: true, city: true, address: true,
      priceRange: true, rating: true, reviewCount: true,
      emoji: true, coverImage: true, isPremium: true,
    },
    orderBy: [{ isPremium: 'desc' }, { rating: 'desc' }],
  })

  res.json(restaurants)
})

// ─── GET /api/restaurants/:id — public ───────────────────────────────────────
router.get('/:id', async (req, res) => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: req.params.id },
    include: { tables: { where: { isActive: true } } },
  })

  if (!restaurant || !restaurant.isActive) {
    return res.status(404).json({ error: 'Restaurant not found' })
  }

  res.json(restaurant)
})

// ─── POST /api/restaurants — owner only ──────────────────────────────────────
const createRestaurantSchema = z.object({
  name:        z.string().min(2),
  description: z.string().optional(),
  cuisine:     z.string().min(2),
  district:    z.string().min(2),
  city:        z.string().default('Warszawa'),
  address:     z.string().min(5),
  phone:       z.string().optional(),
  email:       z.string().email().optional(),
  website:     z.string().url().optional(),
  instagram:   z.string().optional(),
  priceRange:  z.enum(['$', '$$', '$$$', '$$$$']).default('$$'),
  emoji:       z.string().optional(),
  coverImage:  z.string().optional(),
})

router.post('/', requireAuth, async (req, res) => {
  const userId = (req as any).userId

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.role !== 'owner') {
    return res.status(403).json({ error: 'Only restaurant owners can create restaurants' })
  }

  try {
    const data = createRestaurantSchema.parse(req.body)

    const slug = data.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      + '-' + Date.now().toString(36)

    const restaurant = await prisma.restaurant.create({
      data: { ...data, slug, ownerId: userId },
    })

    res.status(201).json(restaurant)
  } catch (err) {
    res.status(400).json({ error: 'Invalid data', details: err })
  }
})

// ─── PATCH /api/restaurants/:id — owner of this restaurant only ──────────────
const updateRestaurantSchema = z.object({
  name:            z.string().min(2).optional(),
  description:     z.string().optional(),
  cuisine:         z.string().min(2).optional(),
  district:        z.string().min(2).optional(),
  city:            z.string().optional(),
  address:         z.string().min(5).optional(),
  phone:           z.string().optional(),
  email:           z.string().email().optional(),
  website:         z.string().url().optional(),
  instagram:       z.string().optional(),
  priceRange:      z.enum(['$', '$$', '$$$', '$$$$']).optional(),
  emoji:           z.string().optional(),
  coverImage:      z.string().optional(),
  isActive:        z.boolean().optional(),
  slotDuration:    z.number().int().positive().optional(),
  maxGuestsPerSlot:z.number().int().positive().optional(),
  minAdvanceHours: z.number().int().min(0).optional(),
  maxAdvanceDays:  z.number().int().positive().optional(),
  depositRequired: z.boolean().optional(),
  depositAmount:   z.number().nonnegative().optional(),
  openMonday:      z.string().optional(),
  openTuesday:     z.string().optional(),
  openWednesday:   z.string().optional(),
  openThursday:    z.string().optional(),
  openFriday:      z.string().optional(),
  openSaturday:    z.string().optional(),
  openSunday:      z.string().optional(),
})

router.patch('/:id', requireAuth, async (req, res) => {
  const userId = (req as any).userId

  const existing = await prisma.restaurant.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    return res.status(404).json({ error: 'Restaurant not found' })
  }
  if (existing.ownerId !== userId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const data = updateRestaurantSchema.parse(req.body)

    const restaurant = await prisma.restaurant.update({
      where: { id: req.params.id },
      data,
    })

    res.json(restaurant)
  } catch (err) {
    res.status(400).json({ error: 'Invalid data', details: err })
  }
})

// ─── Nested tables routes ─────────────────────────────────────────────────────
router.use('/:restaurantId/tables', restaurantTablesRouter)

export { router as restaurantsRouter }
