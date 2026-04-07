import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function syncAllGoogleReviews(): Promise<void> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return

  const restaurants = await prisma.restaurant.findMany({
    where: { googleSyncEnabled: true, googlePlaceId: { not: null } },
    select: { id: true, googlePlaceId: true },
  })

  for (const restaurant of restaurants) {
    if (!restaurant.googlePlaceId) continue
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${restaurant.googlePlaceId}&fields=reviews&key=${apiKey}`
      const response = await fetch(url)
      const data = await response.json() as any
      if (data.status !== 'OK' || !data.result?.reviews) continue

      for (const r of data.result.reviews) {
        const googleReviewId = `${restaurant.googlePlaceId}_${r.time}_${r.author_name.replace(/\s/g, '')}`
        await prisma.googleReview.upsert({
          where: { googleReviewId },
          create: {
            restaurantId: restaurant.id,
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
      }
      await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: { lastGoogleSync: new Date() },
      })
    } catch (err) {
      console.error(`[GoogleSync] Failed for ${restaurant.id}:`, err)
    }
  }
}
