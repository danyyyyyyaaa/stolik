import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { restaurantTablesRouter } from './tables'

const router = Router()
const prisma = new PrismaClient()

// ─── GET /api/restaurants — public, filters: cuisine, city, search, priceRange, minRating
router.get('/', async (req, res) => {
  const { cuisine, city, search, priceRange, minRating } = req.query

  const where: any = {
    isActive: true,
    ...(cuisine ? { cuisine: cuisine as string } : {}),
    ...(city    ? { city:    city    as string } : {}),
    ...(priceRange ? { priceRange: priceRange as string } : {}),
    ...(minRating ? { rating: { gte: parseFloat(minRating as string) } } : {}),
    ...(search  ? {
      OR: [
        { name:        { contains: search as string, mode: 'insensitive' as const } },
        { description: { contains: search as string, mode: 'insensitive' as const } },
        { address:     { contains: search as string, mode: 'insensitive' as const } },
      ],
    } : {}),
  }

  const restaurants = await prisma.restaurant.findMany({
    where,
    select: {
      id: true, name: true, slug: true, description: true,
      cuisine: true, district: true, city: true, address: true,
      priceRange: true, rating: true, reviewCount: true,
      emoji: true, coverImage: true, isPremium: true,
      googleRating: true, latitude: true, longitude: true,
    },
    orderBy: [{ isPremium: 'desc' }, { rating: 'desc' }],
  })

  res.json(restaurants)
})

// ─── GET /api/restaurants/search-google — search Google Places ───────────────
router.get('/search-google', async (req, res) => {
  const { query } = req.query
  if (!query) return res.status(400).json({ error: 'query required' })

  const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY
  if (!GOOGLE_KEY) return res.json({ places: [] })

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8000)
    const gRes = await fetch(
      `https://places.googleapis.com/v1/places:searchText`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Api-Key': GOOGLE_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.photos,places.nationalPhoneNumber,places.regularOpeningHours',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ textQuery: query, languageCode: 'pl' }),
        signal: ctrl.signal,
      }
    )
    clearTimeout(t)
    const data = await gRes.json() as any
    const places = (data.places ?? []).map((p: any) => ({
      placeId: p.id,
      name: p.displayName?.text ?? '',
      address: p.formattedAddress ?? '',
      rating: p.rating ?? null,
      phone: p.nationalPhoneNumber ?? null,
      photoUrl: p.photos?.[0]
        ? `https://places.googleapis.com/v1/${p.photos[0].name}/media?maxWidthPx=400&key=${GOOGLE_KEY}`
        : null,
      openingHours: p.regularOpeningHours?.weekdayDescriptions ?? [],
    }))
    res.json({ places })
  } catch {
    res.json({ places: [] })
  }
})

// ─── POST /api/restaurants/quick-create — create from Google Place ───────────
router.post('/quick-create', requireAuth, async (req, res) => {
  const userId = (req as any).userId
  const { googlePlaceId, tables = [] } = req.body
  if (!googlePlaceId) return res.status(400).json({ error: 'googlePlaceId required' })

  const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY
  let placeData: any = { displayName: { text: 'Restaurant' }, formattedAddress: 'Warsaw' }

  if (GOOGLE_KEY) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 8000)
      const gRes = await fetch(
        `https://places.googleapis.com/v1/places/${googlePlaceId}`,
        {
          headers: {
            'X-Goog-Api-Key': GOOGLE_KEY,
            'X-Goog-FieldMask': 'displayName,formattedAddress,rating,userRatingCount,nationalPhoneNumber,websiteUri,photos,regularOpeningHours,location',
          },
          signal: ctrl.signal,
        }
      )
      clearTimeout(t)
      placeData = await gRes.json()
    } catch {}
  }

  const slug = (placeData.displayName?.text ?? 'restaurant')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    + '-' + Date.now()

  const photoUrl = placeData.photos?.[0] && GOOGLE_KEY
    ? `https://places.googleapis.com/v1/${placeData.photos[0].name}/media?maxWidthPx=800&key=${GOOGLE_KEY}`
    : null

  try {
    const restaurant = await prisma.$transaction(async (tx) => {
      const rest = await tx.restaurant.create({
        data: {
          name: placeData.displayName?.text ?? 'Restaurant',
          slug,
          address: placeData.formattedAddress ?? 'Warsaw',
          city: 'Warszawa',
          district: '',
          cuisine: 'polish',
          ownerId: userId,
          googlePlaceId,
          googleRating: placeData.rating ?? null,
          googleReviewCount: placeData.userRatingCount ?? null,
          phone: placeData.nationalPhoneNumber ?? null,
          website: placeData.websiteUri ?? null,
          coverImage: photoUrl,
          latitude: placeData.location?.latitude ?? null,
          longitude: placeData.location?.longitude ?? null,
          isPublished: true,
          isActive: true,
        }
      })

      for (const tableGroup of tables) {
        const count = tableGroup.count ?? 1
        const capacity = tableGroup.capacity ?? 4
        for (let i = 1; i <= count; i++) {
          await tx.table.create({
            data: { restaurantId: rest.id, name: `Table ${capacity}p #${i}`, capacity, minCapacity: 1 }
          })
        }
      }

      return rest
    })

    res.status(201).json({ restaurant })
  } catch (err) {
    console.error('Quick create error:', err)
    res.status(500).json({ error: 'Failed to create restaurant' })
  }
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

// Helper: treat empty string as undefined so url/email validators don't trip on ""
const optStr     = z.string().optional().transform(v => v === '' ? undefined : v)
const optEmail   = optStr.pipe(z.string().email().optional())
const optUrl     = optStr.pipe(z.string().url().optional())

// ─── POST /api/restaurants — owner only ──────────────────────────────────────
const createRestaurantSchema = z.object({
  name:             z.string().min(2),
  description:      z.string().optional(),
  cuisine:          z.string().optional().default('polish'),
  district:         z.string().optional().default(''),
  city:             z.string().optional().default('Warszawa'),
  address:          z.string().optional().default(''),
  phone:            optStr,
  email:            optEmail,
  website:          optUrl,
  instagram:        optStr,
  priceRange:       z.enum(['$', '$$', '$$$', '$$$$']).optional().default('$$'),
  emoji:            z.string().optional(),
  coverImage:       z.string().optional(),
  // Google / integration fields — all optional, ignored on create
  googlePlaceId:    z.string().optional(),
  googleSyncEnabled:z.boolean().optional().default(false),
  googleRating:     z.number().optional(),
  googleReviewCount:z.number().int().optional(),
})

router.post('/', requireAuth, async (req, res) => {
  const userId = (req as any).userId

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    return res.status(403).json({ error: 'Only restaurant owners can create restaurants' })
  }

  const parsed = createRestaurantSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid data',
      details: parsed.error.flatten(),
    })
  }

  try {
    const { googlePlaceId, googleSyncEnabled, googleRating, googleReviewCount, ...rest } = parsed.data

    const slug = rest.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      + '-' + Date.now().toString(36)

    const restaurant = await prisma.restaurant.create({
      data: {
        ...rest,
        slug,
        ownerId: userId,
        ...(googlePlaceId   !== undefined ? { googlePlaceId }    : {}),
        ...(googleSyncEnabled !== undefined ? { googleSyncEnabled } : {}),
        ...(googleRating    !== undefined ? { googleRating }     : {}),
        ...(googleReviewCount !== undefined ? { googleReviewCount } : {}),
      },
    })

    res.status(201).json(restaurant)
  } catch (err: any) {
    console.error('POST /api/restaurants error:', err)
    res.status(500).json({ error: 'Failed to create restaurant', details: err?.message })
  }
})

// ─── PATCH /api/restaurants/:id — owner of this restaurant only ──────────────
const updateRestaurantSchema = z.object({
  name:             z.string().min(2).optional(),
  description:      z.string().optional(),
  cuisine:          z.string().optional(),
  district:         z.string().optional(),
  city:             z.string().optional(),
  address:          z.string().optional(),
  phone:            optStr,
  email:            optEmail,
  website:          optUrl,
  instagram:        optStr,
  priceRange:       z.enum(['$', '$$', '$$$', '$$$$']).optional(),
  emoji:            z.string().optional(),
  coverImage:       z.string().optional(),
  images:           z.array(z.string()).optional(),
  isActive:         z.boolean().optional(),
  isPublished:      z.boolean().optional(),
  slotDuration:     z.number().int().positive().optional(),
  maxGuestsPerSlot: z.number().int().positive().optional(),
  minAdvanceHours:  z.number().int().min(0).optional(),
  maxAdvanceDays:   z.number().int().positive().optional(),
  depositRequired:  z.boolean().optional(),
  depositAmount:    z.number().nonnegative().optional(),
  openMonday:       z.string().optional(),
  openTuesday:      z.string().optional(),
  openWednesday:    z.string().optional(),
  openThursday:     z.string().optional(),
  openFriday:       z.string().optional(),
  openSaturday:     z.string().optional(),
  openSunday:       z.string().optional(),
  // Google / integration fields
  googlePlaceId:    z.string().optional(),
  googleSyncEnabled:z.boolean().optional(),
  emailNewBooking:  z.boolean().optional(),
  emailCancellation:z.boolean().optional(),
  pushNewBooking:   z.boolean().optional(),
  dailySummary:     z.boolean().optional(),
  weeklyReport:     z.boolean().optional(),
  openingHours:     z.string().optional(),
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

  const parsed = updateRestaurantSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid data',
      details: parsed.error.flatten(),
    })
  }

  try {
    const { images, ...rest } = parsed.data

    const restaurant = await prisma.restaurant.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(images !== undefined ? { images: { set: images } } : {}),
      },
    })

    res.json(restaurant)
  } catch (err: any) {
    console.error('PATCH /api/restaurants/:id error:', err)
    res.status(500).json({ error: 'Failed to update restaurant', details: err?.message })
  }
})

// ─── GET /api/restaurants/:id/reviews — Google reviews for a restaurant ──────
router.get('/:id/reviews', async (req, res) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: req.params.id } })
  if (!restaurant) return res.status(404).json({ error: 'Not found' })

  if (!restaurant.googlePlaceId) {
    return res.json({ rating: null, reviewCount: 0, reviews: [], hasGooglePlaceId: false })
  }

  const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY
  if (!GOOGLE_KEY) {
    return res.json({
      rating: restaurant.googleRating,
      reviewCount: restaurant.googleReviewCount ?? 0,
      reviews: (restaurant.googleReviewsCache as any[]) ?? [],
      hasGooglePlaceId: true,
    })
  }

  // Return cache if fresh (< 24h)
  const cacheAge = restaurant.googleReviewsUpdatedAt
    ? Date.now() - restaurant.googleReviewsUpdatedAt.getTime()
    : Infinity

  if (cacheAge < 24 * 60 * 60 * 1000 && restaurant.googleReviewsCache) {
    return res.json({
      rating: restaurant.googleRating,
      reviewCount: restaurant.googleReviewCount ?? 0,
      reviews: restaurant.googleReviewsCache,
    })
  }

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8000)
    const gRes = await fetch(
      `https://places.googleapis.com/v1/places/${restaurant.googlePlaceId}`,
      {
        headers: {
          'X-Goog-Api-Key': GOOGLE_KEY,
          'X-Goog-FieldMask': 'rating,userRatingCount,reviews',
        },
        signal: ctrl.signal,
      }
    )
    clearTimeout(t)
    const gData = await gRes.json() as any
    const reviews = (gData.reviews ?? []).slice(0, 5).map((r: any) => ({
      author: r.authorAttribution?.displayName ?? 'Anonymous',
      rating: r.rating,
      text: r.text?.text ?? '',
      date: r.publishTime,
      photoUrl: r.authorAttribution?.photoUri ?? null,
    }))

    await prisma.restaurant.update({
      where: { id: req.params.id },
      data: {
        googleRating: gData.rating ?? null,
        googleReviewCount: gData.userRatingCount ?? null,
        googleReviewsCache: reviews,
        googleReviewsUpdatedAt: new Date(),
      }
    })

    res.json({ rating: gData.rating, reviewCount: gData.userRatingCount ?? 0, reviews })
  } catch {
    // Return stale cache on error
    res.json({
      rating: restaurant.googleRating,
      reviewCount: restaurant.googleReviewCount ?? 0,
      reviews: (restaurant.googleReviewsCache as any[]) ?? [],
    })
  }
})

// ─── PATCH /api/restaurants/:id/publish — publish a restaurant ───────────────
router.patch('/:id/publish', requireAuth, async (req, res) => {
  const userId = (req as any).userId
  const restaurant = await prisma.restaurant.findFirst({
    where: { id: req.params.id, ownerId: userId }
  })
  if (!restaurant) return res.status(403).json({ error: 'Not authorized' })

  const updated = await prisma.restaurant.update({
    where: { id: req.params.id },
    data: { isPublished: true, isActive: true }
  })
  res.json(updated)
})

// ─── Nested tables routes ─────────────────────────────────────────────────────
router.use('/:restaurantId/tables', restaurantTablesRouter)

export { router as restaurantsRouter }
