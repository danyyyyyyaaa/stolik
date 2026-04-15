import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Expire active promotions past their endDate ─────────────────────────────

export async function expirePromotions() {
  try {
    const result = await prisma.promotion.updateMany({
      where: {
        status:  'ACTIVE',
        endDate: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    })
    if (result.count > 0) {
      console.log(`[Cron] Expired ${result.count} promotion(s)`)
    }
  } catch (err) {
    console.error('[Cron] expirePromotions error:', err)
    throw err
  }
}

// ─── Expire active boosts past their endDate + zero boostScore ───────────────

export async function expireBoosts() {
  try {
    const expired = await prisma.boost.findMany({
      where: { status: 'ACTIVE', endDate: { lt: new Date() } },
      select: { id: true, restaurantId: true },
    })

    if (expired.length === 0) return

    await prisma.$transaction([
      prisma.boost.updateMany({
        where: { id: { in: expired.map(b => b.id) } },
        data:  { status: 'EXPIRED' },
      }),
      ...expired.map(b =>
        prisma.restaurant.update({
          where: { id: b.restaurantId },
          data:  { boostScore: 0, totalScore: { decrement: 0 } }, // totalScore updated by score-recalc
        })
      ),
    ])

    // Recalculate totalScore for affected restaurants
    const restaurantIds = [...new Set(expired.map(b => b.restaurantId))]
    for (const id of restaurantIds) {
      const r = await prisma.restaurant.findUnique({ where: { id }, select: { baseScore: true } })
      if (r) {
        await prisma.restaurant.update({
          where: { id },
          data:  { boostScore: 0, totalScore: r.baseScore },
        })
      }
    }

    console.log(`[Cron] Expired ${expired.length} boost(s)`)
  } catch (err) {
    console.error('[Cron] expireBoosts error:', err)
    throw err
  }
}

// ─── Recalculate baseScore + totalScore for all restaurants ──────────────────

export async function recalculateScores() {
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { isActive: true },
      select: {
        id:           true,
        googleRating: true,
        reviewCount:  true,
        coverImage:   true,
        description:  true,
        openMonday:   true,
        address:      true,
        boostScore:   true,
      },
    })

    for (const r of restaurants) {
      // a) Google rating × 20 (max 100)
      const ratingScore = r.googleRating ? Math.round(r.googleRating * 20) : 0

      // b) Review count × 0.5 (cap 100)
      const reviewScore = Math.min(Math.round((r.reviewCount ?? 0) * 0.5), 100)

      // c) Profile completeness × 50
      let completeness = 0
      if (r.coverImage)   completeness += 0.2  // photo
      if (r.description)  completeness += 0.2  // description
      if (r.openMonday)   completeness += 0.2  // hours
      if (r.address)      completeness += 0.1  // address
      // check if menu exists
      const menuCount = await prisma.menuCategory.count({ where: { restaurantId: r.id } })
      if (menuCount > 0)  completeness += 0.3  // menu
      const completenessScore = Math.round(completeness * 50)

      // d) Booking rate × 30 (confirmed / total in last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const [confirmed, total] = await Promise.all([
        prisma.booking.count({ where: { restaurantId: r.id, status: 'confirmed', createdAt: { gte: thirtyDaysAgo } } }),
        prisma.booking.count({ where: { restaurantId: r.id, createdAt: { gte: thirtyDaysAgo } } }),
      ])
      const bookingRate = total > 0 ? confirmed / total : 0
      const bookingScore = Math.round(bookingRate * 30)

      // e) Recent activity × 20 (menu/promo updates in last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const [recentMenu, recentPromo] = await Promise.all([
        prisma.menuItem.count({ where: { restaurantId: r.id, updatedAt: { gte: sevenDaysAgo } } }),
        prisma.promotion.count({ where: { restaurantId: r.id, updatedAt: { gte: sevenDaysAgo } } }),
      ])
      const activityScore = (recentMenu > 0 || recentPromo > 0) ? 20 : 0

      const baseScore  = ratingScore + reviewScore + completenessScore + bookingScore + activityScore
      const totalScore = baseScore + (r.boostScore ?? 0)

      await prisma.restaurant.update({
        where: { id: r.id },
        data:  { baseScore, totalScore },
      })
    }

    console.log(`[Cron] Recalculated scores for ${restaurants.length} restaurant(s)`)
  } catch (err) {
    console.error('[Cron] recalculateScores error:', err)
    throw err
  }
}
