import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

async function ownerOf(restaurantId: string, userId: string) {
  return prisma.restaurant.findFirst({ where: { id: restaurantId, ownerId: userId } })
}

// PUT /api/restaurants/:restaurantId/google-place — save Place ID + verify
router.put('/:restaurantId/google-place', requireAuth, async (req, res) => {
  try {
    const { restaurantId } = req.params
    const userId = (req as any).userId
    const { placeId } = req.body
    if (!placeId) return res.status(400).json({ error: 'placeId required' })

    const restaurant = await ownerOf(restaurantId, userId)
    if (!restaurant) return res.status(404).json({ error: 'Not found' })

    // Verify Place ID via Google Places API
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (apiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,place_id&key=${apiKey}`
        const response = await fetch(url)
        const data = await response.json() as any
        if (data.status !== 'OK') {
          return res.status(400).json({ error: 'Invalid Google Place ID', details: { status: data.status } })
        }
      } catch (err) {
        console.error('[Google] Place verification failed:', err)
      }
    }

    const updated = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { googlePlaceId: placeId },
    })
    res.json({ success: true, googlePlaceId: updated.googlePlaceId })
  } catch (err) {
    console.error('[GoogleReviews] PUT google-place error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/restaurants/:restaurantId/google-sync — fetch reviews now
router.post('/:restaurantId/google-sync', requireAuth, async (req, res) => {
  try {
    const { restaurantId } = req.params
    const userId = (req as any).userId

    const restaurant = await ownerOf(restaurantId, userId)
    if (!restaurant) return res.status(404).json({ error: 'Not found' })
    if (!restaurant.googlePlaceId) return res.status(400).json({ error: 'No Google Place ID configured' })

    const count = await syncGoogleReviews(restaurantId, restaurant.googlePlaceId)
    res.json({ success: true, count })
  } catch (err) {
    console.error('[GoogleReviews] POST google-sync error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/restaurants/:restaurantId/reviews-combined — combined app + google reviews
router.get('/:restaurantId/reviews-combined', requireAuth, async (req, res) => {
  try {
    const { restaurantId } = req.params
    const userId = (req as any).userId

    const restaurant = await ownerOf(restaurantId, userId)
    if (!restaurant) return res.status(404).json({ error: 'Not found' })

    const [appReviews, googleReviews] = await Promise.all([
      prisma.review.findMany({
        where: { restaurantId },
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.googleReview.findMany({
        where: { restaurantId },
        orderBy: { publishedAt: 'desc' },
      }),
    ])

    const allRatings = [
      ...appReviews.map(r => r.rating),
      ...googleReviews.map(r => r.rating),
    ]
    const avgRating = allRatings.length > 0
      ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length)
      : 0

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const r of allRatings) { distribution[r] = (distribution[r] ?? 0) + 1 }

    res.json({
      appReviews,
      googleReviews,
      stats: {
        avgRating: Math.round(avgRating * 10) / 10,
        totalCount: allRatings.length,
        googleCount: googleReviews.length,
        appCount: appReviews.length,
        distribution,
      },
    })
  } catch (err) {
    console.error('[GoogleReviews] GET reviews-combined error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Helper: sync Google reviews for a restaurant
export async function syncGoogleReviews(restaurantId: string, placeId: string): Promise<number> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) { console.log('[Google] No API key, skipping'); return 0 }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total&key=${apiKey}`
  const response = await fetch(url)
  const data = await response.json() as any

  if (data.status !== 'OK' || !data.result?.reviews) return 0

  const reviews = data.result.reviews as any[]
  let count = 0

  for (const r of reviews) {
    const googleReviewId = `${placeId}_${r.time}_${r.author_name.replace(/\s/g, '')}`
    await prisma.googleReview.upsert({
      where: { googleReviewId },
      create: {
        restaurantId,
        googleReviewId,
        authorName: r.author_name,
        authorPhoto: r.profile_photo_url ?? null,
        rating: r.rating,
        text: r.text ?? null,
        publishedAt: new Date(r.time * 1000),
        language: r.language ?? null,
      },
      update: { text: r.text ?? null },
    })
    count++
  }

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { lastGoogleSync: new Date() },
  })

  return count
}

export { router as googleReviewsRouter }
