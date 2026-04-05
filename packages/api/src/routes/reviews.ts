import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// ─── GET /api/reviews/:restaurantId — internal reviews with distribution ─────
router.get('/:restaurantId', async (req, res, next) => {
  try {
    const { restaurantId } = req.params

    const reviews = await prisma.review.findMany({
      where: { restaurantId, isVisible: true },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const r of reviews) distribution[r.rating] = (distribution[r.rating] ?? 0) + 1

    const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

    res.json({
      reviews,
      avgRating: parseFloat(avgRating.toFixed(1)),
      totalCount: reviews.length,
      distribution,
    })
  } catch (err) { next(err) }
})

// ─── POST /api/reviews — create a review ─────────────────────────────────────
const createReviewSchema = z.object({
  restaurantId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
})

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    const data = createReviewSchema.parse(req.body)

    const review = await prisma.review.create({
      data: {
        restaurantId: data.restaurantId,
        userId,
        rating: data.rating,
        comment: data.comment,
      },
    })

    // Update restaurant rating
    const agg = await prisma.review.aggregate({
      where: { restaurantId: data.restaurantId, isVisible: true },
      _avg: { rating: true },
      _count: true,
    })
    await prisma.restaurant.update({
      where: { id: data.restaurantId },
      data: {
        rating: agg._avg.rating ?? 0,
        reviewCount: agg._count,
      },
    })

    res.status(201).json(review)
  } catch (err) { next(err) }
})

// ─── POST /api/reviews/:id/reply — owner reply to a review ──────────────────
router.post('/:id/reply', requireAuth, async (req, res, next) => {
  try {
    const { text } = req.body
    if (!text?.trim()) return res.status(400).json({ error: 'Reply text required' })

    const review = await prisma.review.update({
      where: { id: req.params.id },
      data: { ownerReply: text, ownerRepliedAt: new Date() },
    })
    res.status(201).json(review)
  } catch (err) { next(err) }
})

export { router as reviewsRouter }
