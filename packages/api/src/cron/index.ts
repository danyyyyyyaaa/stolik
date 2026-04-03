import cron from 'node-cron'
import { processReminders } from './reminders'
import { processAbandonedBookings } from './abandoned-bookings'
import { processPushReminders } from './booking-reminders-push'
import { processReengagement } from './re-engagement'

export function startCronJobs() {
  // SMS reminders — every 5 min
  cron.schedule('*/5 * * * *', () => processReminders().catch(console.error))
  // Abandoned bookings push — every 10 min
  cron.schedule('*/10 * * * *', () => processAbandonedBookings().catch(console.error))
  // Push reminders 2h before — every 5 min
  cron.schedule('*/5 * * * *', () => processPushReminders().catch(console.error))
  // Re-engagement — daily at 12:00
  cron.schedule('0 12 * * *', () => processReengagement().catch(console.error))
  console.log('[Cron] All jobs started')
}
