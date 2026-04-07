import cron from 'node-cron'
import { processReminders } from './reminders'
import { processAbandonedBookings } from './abandoned-bookings'
import { processPushReminders } from './booking-reminders-push'
import { processReengagement } from './re-engagement'
import { processEmailReminders, processDailySummary, processWeeklyReport } from './email-cron'
import { syncAllGoogleReviews } from './google-reviews-cron'

export function startCronJobs() {
  // SMS reminders — every 5 min
  cron.schedule('*/5 * * * *', () => processReminders().catch(console.error))
  // Abandoned bookings push — every 10 min
  cron.schedule('*/10 * * * *', () => processAbandonedBookings().catch(console.error))
  // Push reminders 2h before — every 5 min
  cron.schedule('*/5 * * * *', () => processPushReminders().catch(console.error))
  // Re-engagement — daily at 12:00
  cron.schedule('0 12 * * *', () => processReengagement().catch(console.error))
  // Email reminders — every hour
  cron.schedule('0 * * * *', () => processEmailReminders().catch(console.error))
  // Daily summary — every day at 7:00 AM
  cron.schedule('0 7 * * *', () => processDailySummary().catch(console.error))
  // Weekly report — every Monday at 8:00 AM
  cron.schedule('0 8 * * 1', () => processWeeklyReport().catch(console.error))
  // Google Reviews sync — daily at 3:00 AM
  cron.schedule('0 3 * * *', () => syncAllGoogleReviews().catch(console.error))
  console.log('[Cron] All jobs started')
}
