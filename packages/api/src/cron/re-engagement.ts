import { PrismaClient } from '@prisma/client'
import { sendPush } from './push'

const prisma = new PrismaClient()

export async function processReengagement() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const users = await prisma.user.findMany({
    where: {
      role: 'guest',
      expoPushToken: { not: null },
      OR: [
        { lastActiveAt: { lte: sevenDaysAgo } },
        { lastActiveAt: null },
      ]
    },
    select: { expoPushToken: true, firstName: true },
    take: 200,
  })

  for (const user of users) {
    if (user.expoPushToken) {
      await sendPush(
        user.expoPushToken,
        `Hi ${user.firstName || 'there'}!`,
        'New restaurants are waiting for you in Warsaw. Book your table today!',
        { type: 'reengagement' }
      )
    }
  }
}
