import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'

const prisma = new PrismaClient()

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createTableSchema = z.object({
  name:     z.string().min(1),
  capacity: z.number().int().positive(),
  posX:     z.number().optional(),
  posY:     z.number().optional(),
  shape:    z.enum(['round', 'square', 'rectangle']).default('round'),
})

const updateTableSchema = z.object({
  name:        z.string().min(1).optional(),
  capacity:    z.number().int().positive().optional(),
  minCapacity: z.number().int().min(1).optional(),
  posX:        z.number().optional(),
  posY:        z.number().optional(),
  shape:       z.enum(['round', 'square', 'rectangle']).optional(),
  isActive:    z.boolean().optional(),
})

// ─── Helper: verify the authenticated user owns the restaurant ────────────────

async function ownerOf(restaurantId: string, userId: string) {
  return prisma.restaurant.findFirst({
    where: { id: restaurantId, ownerId: userId },
  })
}

// ─── restaurantTablesRouter — mounted at /api/restaurants/:restaurantId/tables
// (added to restaurantsRouter in restaurants.ts)

export const restaurantTablesRouter = Router({ mergeParams: true })

// GET /api/restaurants/:restaurantId/tables
restaurantTablesRouter.get('/', requireAuth, async (req, res) => {
  const userId = (req as any).userId
  const { restaurantId } = req.params

  const restaurant = await ownerOf(restaurantId, userId)
  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found or access denied' })
  }

  const tables = await prisma.table.findMany({
    where: { restaurantId },
    orderBy: { name: 'asc' },
  })

  res.json(tables)
})

// POST /api/restaurants/:restaurantId/tables
restaurantTablesRouter.post('/', requireAuth, async (req, res) => {
  const userId = (req as any).userId
  const { restaurantId } = req.params

  const restaurant = await ownerOf(restaurantId, userId)
  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found or access denied' })
  }

  try {
    const data = createTableSchema.parse(req.body)
    const table = await prisma.table.create({ data: { ...data, restaurantId } })
    res.status(201).json(table)
  } catch (err) {
    res.status(400).json({ error: 'Invalid data', details: err })
  }
})

// ─── tablesRouter — mounted at /api/tables ───────────────────────────────────

export const tablesRouter = Router()

// PATCH /api/tables/:id
tablesRouter.patch('/:id', requireAuth, async (req, res) => {
  const userId = (req as any).userId

  const table = await prisma.table.findUnique({
    where: { id: req.params.id },
    include: { restaurant: { select: { ownerId: true } } },
  })

  if (!table) {
    return res.status(404).json({ error: 'Table not found' })
  }
  if (table.restaurant.ownerId !== userId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const data = updateTableSchema.parse(req.body)
    const updated = await prisma.table.update({ where: { id: req.params.id }, data })
    res.json(updated)
  } catch (err) {
    res.status(400).json({ error: 'Invalid data', details: err })
  }
})

// DELETE /api/tables/:id — soft delete (isActive = false)
tablesRouter.delete('/:id', requireAuth, async (req, res) => {
  const userId = (req as any).userId

  const table = await prisma.table.findUnique({
    where: { id: req.params.id },
    include: { restaurant: { select: { ownerId: true } } },
  })

  if (!table) {
    return res.status(404).json({ error: 'Table not found' })
  }
  if (table.restaurant.ownerId !== userId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const deactivated = await prisma.table.update({
    where: { id: req.params.id },
    data: { isActive: false },
  })

  res.json(deactivated)
})
