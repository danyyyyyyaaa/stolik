import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'

export const router = Router()
const prisma = new PrismaClient()

async function getOwnedRestaurant(restaurantId: string, userId: string) {
  return prisma.restaurant.findFirst({ where: { id: restaurantId, ownerId: userId } })
}

const promoSchema = z.object({
  isActive:  z.boolean().optional(),
  startsAt:  z.string().optional(),
  endsAt:    z.string().optional(),
  budget:    z.number().optional(),
})

// ─── GET /api/restaurants/:id/promotions ─────────────────────────────────────
router.get('/:id/promotions', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId as string
    const r = await getOwnedRestaurant(req.params.id, userId)
    if (!r) return res.status(403).json({ error: 'Forbidden' })

    const promo = await prisma.restaurantPromotion.findUnique({ where: { restaurantId: req.params.id } })
    res.json(promo ?? null)
  } catch (err) { next(err) }
})

// ─── POST /api/restaurants/:id/promotions — upsert ───────────────────────────
router.post('/:id/promotions', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId as string
    const r = await getOwnedRestaurant(req.params.id, userId)
    if (!r) return res.status(403).json({ error: 'Forbidden' })

    const data = promoSchema.parse(req.body)
    const promo = await prisma.restaurantPromotion.upsert({
      where:  { restaurantId: req.params.id },
      create: {
        restaurantId: req.params.id,
        isActive:  data.isActive  ?? false,
        startsAt:  data.startsAt  ? new Date(data.startsAt)  : undefined,
        endsAt:    data.endsAt    ? new Date(data.endsAt)    : undefined,
        budget:    data.budget,
      },
      update: {
        ...(data.isActive  !== undefined ? { isActive: data.isActive } : {}),
        ...(data.startsAt  ? { startsAt: new Date(data.startsAt) } : {}),
        ...(data.endsAt    ? { endsAt:   new Date(data.endsAt)   } : {}),
        ...(data.budget    !== undefined ? { budget: data.budget } : {}),
        updatedAt: new Date(),
      },
    })
    res.json(promo)
  } catch (err) { next(err) }
})

export { router as promotionsRouter }
