import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken  = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_FROM_NUMBER

// Lazy-init client — only when env vars are present
function getClient() {
  if (!accountSid || !authToken || !fromNumber) {
    return null
  }
  return twilio(accountSid, authToken)
}

async function send(to: string, body: string): Promise<void> {
  const client = getClient()
  if (!client) {
    console.warn('[SMS] Twilio env vars not set — skipping SMS to', to)
    console.warn('[SMS] Message would be:', body)
    return
  }
  await client.messages.create({ from: fromNumber!, to, body })
}

/* ── Booking shape expected by this service ─────────────────────────────── */
export interface BookingForSms {
  bookingRef:  string
  guestName:   string
  guestPhone:  string
  guestCount:  number
  date:        Date
  time:        string          // "19:00"
  restaurant:  { name: string }
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function formatDate(date: Date): string {
  return date.toLocaleDateString('pl-PL', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
  })
}

/* ── 1. Booking confirmation ─────────────────────────────────────────────── */
export async function sendBookingConfirmation(booking: BookingForSms): Promise<void> {
  const { guestName, guestPhone, bookingRef, time, restaurant, date } = booking
  const body =
    `Stolik: Potwierdzamy rezerwację dla ${guestName} w ${restaurant.name}, ` +
    `${formatDate(date)} o ${time}. Nr: ${bookingRef}. Do zobaczenia!`
  await send(guestPhone, body)
}

/* ── 2. Reminder 24h before ──────────────────────────────────────────────── */
export async function sendReminder24h(booking: BookingForSms): Promise<void> {
  const { guestPhone, bookingRef, time, guestCount, restaurant } = booking
  const body =
    `Stolik: Przypominamy o rezerwacji w ${restaurant.name} jutro o ${time}. ` +
    `Stolik dla ${guestCount} osób. Nr: ${bookingRef}`
  await send(guestPhone, body)
}

/* ── 3. Reminder 2h before ───────────────────────────────────────────────── */
export async function sendReminder2h(booking: BookingForSms): Promise<void> {
  const { guestPhone, time, restaurant } = booking
  const body =
    `Stolik: Za 2 godziny Twoja rezerwacja w ${restaurant.name} o ${time}. Do zobaczenia!`
  await send(guestPhone, body)
}

/* ── 4. Schedule both reminders ──────────────────────────────────────────── */
export function scheduleReminders(booking: BookingForSms): void {
  const visitMs    = booking.date.getTime()
  const now        = Date.now()
  const ms24h      = visitMs - 24 * 60 * 60 * 1000 - now
  const ms2h       = visitMs -  2 * 60 * 60 * 1000 - now

  if (ms24h > 0) {
    setTimeout(() => {
      sendReminder24h(booking).catch(err =>
        console.error('[SMS] Failed to send 24h reminder:', err)
      )
    }, ms24h)
    console.log(`[SMS] 24h reminder scheduled in ${Math.round(ms24h / 3600000)}h for ${booking.bookingRef}`)
  }

  if (ms2h > 0) {
    setTimeout(() => {
      sendReminder2h(booking).catch(err =>
        console.error('[SMS] Failed to send 2h reminder:', err)
      )
    }, ms2h)
    console.log(`[SMS] 2h reminder scheduled in ${Math.round(ms2h / 60000)}m for ${booking.bookingRef}`)
  }
}
