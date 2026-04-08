import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// ─── Helper: verify restaurant ownership ────────────────────────────────────
async function getOwnedRestaurant(restaurantId: string, userId: string) {
  const r = await prisma.restaurant.findFirst({ where: { id: restaurantId, ownerId: userId } })
  return r
}

const dealSchema = z.object({
  title:         z.string().min(2),
  description:   z.string().optional(),
  discountType:  z.enum(['percent', 'fixed', 'freeitem']).default('percent'),
  discountValue: z.number().optional(),
  code:          z.string().optional(),
  validFrom:     z.string().optional(),
  validUntil:    z.string().optional(),
  isActive:      z.boolean().default(true),
  maxUses:       z.number().int().optional(),
})

// ─── GET /api/deals — public: all active deals with restaurant info ───────────
router.get('/deals', async (req, res, next) => {
  try {
    const now = new Date()
    const deals = await prisma.restaurantDeal.findMany({
      where: {
        isActive: true,
        OR: [
          { validUntil: null },
          { validUntil: { gte: now } },
        ],
      },
      include: {
        restaurant: {
          select: { id: true, name: true, slug: true, coverImage: true, cuisine: true, district: true, emoji: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(deals)
  } catch (err) { next(err) }
})

// ─── GET /api/restaurants/:id/deals — public: deals for a restaurant ─────────
router.get('/restaurants/:id/deals', async (req, res, next) => {
  try {
    const now = new Date()
    const deals = await prisma.restaurantDeal.findMany({
      where: {
        restaurantId: req.params.id,
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(deals)
  } catch (err) { next(err) }
})

// ─── POST /api/restaurants/:id/deals ─────────────────────────────────────────
router.post('/restaurants/:id/deals', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId as string
    const r = await getOwnedRestaurant(req.params.id, userId)
    if (!r) return res.status(403).json({ error: 'Forbidden' })

    const data = dealSchema.parse(req.body)
    const deal = await prisma.restaurantDeal.create({
      data: {
        restaurantId: req.params.id,
        ...data,
        validFrom:  data.validFrom  ? new Date(data.validFrom)  : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      },
    })
    res.status(201).json(deal)
  } catch (err) { next(err) }
})

// ─── PATCH /api/restaurants/:id/deals/:dealId ────────────────────────────────
router.patch('/restaurants/:id/deals/:dealId', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId as string
    const r = await getOwnedRestaurant(req.params.id, userId)
    if (!r) return res.status(403).json({ error: 'Forbidden' })

    const data = dealSchema.partial().parse(req.body)
    const deal = await prisma.restaurantDeal.update({
      where: { id: req.params.dealId },
      data: {
        ...data,
        validFrom:  data.validFrom  ? new Date(data.validFrom as string)  : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil as string) : undefined,
        updatedAt: new Date(),
      },
    })
    res.json(deal)
  } catch (err) { next(err) }
})

// ─── DELETE /api/restaurants/:id/deals/:dealId ───────────────────────────────
router.delete('/restaurants/:id/deals/:dealId', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId as string
    const r = await getOwnedRestaurant(req.params.id, userId)
    if (!r) return res.status(403).json({ error: 'Forbidden' })

    await prisma.restaurantDeal.delete({ where: { id: req.params.dealId } })
    res.json({ success: true })
  } catch (err) { next(err) }
})

export { router as dealsRouter }
