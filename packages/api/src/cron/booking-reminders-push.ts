import { PrismaClient } from '@prisma/client'
import { sendPush } from './push'

const prisma = new PrismaClient()

export async function processPushReminders() {
  const now = new Date()
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const today = now.toISOString().slice(0, 10)

  // Find confirmed bookings today within next 2 hours that haven't been push-reminded
  const bookings = await prisma.booking.findMany({
    where: {
      status: 'confirmed',
      pushReminderSent: false,
      date: {
        gte: new Date(`${today}T00:00:00`),
        lte: new Date(`${today}T23:59:59`),
      },
    },
    include: {
      restaurant: { select: { name: true } },
      user: { select: { expoPushToken: true } },
    },
    take: 100,
  })

  for (const booking of bookings) {
    // Parse time and check if within 2 hours
    const [h, m] = booking.time.split(':').map(Number)
    const bookingTime = new Date(now)
    bookingTime.setHours(h, m, 0, 0)
    if (bookingTime <= twoHoursFromNow && bookingTime > now) {
      if (booking.user?.expoPushToken) {
        await sendPush(
          booking.user.expoPushToken,
          'Your table is reserved!',
          `Your booking at ${booking.restaurant.name} is in 2 hours at ${booking.time}.`,
          { type: 'reminder', bookingId: booking.id }
        )
      }
      await prisma.booking.update({
        where: { id: booking.id },
        data: { pushReminderSent: true }
      })
    }
  }
}
