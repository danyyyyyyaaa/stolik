import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// ─── GET /api/favorites — user's saved restaurants ───────────────────────────
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    const favorites = await prisma.userFavorite.findMany({
      where: { userId },
      include: {
        restaurant: {
          select: {
            id: true, name: true, slug: true, cuisine: true, district: true,
            city: true, address: true, priceRange: true, rating: true,
            emoji: true, coverImage: true, isActive: true, hasParking: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(favorites.map(f => f.restaurant))
  } catch (err) { next(err) }
})

// ─── POST /api/favorites/:restaurantId — toggle add/remove ───────────────────
router.post('/:restaurantId', requireAuth, async (req, res, next) => {
  try {
    const userId       = (req as any).userId
    const restaurantId = req.params.restaurantId

    const existing = await prisma.userFavorite.findUnique({
      where: { userId_restaurantId: { userId, restaurantId } },
    })

    if (existing) {
      await prisma.userFavorite.delete({ where: { id: existing.id } })
      res.json({ favorited: false })
    } else {
      await prisma.userFavorite.create({ data: { userId, restaurantId } })
      res.json({ favorited: true })
    }
  } catch (err) { next(err) }
})

// ─── GET /api/favorites/ids — just restaurant IDs for quick heart check ───────
router.get('/ids', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    const favorites = await prisma.userFavorite.findMany({
      where: { userId },
      select: { restaurantId: true },
    })
    res.json(favorites.map(f => f.restaurantId))
  } catch (err) { next(err) }
})

export { router as favoritesRouter }
