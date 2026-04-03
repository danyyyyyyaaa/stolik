import { PrismaClient } from '@prisma/client'
import { sendPush } from './push'

const prisma = new PrismaClient()

export async function processAbandonedBookings() {
  const twentyMinAgo = new Date(Date.now() - 20 * 60 * 1000)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const abandoned = await prisma.abandonedBooking.findMany({
    where: {
      notificationSent: false,
      createdAt: { lte: twentyMinAgo, gte: oneDayAgo }
    },
    include: {
      user: { select: { expoPushToken: true } },
      restaurant: { select: { name: true } }
    },
    take: 50,
  })

  for (const ab of abandoned) {
    if (ab.user.expoPushToken) {
      await sendPush(
        ab.user.expoPushToken,
        'Finish your booking',
        `Complete your reservation at ${ab.restaurant.name}`,
        { type: 'abandoned', restaurantId: ab.restaurantId }
      )
    }
    await prisma.abandonedBooking.update({
      where: { id: ab.id },
      data: { notificationSent: true }
    })
  }
}
