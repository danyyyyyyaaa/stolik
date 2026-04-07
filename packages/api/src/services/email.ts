// Email service — uses Resend if RESEND_API_KEY is set, otherwise logs to console.
// All templates return plain HTML (no React Email) for simplicity.

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://dinto-dashboard.vercel.app'
const APP_URL       = process.env.APP_URL        || 'https://dinto.pl'
const FROM          = process.env.EMAIL_FROM     || 'Dinto <noreply@dinto.pl>'

// ─── Core sender ─────────────────────────────────────────────────────────────

export async function sendEmail(params: {
  to: string
  subject: string
  html: string
  replyTo?: string
}): Promise<void> {
  if (!params.to || !params.to.includes('@')) return

  if (process.env.RESEND_API_KEY) {
    const body: Record<string, unknown> = {
      from:    FROM,
      to:      params.to,
      subject: params.subject,
      html:    params.html,
    }
    if (params.replyTo) body.reply_to = params.replyTo

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.error('[Email] Resend error:', await res.text())
    }
  } else {
    console.log(`[Email] ${params.subject} → ${params.to}`)
  }
}

// ─── Shared layout ────────────────────────────────────────────────────────────

function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Dinto</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <!-- Header -->
      <tr>
        <td style="background:#1B7A4A;padding:24px 32px;">
          <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Dinto</span>
        </td>
      </tr>
      <!-- Content -->
      <tr><td style="padding:32px;">${content}</td></tr>
      <!-- Footer -->
      <tr>
        <td style="background:#f9f9f9;border-top:1px solid #e5e5e5;padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#888;">© 2026 Dinto · Warsaw, Poland · <a href="${APP_URL}" style="color:#1B7A4A;text-decoration:none;">dinto.pl</a></p>
          <p style="margin:6px 0 0;font-size:12px;color:#aaa;">Need help? <a href="mailto:support@dinto.pl" style="color:#1B7A4A;text-decoration:none;">support@dinto.pl</a></p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

function btn(text: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td style="background:#1B7A4A;border-radius:8px;padding:12px 24px;">
    <a href="${url}" style="color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;">${text}</a>
  </td></tr>
</table>`
}

function card(rows: Array<[string, string]>): string {
  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 16px;font-size:13px;color:#888;white-space:nowrap;width:40%;">${label}</td>
      <td style="padding:8px 16px;font-size:13px;font-weight:600;color:#1a1a1a;">${value}</td>
    </tr>`).join('')
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border:1px solid #e5e5e5;border-radius:8px;margin:20px 0;">${rowsHtml}</table>`
}

// ─── Template 1: Welcome (owner registration) ─────────────────────────────────

export function sendWelcomeEmail(to: string, data: {
  firstName: string
  onboardingUrl?: string
}): Promise<void> {
  const url = data.onboardingUrl ?? `${DASHBOARD_URL}/onboarding`
  const html = emailLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;">Welcome to Dinto! 🎉</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#555;">Hi ${data.firstName},</p>
    <p style="font-size:14px;color:#555;line-height:1.6;">Welcome to Dinto — the reservation platform for Warsaw restaurants. You're one step away from going live and accepting bookings.</p>
    <p style="font-size:14px;color:#555;">Next step: set up your restaurant profile.</p>
    ${btn('Complete Setup →', url)}
    <p style="font-size:12px;color:#aaa;">If you didn't create this account, you can safely ignore this email.</p>
  `)
  return sendEmail({ to, subject: 'Welcome to Dinto! 🎉', html })
}

// ─── Template 2: Restaurant published ────────────────────────────────────────

export function sendRestaurantPublishedEmail(to: string, data: {
  restaurantName: string
  slug: string
}): Promise<void> {
  const bookingUrl = `${APP_URL}/r/${data.slug}`
  const html = emailLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;">You're live! 🍽️</h1>
    <p style="font-size:14px;color:#555;line-height:1.6;"><strong>${data.restaurantName}</strong> is now visible to guests on Dinto.</p>
    <p style="font-size:14px;color:#555;">Share your booking link:</p>
    <p style="background:#f0faf4;border:1px solid #c3e6d0;border-radius:6px;padding:12px 16px;font-size:13px;font-family:monospace;color:#1B7A4A;">${bookingUrl}</p>
    ${btn('View Dashboard →', `${DASHBOARD_URL}/dashboard`)}
  `)
  return sendEmail({ to, subject: `Your restaurant is live on Dinto! 🍽️`, html })
}

// ─── Template 3: Booking confirmed (guest) ───────────────────────────────────

export function sendBookingConfirmedEmail(to: string, data: {
  guestName: string
  restaurantName: string
  restaurantAddress?: string
  date: string
  time: string
  partySize: number
  tableName?: string
  notes?: string
  bookingRef: string
}): Promise<void> {
  const mapsUrl = data.restaurantAddress
    ? `https://www.google.com/maps/search/${encodeURIComponent(data.restaurantAddress)}`
    : undefined
  const rows: Array<[string, string]> = [
    ['Restaurant',  data.restaurantName],
    ['Date',        data.date],
    ['Time',        data.time],
    ['Party size',  `${data.partySize} guests`],
  ]
  if (data.tableName) rows.push(['Table', data.tableName])
  if (data.notes)     rows.push(['Special requests', data.notes])

  const html = emailLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;">Reservation confirmed ✅</h1>
    <p style="font-size:14px;color:#555;">Hi ${data.guestName},</p>
    <p style="font-size:14px;color:#555;">Your table is confirmed:</p>
    ${card(rows)}
    ${mapsUrl ? btn('Get Directions →', mapsUrl) : ''}
    <p style="font-size:12px;color:#aaa;margin-top:16px;">Need to cancel? Please do so at least 2 hours before your reservation. Booking ref: <strong>${data.bookingRef}</strong></p>
  `)
  return sendEmail({
    to,
    subject: `Reservation confirmed — ${data.restaurantName}`,
    html,
  })
}

// ─── Template 4: Booking reminder (guest) ─────────────────────────────────────

export function sendBookingReminderEmail(to: string, data: {
  guestName: string
  restaurantName: string
  restaurantAddress?: string
  date: string
  time: string
  partySize: number
  bookingRef: string
}): Promise<void> {
  const mapsUrl = data.restaurantAddress
    ? `https://www.google.com/maps/search/${encodeURIComponent(data.restaurantAddress)}`
    : undefined
  const rows: Array<[string, string]> = [
    ['Restaurant', data.restaurantName],
    ['Date',       data.date],
    ['Time',       data.time],
    ['Guests',     `${data.partySize}`],
  ]
  const html = emailLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;">Reminder: dinner today 🕐</h1>
    <p style="font-size:14px;color:#555;">Hi ${data.guestName},</p>
    <p style="font-size:14px;color:#555;">Just a reminder about your reservation:</p>
    ${card(rows)}
    ${mapsUrl ? btn('Get Directions →', mapsUrl) : ''}
    <p style="font-size:12px;color:#aaa;margin-top:16px;">Can't make it? Please cancel so we can free the table. Ref: <strong>${data.bookingRef}</strong></p>
  `)
  return sendEmail({
    to,
    subject: `Reminder: dinner at ${data.restaurantName} today at ${data.time}`,
    html,
  })
}

// ─── Template 5: Booking cancelled (guest) ────────────────────────────────────

export function sendBookingCancelledEmail(to: string, data: {
  guestName: string
  restaurantName: string
  date: string
  time: string
  cancelledByRestaurant?: boolean
  restaurantSlug?: string
}): Promise<void> {
  const bookAgainUrl = data.restaurantSlug ? `${APP_URL}/r/${data.restaurantSlug}` : APP_URL
  const html = emailLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;">Reservation cancelled</h1>
    <p style="font-size:14px;color:#555;">Hi ${data.guestName},</p>
    <p style="font-size:14px;color:#555;">Your reservation has been cancelled:</p>
    ${card([
      ['Restaurant', data.restaurantName],
      ['Date',       `<s>${data.date}</s>`],
      ['Time',       `<s>${data.time}</s>`],
    ])}
    ${data.cancelledByRestaurant
      ? '<p style="font-size:13px;color:#888;background:#fff8f0;border-left:3px solid #f59e0b;padding:10px 14px;border-radius:0 6px 6px 0;">The restaurant needed to make changes. We apologize for the inconvenience.</p>'
      : ''}
    ${btn('Book Again →', bookAgainUrl)}
  `)
  return sendEmail({
    to,
    subject: `Reservation cancelled — ${data.restaurantName}`,
    html,
  })
}

// ─── Template 6: New booking notification (restaurant owner) ─────────────────

export function sendNewBookingNotificationEmail(to: string, data: {
  guestName: string
  guestPhone: string
  guestEmail?: string
  date: string
  time: string
  partySize: number
  tableName?: string
  notes?: string
  source: string
  bookingRef: string
  replyTo?: string
}): Promise<void> {
  const rows: Array<[string, string]> = [
    ['Guest',       data.guestName],
    ['Phone',       data.guestPhone],
    ['Date',        data.date],
    ['Time',        data.time],
    ['Party size',  `${data.partySize}`],
    ['Source',      data.source],
    ['Ref',         data.bookingRef],
  ]
  if (data.guestEmail) rows.push(['Email', data.guestEmail])
  if (data.tableName)  rows.push(['Table', data.tableName])
  if (data.notes)      rows.push(['Notes', data.notes])

  const html = emailLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;">New reservation 🆕</h1>
    <p style="font-size:14px;color:#555;">You have a new booking:</p>
    ${card(rows)}
    ${btn('View in Dashboard →', `${DASHBOARD_URL}/dashboard/bookings`)}
  `)
  return sendEmail({
    to,
    subject: `New reservation: ${data.guestName} — ${data.date} ${data.time}`,
    html,
    replyTo: data.replyTo,
  })
}

// ─── Template 7: Daily summary (restaurant owner) ─────────────────────────────

export interface DailySummaryBooking {
  time: string
  guestName: string
  partySize: number
  status: string
}

export function sendDailySummaryEmail(to: string, data: {
  restaurantName: string
  date: string
  bookings: DailySummaryBooking[]
}): Promise<void> {
  const total      = data.bookings.length
  const totalPax   = data.bookings.reduce((s, b) => s + b.partySize, 0)
  const pending    = data.bookings.filter(b => b.status === 'pending')
  const rows       = data.bookings.map(b => `
    <tr style="border-bottom:1px solid #e5e5e5;">
      <td style="padding:8px 12px;font-size:13px;">${b.time}</td>
      <td style="padding:8px 12px;font-size:13px;">${b.guestName}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:center;">${b.partySize}</td>
      <td style="padding:8px 12px;font-size:13px;color:${b.status === 'confirmed' ? '#1B7A4A' : b.status === 'pending' ? '#d97706' : '#888'};">${b.status}</td>
    </tr>`).join('')

  const pendingNote = pending.length > 0
    ? `<p style="font-size:13px;color:#d97706;background:#fffbeb;border-left:3px solid #d97706;padding:10px 14px;border-radius:0 6px 6px 0;margin:16px 0;">
        ⚠️ ${pending.length} booking${pending.length > 1 ? 's' : ''} still pending confirmation.
       </p>`
    : ''

  const html = emailLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;">Today's bookings — ${data.date}</h1>
    <p style="font-size:14px;color:#555;"><strong>${data.restaurantName}</strong></p>
    <table cellpadding="0" cellspacing="0" style="margin:12px 0;font-size:13px;">
      <tr><td style="padding-right:24px;color:#888;">Total reservations:</td><td style="font-weight:700;">${total}</td></tr>
      <tr><td style="padding-right:24px;color:#888;">Expected guests:</td><td style="font-weight:700;">${totalPax}</td></tr>
    </table>
    ${pendingNote}
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;margin-top:16px;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="padding:10px 12px;font-size:12px;text-align:left;color:#888;font-weight:600;">TIME</th>
          <th style="padding:10px 12px;font-size:12px;text-align:left;color:#888;font-weight:600;">GUEST</th>
          <th style="padding:10px 12px;font-size:12px;text-align:center;color:#888;font-weight:600;">PAX</th>
          <th style="padding:10px 12px;font-size:12px;text-align:left;color:#888;font-weight:600;">STATUS</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="4" style="padding:16px;text-align:center;color:#aaa;font-size:13px;">No bookings today</td></tr>'}</tbody>
    </table>
    ${btn('Open Dashboard →', `${DASHBOARD_URL}/dashboard`)}
  `)
  return sendEmail({
    to,
    subject: `Today's bookings — ${data.restaurantName} (${data.date})`,
    html,
  })
}

// ─── Template 8: Weekly report (restaurant owner) ─────────────────────────────

export function sendWeeklyReportEmail(to: string, data: {
  restaurantName: string
  periodLabel: string   // "Mar 31 – Apr 6"
  totalBookings: number
  uniqueGuests: number
  noShowRate: string    // "4.2%"
  avgPartySize: string  // "3.1"
  vsLastWeek: number    // delta bookings (can be negative)
  topDay: string
  peakHour: string
}): Promise<void> {
  const delta = data.vsLastWeek >= 0
    ? `<span style="color:#1B7A4A;">↑ ${data.vsLastWeek} vs last week</span>`
    : `<span style="color:#ef4444;">↓ ${Math.abs(data.vsLastWeek)} vs last week</span>`

  const html = emailLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;">Weekly report 📊</h1>
    <p style="font-size:14px;color:#555;"><strong>${data.restaurantName}</strong> · ${data.periodLabel}</p>
    ${card([
      ['Total bookings',   `${data.totalBookings} ${delta}`],
      ['Unique guests',    `${data.uniqueGuests}`],
      ['No-show rate',     data.noShowRate],
      ['Avg party size',   data.avgPartySize],
      ['Best day',         data.topDay],
      ['Peak hour',        data.peakHour],
    ])}
    ${btn('View Full Analytics →', `${DASHBOARD_URL}/dashboard/analytics`)}
  `)
  return sendEmail({
    to,
    subject: `Weekly report — ${data.restaurantName} (${data.periodLabel})`,
    html,
  })
}

// ─── Backwards-compat: email verification ────────────────────────────────────

export async function sendVerificationEmail(
  email: string,
  firstName: string,
  token: string,
): Promise<void> {
  const verifyUrl = `${DASHBOARD_URL}/verify-email?token=${token}`
  const html = emailLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;">Confirm your email</h1>
    <p style="font-size:14px;color:#555;">Hi ${firstName},</p>
    <p style="font-size:14px;color:#555;">Click the link below to verify your email address:</p>
    ${btn('Confirm Email →', verifyUrl)}
    <p style="font-size:12px;color:#aaa;">Link expires in 24 hours. If you didn't create this account, ignore this email.</p>
  `)
  return sendEmail({ to: email, subject: 'Confirm your email — Dinto', html })
}
