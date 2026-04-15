import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const router = Router()

// ─── helpers ─────────────────────────────────────────────────────────────────

type Lang = 'en' | 'pl' | 'ru' | 'uk'

function pickLang(lang: Lang, base: string, en?: string | null, pl?: string | null, uk?: string | null): string {
  if (lang === 'en' && en) return en
  if (lang === 'pl' && pl) return pl
  if (lang === 'uk' && uk) return uk
  return base
}

// ─── GET /api/public/restaurants/:id/menu ─────────────────────────────────────
// Public — no auth. Returns visible menu categories + items in requested lang.

router.get('/restaurants/:id/menu', async (req, res) => {
  const { id } = req.params
  const lang = (['en', 'pl', 'ru', 'uk'].includes(req.query.lang as string)
    ? (req.query.lang as Lang)
    : 'en')

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      select: { id: true, updatedAt: true },
    })
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' })

    const rawCategories = await prisma.menuCategory.findMany({
      where: { restaurantId: id, isVisible: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          where: { isAvailable: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    // Filter out categories that have zero visible items after item-level filtering
    const categories = rawCategories
      .filter(cat => cat.items.length > 0)
      .map(cat => ({
        id: cat.id,
        name: pickLang(lang, cat.name, cat.nameEn, cat.namePl, cat.nameUk),
        position: cat.sortOrder,
        items: cat.items.map(item => ({
          id: item.id,
          name: pickLang(lang, item.name, item.nameEn, item.namePl, item.nameUk),
          description: item.description
            ? pickLang(lang, item.description, item.descriptionEn, item.descriptionPl, item.descriptionUk)
            : null,
          price: item.price,
          currency: item.currency,
          imageUrl: item.imageUrl ?? item.photoUrl ?? null,
          weight: item.weight,
          calories: item.calories,
          allergens: item.allergens,
          tags: item.tags,
          isAvailable: item.isAvailable,
          specialPrice: item.specialPrice,
          specialPriceLabel: item.specialPriceLabel,
        })),
      }))

    res.json({ categories, updatedAt: restaurant.updatedAt })
  } catch (err) {
    console.error('[public/menu]', err)
    res.status(500).json({ error: 'Failed to fetch menu' })
  }
})

// ─── GET /api/public/restaurants/:id/promotions ───────────────────────────────
// Returns ACTIVE promotions for a restaurant.

router.get('/restaurants/:id/promotions', async (req, res) => {
  const { id } = req.params
  const lang = (['en', 'pl', 'ru', 'uk'].includes(req.query.lang as string)
    ? (req.query.lang as Lang)
    : 'en')

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' })

    const now = new Date()
    const promotions = await prisma.promotion.findMany({
      where: {
        restaurantId: id,
        status: 'ACTIVE',
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      orderBy: [{ isHighlighted: 'desc' }, { startDate: 'desc' }],
    })

    res.json({
      promotions: promotions.map(p => ({
        id: p.id,
        title: pickLang(lang, p.title, p.titleEn, p.titlePl, p.titleUk),
        description: pickLang(lang, p.description, p.descriptionEn, p.descriptionPl, p.descriptionUk),
        imageUrl: p.imageUrl,
        type: p.type,
        discountPercent: p.discountPercent,
        discountAmount: p.discountAmount,
        startDate: p.startDate,
        endDate: p.endDate,
        recurringDays: p.recurringDays,
        timeStart: p.timeStart,
        timeEnd: p.timeEnd,
        conditions: p.conditions,
        promoCode: p.promoCode,
        isHighlighted: p.isHighlighted,
      })),
    })
  } catch (err) {
    console.error('[public/promotions]', err)
    res.status(500).json({ error: 'Failed to fetch promotions' })
  }
})

// ─── GET /api/public/promotions/featured ──────────────────────────────────────
// Top highlighted promotions across all restaurants (for home screen carousel).

router.get('/promotions/featured', async (req, res) => {
  const lang = (['en', 'pl', 'ru', 'uk'].includes(req.query.lang as string)
    ? (req.query.lang as Lang)
    : 'en')

  try {
    const now = new Date()
    const promotions = await prisma.promotion.findMany({
      where: {
        status: 'ACTIVE',
        isHighlighted: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      take: 10,
      orderBy: [{ restaurant: { totalScore: 'desc' } }, { startDate: 'desc' }],
      include: {
        restaurant: {
          select: { id: true, name: true, coverImage: true, slug: true },
        },
      },
    })

    res.json({
      promotions: promotions.map(p => ({
        id: p.id,
        restaurantId: p.restaurantId,
        restaurantName: p.restaurant.name,
        restaurantSlug: p.restaurant.slug,
        restaurantImage: p.restaurant.coverImage,
        title: pickLang(lang, p.title, p.titleEn, p.titlePl, p.titleUk),
        description: pickLang(lang, p.description, p.descriptionEn, p.descriptionPl, p.descriptionUk),
        imageUrl: p.imageUrl,
        type: p.type,
        discountPercent: p.discountPercent,
        endDate: p.endDate,
        promoCode: p.promoCode,
      })),
    })
  } catch (err) {
    console.error('[public/promotions/featured]', err)
    res.status(500).json({ error: 'Failed to fetch featured promotions' })
  }
})

// ─── POST /api/public/promotions/:id/view ────────────────────────────────────

router.post('/promotions/:id/view', async (req, res) => {
  try {
    await prisma.promotion.update({
      where: { id: req.params.id },
      data: { viewCount: { increment: 1 } },
    })
    res.json({ ok: true })
  } catch {
    res.json({ ok: true }) // silent fail — don't break client
  }
})

// ─── POST /api/public/promotions/:id/click ───────────────────────────────────

router.post('/promotions/:id/click', async (req, res) => {
  try {
    await prisma.promotion.update({
      where: { id: req.params.id },
      data: { clickCount: { increment: 1 } },
    })
    res.json({ ok: true })
  } catch {
    res.json({ ok: true }) // silent fail
  }
})

export { router as publicRouter }
