# DINTO — Additional Steps 8-10
## Email Notifications + Guest CRM + Terms/Privacy

---

# ═══════════════════════════════════════════════
# STEP 8: EMAIL NOTIFICATIONS (Resend)
# ═══════════════════════════════════════════════

```
## Task: Set up email notifications via Resend for all booking events and restaurant onboarding

### Why Resend:
- Free tier: 3,000 emails/month, 100/day — enough for MVP
- Simple API, great DX, built-in React Email support
- No SMTP config needed

### Setup:
1. npm install resend @react-email/components (in packages/api or apps/api)
2. Env var: RESEND_API_KEY=re_xxxx (get from resend.com dashboard)
3. Env var: EMAIL_FROM=bookings@dinto.pl (or noreply@dinto.pl)
4. Verify domain dinto.pl in Resend dashboard (add DNS records)

### Email types to build:

**1. Welcome — Restaurant Owner Registration**
Trigger: after restaurant owner registers via /register
Subject: "Welcome to Dinto! 🎉"
Content:
- "Hi {firstName},"
- "Welcome to Dinto — the reservation platform for Warsaw restaurants."
- "Next step: Set up your restaurant profile"
- Green CTA button: "Complete Setup" → links to /onboarding
- Footer: Dinto logo, support email, unsubscribe

**2. Restaurant Published**
Trigger: after restaurant owner clicks "Publish" in onboarding step 5
Subject: "Your restaurant is live on Dinto! 🍽️"
Content:
- "{restaurantName} is now visible to guests"
- "Share your booking link: dinto.pl/r/{slug}"
- "Embed the widget on your website"
- CTA: "View Dashboard" → /dashboard

**3. Booking Confirmed — to Guest**
Trigger: booking status changed to confirmed (or created as confirmed)
Subject: "Reservation confirmed — {restaurantName}"
Content:
- "Hi {guestName},"
- "Your table is confirmed:"
- Card: restaurant name, date, time, party size, table (if assigned)
- "Special requests: {specialRequests}" (if any)
- CTA: "View Booking" → deep link to app or web
- "Need to cancel? Reply to this email or cancel in the Dinto app."
- Footer with restaurant address + map link

**4. Booking Reminder — to Guest**
Trigger: cron job, X hours before booking (configurable: 2h, 4h, 24h)
Subject: "Reminder: Dinner at {restaurantName} today at {time}"
Content:
- "Hi {guestName},"
- "Just a reminder about your reservation:"
- Card: restaurant, date, time, party size
- CTA: "Get Directions" → Google Maps link to restaurant address
- "Can't make it? Please cancel so we can free the table for others."

**5. Booking Cancelled — to Guest**
Trigger: booking cancelled (by guest or by restaurant)
Subject: "Reservation cancelled — {restaurantName}"
Content:
- "Hi {guestName},"
- "Your reservation has been cancelled:"
- Card: restaurant, date, time (strikethrough style)
- If cancelled by restaurant: "The restaurant needed to make changes. We apologize."
- CTA: "Book Again" → link to restaurant page in app

**6. New Booking — to Restaurant**
Trigger: new booking created (from app, widget, or dashboard)
Subject: "New reservation: {guestName} — {date} {time}"
Content:
- Card: guest name, phone, email, date, time, party size, table, special requests, source
- CTA: "View in Dashboard" → /dashboard/bookings
- Quick action links: "Confirm" / "Decline" (one-click via API token)

**7. Daily Summary — to Restaurant**
Trigger: cron, every morning at 7:00 AM (if enabled in settings)
Subject: "Today's bookings — {restaurantName} ({date})"
Content:
- "You have {count} reservations today:"
- Table: time, guest, party size, status
- Total guests expected
- Pending bookings that need confirmation (highlighted)
- CTA: "Open Dashboard"

**8. Weekly Report — to Restaurant**
Trigger: cron, every Monday at 8:00 AM (if enabled in settings)
Subject: "Weekly report — {restaurantName} (Mar 31 - Apr 6)"
Content:
- KPIs: total bookings, unique guests, no-show rate, avg party size
- Comparison vs previous week (↑ or ↓)
- Top day, peak hour
- CTA: "View Full Analytics"

### Email template design:

All emails share consistent branding:
- Header: Dinto logo (green)
- Primary button color: #1B7A4A
- Font: system font stack (Arial, Helvetica, sans-serif) — for email compatibility
- Max width: 600px
- Footer: "© 2026 Dinto · Warsaw, Poland · dinto.pl"
- Unsubscribe link in footer

### Backend implementation:

File: apps/api/src/services/email.service.ts

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailParams) {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Dinto <noreply@dinto.pl>',
      to,
      subject,
      html,
      reply_to: replyTo,
    });
  } catch (error) {
    console.error('Email send failed:', error);
    // Don't throw — email failure shouldn't block the main action
  }
}
```

File: apps/api/src/services/email-templates.ts

```typescript
// Each function returns { subject: string, html: string }
export function bookingConfirmedEmail(data: { guestName, restaurant, date, time, partySize, address }) { ... }
export function bookingReminderEmail(data: { ... }) { ... }
export function bookingCancelledEmail(data: { ... }) { ... }
export function welcomeEmail(data: { firstName, loginUrl }) { ... }
export function restaurantPublishedEmail(data: { restaurantName, dashboardUrl }) { ... }
export function newBookingNotificationEmail(data: { ... }) { ... }
export function dailySummaryEmail(data: { restaurantName, date, bookings }) { ... }
export function weeklyReportEmail(data: { restaurantName, period, kpis }) { ... }
```

HTML templates: clean, inline CSS, mobile-responsive, 600px max-width.
Use simple HTML tables for layout (not CSS grid/flex — email clients don't support them).

### Language support:
Each email template has 4 language variants (en, pl, ru, uk).
Language determined by:
- Guest emails: guest's language preference (from app) or restaurant's default language
- Restaurant emails: owner's language preference

### Cron jobs (add to existing cron system):

```typescript
// Booking reminder — runs every hour
// Find bookings where: date+time is X hours from now, status=confirmed, reminderSent=false
// Send reminder email + SMS, mark reminderSent=true

// Daily summary — runs at 7:00 AM
// For each restaurant with dailySummary enabled:
// Query today's bookings, send summary email

// Weekly report — runs Monday 8:00 AM
// For each restaurant with weeklyReport enabled:
// Aggregate last 7 days, send report email
```

Add to Booking model:
```prisma
reminderSent    Boolean  @default(false)
confirmEmailSent Boolean @default(false)
```

### Dashboard Settings integration:
The Notifications tab already has toggles for:
- Email on new booking ✓
- Email on cancellation ✓
- Daily summary ✓
- Weekly report ✓

Wire these toggles to actually control email sending.
Add:
- Reminder timing: dropdown (2 hours / 4 hours / 24 hours / None)
- Reply-to email: input (default: restaurant email)

### API:
```
POST /api/emails/test  body: { type, to }  → send test email (owner only)
```

Build all 8 email types with HTML templates. 4 languages each. Working cron jobs.
Do NOT use React Email server components — use plain HTML string templates for simplicity.
```

---

# ═══════════════════════════════════════════════
# STEP 9: GUEST CRM
# ═══════════════════════════════════════════════

```
## Task: Build full Guest CRM page at /dashboard/guests

### Concept:
Every guest who makes a booking becomes a contact in the restaurant's CRM.
Track visit history, preferences, VIP status, notes, no-show rate.
Help restaurants build relationships with returning guests.

### Data model:

The Guest data is derived from Bookings. We don't create a separate guest model —
instead we aggregate from existing User + Booking data.

But we DO need a restaurant-specific guest profile for notes and tags:

```prisma
model GuestProfile {
  id           String   @id @default(uuid())
  restaurantId String
  guestUserId  String?  // linked app user (nullable — phone-only guests)
  phone        String   // primary identifier
  email        String?
  firstName    String
  lastName     String?
  isVip        Boolean  @default(false)
  tags         String[] // ["regular", "birthday", "allergies", "window-seat"]
  notes        String?  // free text notes from staff
  noShowCount  Int      @default(0)
  totalVisits  Int      @default(0)
  totalSpent   Float    @default(0) // if POS connected
  lastVisitAt  DateTime?
  firstVisitAt DateTime?
  language     String?  // preferred language
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  restaurant   Restaurant @relation(fields: [restaurantId], references: [id])

  @@unique([restaurantId, phone])
  @@index([restaurantId, isVip])
  @@index([restaurantId, totalVisits])
}
```

### Auto-population:
When a booking is created, upsert GuestProfile:
- Find by restaurantId + phone
- If exists: update totalVisits, lastVisitAt
- If not: create with data from booking
- On no-show: increment noShowCount

### API:

```
GET    /api/restaurants/:id/guests?page=1&search=&vip=&sort=visits_desc&tag=
       → { guests: [...], total, stats: { totalGuests, vipCount, avgVisits, repeatRate } }

GET    /api/restaurants/:id/guests/:guestId
       → { guest, bookingHistory: [...], stats: { totalVisits, noShows, avgPartySize, favTime } }

PUT    /api/restaurants/:id/guests/:guestId
       body: { isVip, tags, notes }
       → { guest }

POST   /api/restaurants/:id/guests/:guestId/merge
       body: { mergeWithId }  // merge duplicate profiles
       → { guest }
```

### Frontend: /dashboard/guests/page.tsx

**Stats bar (top):**
4 cards:
- Total guests: 198
- VIP guests: 12 (⭐)
- Repeat rate: 34% (guests with 2+ visits)
- Avg visits per guest: 2.4

**Filters:**
- Search: name, phone, email
- VIP only toggle
- Tags filter (multi-select)
- Sort: Most visits / Recent / Alphabetical / Most no-shows
- Date range: first/last visit range

**Guest Table:**
Columns:
1. Guest: avatar (initials) + name + phone below
2. Visits: number + last visit date
3. VIP: star icon (clickable toggle)
4. No-shows: number (red if > 2)
5. Tags: colored pill badges
6. Last visit: relative date
7. Actions: View / Edit / Merge

**Row click → Guest Detail Drawer (slide-in from right):**

**Header:** Avatar + Name + VIP badge + phone + email
**Quick actions:** Call / SMS / Email buttons

**Tabs: History | Notes | Details**

**History tab:**
- Timeline of all bookings at this restaurant
- Each entry: date, time, party size, table, status badge
- Color coded: confirmed (green), completed (gray), cancelled (red), no-show (amber)
- Stats: "12 total visits · First visit: Jan 15, 2026 · 1 no-show"

**Notes tab:**
- Textarea for staff notes
- Example: "Prefers window seat. Allergic to shellfish. Celebrating anniversary on Apr 20."
- Auto-save (debounced)
- Tags editor: add/remove tags
  Available tags: regular, birthday, allergies, window-seat, quiet-table, high-spender, group-booker
  Custom tags: type and press enter

**Details tab:**
- Phone, email
- Preferred language
- Average party size
- Most booked time
- Total visits / no-show rate %
- First/last visit dates
- Linked app account (if user has Dinto app)

### Auto-tags (system-generated):
- "regular" — 5+ visits
- "new" — first visit
- "no-show-risk" — 2+ no-shows
- "high-spender" — if POS connected and total > X zł
- "group-booker" — avg party size > 6

### Export:
"Export Guests CSV" button:
Name, Phone, Email, VIP, Total Visits, No-shows, Tags, Last Visit, First Visit

### i18n:
```json
{
  "guests": {
    "title": "Guests",
    "subtitle": "Your guest database and relationship manager",
    "totalGuests": "Total Guests",
    "vipGuests": "VIP Guests",
    "repeatRate": "Repeat Rate",
    "avgVisits": "Avg Visits",
    "search": "Search by name, phone, or email...",
    "vipOnly": "VIP only",
    "allGuests": "All guests",
    "visits": "visits",
    "lastVisit": "Last visit",
    "firstVisit": "First visit",
    "noShows": "No-shows",
    "vip": "VIP",
    "tags": "Tags",
    "notes": "Notes",
    "history": "Booking History",
    "details": "Details",
    "addNote": "Add a note about this guest...",
    "addTag": "Add tag...",
    "markVip": "Mark as VIP",
    "removeVip": "Remove VIP",
    "merge": "Merge profiles",
    "mergeDesc": "Combine duplicate guest profiles",
    "exportGuests": "Export Guests",
    "noGuests": "No guests yet",
    "noGuestsDesc": "Guest profiles are created automatically when bookings are made.",
    "avgPartySize": "Avg party size",
    "favTime": "Favorite time",
    "totalNoShows": "Total no-shows",
    "linkedAccount": "Dinto app account",
    "call": "Call",
    "sendSms": "Send SMS",
    "sendEmail": "Send Email",
    "tagLabels": {
      "regular": "Regular",
      "new": "New",
      "birthday": "Birthday",
      "allergies": "Allergies",
      "window-seat": "Window seat",
      "quiet-table": "Quiet table",
      "high-spender": "High spender",
      "group-booker": "Group booker",
      "no-show-risk": "No-show risk"
    }
  }
}
```

Build the full CRM page with detail drawer, booking history, notes, tags, VIP toggle, auto-tags, and CSV export.
Also: add the auto-population logic in the booking creation flow (upsert GuestProfile on every new booking).
```

---

# ═══════════════════════════════════════════════
# STEP 10: TERMS OF SERVICE + PRIVACY POLICY + LEGAL PAGES
# ═══════════════════════════════════════════════

```
## Task: Create Terms of Service, Privacy Policy, and Cookie Policy pages

### Context:
Required for:
- Apple App Store submission (mandatory)
- Google Play submission (mandatory)
- GDPR compliance (EU/Poland)
- Restaurant trust / legal protection

### Pages to create:

**1. /terms — Terms of Service**
**2. /privacy — Privacy Policy**
**3. /cookies — Cookie Policy**

These are PUBLIC pages — no auth required. Clean layout without sidebar.
Use a simple centered layout: max-width 800px, white background, good typography.

### Layout:
File: apps/web-dashboard/app/(legal)/layout.tsx

```tsx
// Clean layout:
// - Dinto logo (top center, links to home)
// - Content area: max-w-3xl, prose styling
// - Footer: "© 2026 Dinto · Warsaw, Poland"
// - Language switcher (top right)
```

### Terms of Service content:
File: apps/web-dashboard/app/(legal)/terms/page.tsx

Generate a real Terms of Service for Dinto. Include:

1. **Introduction** — Dinto is a restaurant reservation platform operated in Warsaw, Poland
2. **Definitions** — Platform, User, Guest, Restaurant, Booking, Service
3. **Account Registration** — email required, password security, age 16+
4. **For Guests:**
   - Booking is a reservation request, confirmed by restaurant
   - Cancellation policy: cancel at least 2 hours before
   - No-show policy: repeated no-shows may result in account restrictions
   - Reviews must be honest and based on actual visits
5. **For Restaurants:**
   - Subscription plans and billing
   - Restaurant is responsible for honoring confirmed bookings
   - Content (photos, descriptions) must be accurate
   - Data of guests must be handled per privacy policy
6. **Payments** — Stripe processes payments, Dinto doesn't store card data
7. **Intellectual Property** — Dinto owns the platform, users own their content
8. **Limitation of Liability** — Platform connects guests and restaurants, not responsible for experience
9. **Termination** — either party can terminate, data deletion upon request
10. **Governing Law** — Polish law, courts of Warsaw
11. **Changes** — Dinto may update terms, users notified via email
12. **Contact** — legal@dinto.pl

Last updated: April 2026

### Privacy Policy content:
File: apps/web-dashboard/app/(legal)/privacy/page.tsx

GDPR-compliant privacy policy. Include:

1. **Data Controller** — Dinto, Warsaw, Poland, contact: privacy@dinto.pl
2. **Data We Collect:**
   - Account data: name, email, phone, password (hashed)
   - Booking data: restaurant, date, time, party size, special requests
   - Usage data: pages visited, features used, device info
   - Restaurant data: name, address, photos, menu, working hours
   - Review data: text, rating, date
   - Location data: only if permission granted (for nearby restaurants)
3. **How We Use Data:**
   - Provide and improve the service
   - Process bookings and send notifications
   - Analytics and platform improvement
   - Communication (email, SMS, push)
4. **Legal Basis (GDPR Art. 6):**
   - Contract performance (bookings)
   - Legitimate interest (analytics, security)
   - Consent (marketing emails, push notifications)
5. **Data Sharing:**
   - Restaurant receives guest name, phone, party size for bookings
   - Stripe for payment processing
   - Twilio for SMS
   - Resend for email
   - Google Maps for reviews integration
   - No data sold to third parties
6. **Data Retention:**
   - Account data: until deletion requested
   - Booking data: 3 years (legal requirement)
   - Analytics: 12 months anonymized
7. **Your Rights (GDPR):**
   - Access, rectification, erasure, portability, restriction, objection
   - Contact: privacy@dinto.pl
   - Complaint to UODO (Polish data protection authority)
8. **Cookies** — link to /cookies
9. **Security** — HTTPS, encrypted passwords, access controls
10. **Children** — Service not intended for under 16
11. **Changes** — Notify via email/app
12. **Contact** — privacy@dinto.pl

### Cookie Policy:
File: apps/web-dashboard/app/(legal)/cookies/page.tsx

1. **What are cookies** — brief explanation
2. **Cookies we use:**
   - Essential: auth session, language preference, theme preference
   - Analytics: (if you add Vercel Analytics or PostHog later)
   - No advertising cookies
3. **Managing cookies** — browser settings
4. **Contact** — privacy@dinto.pl

### Links to legal pages:

Add footer links on:
- Login page: "Terms of Service · Privacy Policy"
- Register page: checkbox "I agree to the Terms of Service and Privacy Policy"
- Onboarding: footer links
- Mobile app: Profile → Terms, Privacy
- Dashboard sidebar footer: small "Terms · Privacy" links
- Billing page: "See our Terms of Service" link

### Language support:
All 3 pages need 4 language versions (EN, PL, RU, UK).
Content in translation files:
```
/messages/en.json → "legal": { "terms": { ... }, "privacy": { ... }, "cookies": { ... } }
/messages/pl.json → same structure in Polish
/messages/ru.json → same in Russian
/messages/uk.json → same in Ukrainian
```

The Polish version is the legally binding one (Polish law).
EN/RU/UK are convenience translations with note: "This is a translation. The Polish version prevails."

### Register page update:
Add required checkbox before "Register" button:
☐ I agree to the [Terms of Service] and [Privacy Policy]
Both links open in new tab. Checkbox required to submit.

Build all 3 legal pages with proper content, 4 languages, clean layout, and add links everywhere needed.
```

---

# UPDATED EXECUTION ORDER (ALL 10 STEPS)

| Step | What | Time | Priority |
|------|------|------|----------|
| 1 | Rebrand Dinto + critical fixes | 15 min | 🔴 |
| 2 | Language switcher + theme toggle | 15 min | 🔴 |
| 3 | Google Reviews integration | 20 min | 🟡 |
| 4 | Quick Connect / POS / API keys | 20 min | 🟡 |
| 5 | Manual booking + CSV export + SMS templates | 20 min | 🟡 |
| 6 | Polish — search, breadcrumbs, notifications | 20 min | 🟢 |
| 7 | Vercel fix + deployment | 10 min | 🔴 |
| 8 | Email notifications (Resend) — 8 email types | 20 min | 🟡 |
| 9 | Guest CRM — full page with history, VIP, tags | 20 min | 🟡 |
| 10 | Terms + Privacy + Cookies (legal pages) | 10 min | 🔴 for stores |

**Total: ~2.5-3 hours Claude Code time**

### Prerequisites:
- [ ] Resend API key (resend.com — free tier)
- [ ] Domain dinto.pl verified in Resend for email sending
- [ ] Google Places API key
- [ ] Stripe products created (Pro 149 zł, Business 349 zł)
- [ ] Decide legal entity name for Terms/Privacy
