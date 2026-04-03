import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function processReminders() {
  let twilio: any = null
  const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID
  const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN
  const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER

  const pendingReminders = await prisma.reminder.findMany({
    where: { status: 'pending', sentAt: null },
    include: {
      booking: {
        include: { restaurant: true }
      }
    },
    take: 50,
  })

  for (const reminder of pendingReminders) {
    try {
      const b = reminder.booking
      const msg = reminder.type === 'sms'
        ? `Stolik: Booking confirmed! ${b.restaurant.name}, ${b.time}. Guests: ${b.guestCount}. Address: ${b.restaurant.address}`
        : `Stolik: Reminder! Visit at ${b.restaurant.name} today at ${b.time}. Address: ${b.restaurant.address}`

      if (TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM) {
        if (!twilio) {
          const twilioModule = await import('twilio')
          twilio = (twilioModule as any).default || twilioModule
        }
        const client = twilio(TWILIO_SID, TWILIO_TOKEN)
        await client.messages.create({ body: msg, from: TWILIO_FROM, to: b.guestPhone })
      } else {
        console.log('[SMS Reminder]', msg, '->', b.guestPhone)
      }

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: 'sent', sentAt: new Date() }
      })
    } catch (err) {
      console.error('[Reminders] Failed:', reminder.id, err)
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: 'failed' }
      })
    }
  }
}
