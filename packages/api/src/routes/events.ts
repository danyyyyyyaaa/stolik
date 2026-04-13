/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'

const router = Router({ mergeParams: true })
const prisma = new PrismaClient()

const eventSchema = z.object({
  title:          z.string().min(1),
  description:    z.string().optional(),
  date:           z.string(),
  startTime:      z.string().regex(/^\d{2}:\d{2}$/),
  endTime:        z.string().regex(/^\d{2}:\d{2}$/).optional(),
  maxGuests:      z.number().int().positive().optional(),
  pricePerPerson: z.number().min(0).optional(),
  imageUrl:       z.string().url().optional().nullable(),
  isActive:       z.boolean().optional(),
})

async function assertOwner(restaurantId: string, userId: string, res: any): Promise<boolean> {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { ownerId: true } })
  if (!restaurant) { res.status(404).json({ error: 'Restaurant not found' }); return false }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (!user) { res.status(401).json({ error: 'Unauthorized' }); return false }
  if (user.role !== 'admin' && restaurant.ownerId !== userId) {
    res.status(403).json({ error: 'Forbidden' }); return false
  }
  return true
}

// GET /api/restaurants/:id/events — public: active events only
router.get('/', async (req: any, res: any, next: any) => {
  try {
    const events = await prisma.restaurantEvent.findMany({
      where: { restaurantId: req.params.id, isActive: true },
      orderBy: { date: 'asc' },
    })
    res.json(events)
  } catch (err) { next(err) }
})

// GET /api/restaurants/:id/events/all — owner/admin: all events
router.get('/all', requireAuth, async (req: any, res: any, next: any) => {
  try {
    const ok = await assertOwner(req.params.id, req.userId, res)
    if (!ok) return
    const events = await prisma.restaurantEvent.findMany({
      where: { restaurantId: req.params.id },
      orderBy: { date: 'asc' },
    })
    res.json(events)
  } catch (err) { next(err) }
})

// POST /api/restaurants/:id/events
router.post('/', requireAuth, async (req: any, res: any, next: any) => {
  try {
    const ok = await assertOwner(req.params.id, req.userId, res)
    if (!ok) return
    const data = eventSchema.parse(req.body)
    const event = await prisma.restaurantEvent.create({
      data: { ...data, date: new Date(data.date), restaurantId: req.params.id },
    })
    res.status(201).json(event)
  } catch (err) { next(err) }
})

// PATCH /api/restaurants/:id/events/:eventId
router.patch('/:eventId', requireAuth, async (req: any, res: any, next: any) => {
  try {
    const ok = await assertOwner(req.params.id, req.userId, res)
    if (!ok) return
    const data = eventSchema.partial().parse(req.body)
    const updateData: Record<string, unknown> = { ...data }
    if (data.date) updateData.date = new Date(data.date)
    const event = await prisma.restaurantEvent.update({ where: { id: req.params.eventId }, data: updateData })
    res.json(event)
  } catch (err) { next(err) }
})

// DELETE /api/restaurants/:id/events/:eventId
router.delete('/:eventId', requireAuth, async (req: any, res: any, next: any) => {
  try {
    const ok = await assertOwner(req.params.id, req.userId, res)
    if (!ok) return
    await prisma.restaurantEvent.delete({ where: { id: req.params.eventId } })
    res.status(204).send()
  } catch (err) { next(err) }
})

export { router as eventsRouter }
