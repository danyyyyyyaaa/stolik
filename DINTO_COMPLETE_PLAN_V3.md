# DINTO — Complete Enhancement Plan v3
## All fixes + new features + Claude Code prompts

---

# ═══════════════════════════════════════════════
# STEP 1: REBRAND STOLIK → DINTO + CRITICAL FIXES
# ═══════════════════════════════════════════════

```
## Task: Rebrand Stolik to Dinto everywhere + fix critical bugs

### Rebrand: Stolik → Dinto
Find and replace across entire project:

1. Dashboard (apps/web-dashboard):
   - All text: "Stolik" → "Dinto" 
   - Logo text in sidebar: already says "Dinto" ✓
   - Page titles: "Dinto Dashboard", "Dinto Admin"
   - Meta tags, og:title, favicon alt text
   - All i18n files (/messages/en.json, pl.json, ru.json, uk.json): "Stolik" → "Dinto"
   - SMS templates: "stolik.pl" → "dinto.pl" (or whatever the domain is)
   - Billing page: any mentions
   - Onboarding: any mentions
   - Footer/copyright: "© 2026 Dinto"

2. Backend (packages/api or apps/api):
   - Email templates if any
   - SMS text templates
   - Seed data
   - API response messages

3. DO NOT touch:
   - GitHub repo name (keep danyyyyyyyyaaa/stolik for now)
   - Railway/Vercel project names (can rename later)
   - Database names

### Fix 1: Analytics crash
File: apps/web-dashboard/app/dashboard/analytics/page.tsx

The bookingsByStatus chart crashes because items may have `status` instead of `name`.
Fix ALL places where `.replace('_', ' ')` is called:

```typescript
// Find pattern: item.name.replace('_', ' ')
// Replace with: (item.name || item.status || item.label || 'unknown').replace(/_/g, ' ')
```

Also wrap the entire chart render in an error boundary or optional chaining:
```typescript
{analytics?.bookingsByStatus?.map((item) => (
  // render chart segment
))}
```

### Fix 2: Menu page "Request failed"
Check the endpoint the menu page calls. Likely the backend route doesn't exist yet or returns 500.

In the backend, ensure this route exists and works:
```
GET /api/restaurants/:id/menu
```

If the restaurant has no menu categories, return:
```json
{ "categories": [] }
```

NOT an error. The frontend should then show EmptyState:
"No menu categories yet. Create your first category to get started."
with an "Add Category" button.

### Fix 3: Tables page — build full CRUD
File: apps/web-dashboard/app/dashboard/tables/page.tsx

Replace the stub with a full working page:

**Layout:**
- PageHeader: "Tables" with "Add Table" button
- Grid of table cards (3 columns desktop, 2 tablet, 1 mobile)

**Table Card:**
- Table name (bold)
- Capacity: "2-4 guests"
- Zone badge: Indoor (green), Outdoor (blue), Bar (amber), Terrace (purple), Private (gray)
- Status indicator: green dot = available
- Edit / Delete action buttons

**Add/Edit Table Modal:**
- Name input (e.g., "Table 1", "Window Seat 3")
- Min guests (number, default 1)
- Max guests (number, default 4)
- Zone dropdown: Indoor / Outdoor / Bar / Terrace / Private
- Save / Cancel buttons

**Backend endpoints (create if missing):**
```
GET    /api/restaurants/:id/tables       → { tables: [...] }
POST   /api/restaurants/:id/tables       → 201 { table }
PUT    /api/restaurants/:id/tables/:tid  → 200 { table }
DELETE /api/restaurants/:id/tables/:tid  → 204
```

**Summary at bottom:**
"12 tables · Total capacity: 48 guests"

Build full CRUD with optimistic updates. No stubs.
```

---

# ═══════════════════════════════════════════════
# STEP 2: LANGUAGE SWITCHER + LIGHT THEME
# ═══════════════════════════════════════════════

```
## Task: Language switcher everywhere + light/dark theme

### Language Switcher
Component: apps/web-dashboard/components/shared/LanguageSwitcher.tsx

Dropdown button showing current language flag + code:
🇬🇧 EN | 🇵🇱 PL | 🇷🇺 RU | 🇺🇦 UK

Place it in:
1. Dashboard header (top bar, right side)
2. Admin header
3. Auth pages (login, register, forgot-password) — top right
4. Onboarding page — top right

On change:
- Switch next-intl locale
- Save to localStorage('dinto-language')
- If logged in: PUT /api/auth/me { language: "pl" }
- Re-render all text immediately

### Theme Toggle
Install: npm install next-themes

Component: apps/web-dashboard/components/shared/ThemeToggle.tsx

Three options: Light ☀️ | Dark 🌙 | System 💻

**Light theme (current default):**
- Sidebar: #1A1A1A
- Content bg: #FAFAF5
- Cards: #FFFFFF
- Text: #1A1A1A
- Borders: #E5E7EB

**Dark theme:**
- Sidebar: #0F0F0F
- Content bg: #111111
- Cards: #1E1E1E
- Text: #E5E5E5
- Borders: #333333
- Input bg: #1E1E1E, border #444
- Green stays: #1B7A4A (works on both)

Implementation:
1. ThemeProvider in root layout
2. CSS variables in globals.css:
   :root { --bg: #FAFAF5; --card: #FFFFFF; --text: #1A1A1A; }
   .dark { --bg: #111111; --card: #1E1E1E; --text: #E5E5E5; }
3. Replace all hardcoded colors with var(--bg), var(--card), var(--text)
4. Toggle in sidebar footer, next to collapse button

### Header layout (right side):
[ 🔍 Search ] [ 🌐 EN ▾ ] [ ☀️/🌙 ] [ 🔔 3 ] [ MK avatar ▾ ]

### Verify all translations:
Switch to each language and check every page. Missing keys → add to all 4 JSONs.
```

---

# ═══════════════════════════════════════════════
# STEP 3: GOOGLE REVIEWS INTEGRATION
# ═══════════════════════════════════════════════

```
## Task: Pull reviews from Google Maps and display in dashboard

### How it works:
1. Restaurant owner enters their Google Place ID in Settings
2. Backend fetches reviews from Google Places API periodically
3. Dashboard shows Google reviews alongside in-app reviews
4. Filter: show All / Top (4-5★) / Average (3★) / Low (1-2★)

### Settings page — add Google Reviews section:
In Settings > General tab, add section at bottom:

**Google Maps Integration**
- Google Place ID input (text field)
- "How to find your Place ID" help link → opens tooltip/modal:
  "Go to Google Maps → Find your restaurant → Copy the Place ID from the URL"
- "Connect" button → verifies Place ID via API and saves
- Status: Connected ✓ / Not connected
- "Sync Reviews" button → manually trigger review fetch
- Auto-sync: toggle (daily automatic fetch)

### Backend:

**Model:**
```prisma
model GoogleReview {
  id            String   @id @default(uuid())
  restaurantId  String
  googleReviewId String  @unique
  authorName    String
  authorPhoto   String?
  rating        Int      // 1-5
  text          String?
  publishedAt   DateTime
  language      String?  // detected language
  fetchedAt     DateTime @default(now())

  restaurant    Restaurant @relation(fields: [restaurantId], references: [id])
  
  @@index([restaurantId, rating])
}
```

Add to Restaurant model:
```prisma
googlePlaceId     String?
googleSyncEnabled Boolean @default(false)
lastGoogleSync    DateTime?
```

**API endpoints:**
```
PUT  /api/restaurants/:id/google-place  body: { placeId }  → verify + save
POST /api/restaurants/:id/google-sync   → fetch reviews now → { count: 15 }
GET  /api/restaurants/:id/reviews       → { 
  appReviews: [...],
  googleReviews: [...],
  stats: { 
    avgRating: 4.3, 
    totalCount: 42, 
    googleCount: 28, 
    appCount: 14,
    distribution: { 5: 20, 4: 12, 3: 5, 2: 3, 1: 2 }
  }
}
```

**Google Places API integration:**
```typescript
// GET https://maps.googleapis.com/maps/api/place/details/json
// ?place_id=ChIJ...&fields=reviews,rating,user_ratings_total&key=API_KEY

// Env var: GOOGLE_PLACES_API_KEY
// Each review: author_name, rating, text, time, language, profile_photo_url
```

**Cron job (runs daily at 3 AM):**
For each restaurant with googleSyncEnabled:
1. Fetch reviews from Google Places API
2. Upsert into GoogleReview table (skip duplicates by googleReviewId)
3. Update lastGoogleSync timestamp

### Frontend — Reviews page update:

**Tabs at top: All Reviews | App Reviews | Google Reviews**

**Filter chips:** All | ⭐5 | ⭐4 | ⭐3 | ⭐2 | ⭐1

**Sort:** Newest | Oldest | Highest | Lowest

**Review card — Google variant:**
- Google "G" icon badge
- Author name + photo
- Star rating
- Review text
- Date
- Language badge (if detected)
- NO reply button (can't reply to Google reviews from dashboard)

**Review card — App variant (existing):**
- Dinto logo badge
- Author name
- Star rating
- Review text
- Date
- Reply button + reply section

**Stats section (top):**
- Combined avg rating: 4.3 (42 reviews)
- Breakdown: "14 from Dinto app · 28 from Google Maps"
- Distribution bars show combined data
- Toggle: "Show Google only" / "Show App only" / "Show All"

### i18n:
```json
{
  "reviews": {
    "googleReviews": "Google Reviews",
    "appReviews": "Dinto Reviews",
    "allReviews": "All Reviews",
    "fromGoogle": "from Google Maps",
    "fromApp": "from Dinto",
    "connectGoogle": "Connect Google Maps",
    "placeId": "Google Place ID",
    "howToFind": "How to find your Place ID",
    "syncNow": "Sync Reviews",
    "lastSync": "Last synced",
    "autoSync": "Auto-sync daily",
    "connected": "Connected",
    "notConnected": "Not connected",
    "top": "Top",
    "average": "Average",
    "low": "Low"
  }
}
```

Build everything. Google API integration, cron, combined reviews UI.
Requires GOOGLE_PLACES_API_KEY env var in Railway.
```

---

# ═══════════════════════════════════════════════
# STEP 4: QUICK CONNECT — POS / TERMINAL INTEGRATION
# ═══════════════════════════════════════════════

```
## Task: Build Quick Connect — one-click POS/Terminal integration page

### Concept:
Restaurant owner can connect their existing POS system to Dinto in a few clicks.
This syncs bookings bidirectionally and shows real-time table status.

### Dashboard page: /dashboard/integrations (NEW)
Add to sidebar: 🔗 Integrations (between Settings and Billing)

### Layout:

**Header:** "Integrations" — "Connect your restaurant systems"

**Available integrations grid (cards):**

1. **Poster POS** (Primary — we identified this as most viable)
   - Logo + description: "Sync tables, orders, and availability"
   - Status: Not Connected / Connected ✓ / Error ⚠️
   - "Connect" button → opens setup modal
   
2. **Dinto Terminal** (our tablet app)
   - Description: "Manage walk-ins and bookings from tablet"
   - Status: Connected / Not Connected
   - "Generate QR Code" → shows QR for tablet to scan and connect
   
3. **iiko** (popular in Eastern Europe)
   - "Coming Soon" badge
   - "Notify me" button → saves email interest

4. **R-Keeper**
   - "Coming Soon" badge

5. **Custom API**
   - Description: "Connect any system via REST API"
   - "Get API Key" button → generates API key
   - Shows: API endpoint URL, API key, documentation link

### Poster POS Setup Modal:

Step 1: Enter Poster credentials
- Poster Account Name (subdomain)
- API Token (from Poster dashboard)
- "How to get your API token" expandable help

Step 2: Test connection
- "Test Connection" button → calls Poster API to verify
- Shows: ✓ Connected to "Restaurant Różana" on Poster

Step 3: Configure sync
- Toggle: Sync tables (Poster → Dinto)
- Toggle: Sync bookings (Dinto → Poster)  
- Toggle: Real-time table status
- Sync interval: Every 5 min / 15 min / 30 min / Manual

Step 4: Confirm
- Summary of what will sync
- "Activate Integration" button

### Custom API Key section:

```typescript
// Model:
model ApiKey {
  id           String   @id @default(uuid())
  restaurantId String
  key          String   @unique // generated: dk_live_xxxxx
  name         String   @default("Default")
  lastUsedAt   DateTime?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id])
}
```

**API Key display:**
- Key shown once on creation (masked after: dk_live_****xxxx)
- Endpoint: https://stolik-production.up.railway.app/api/v1/
- Quick reference:
  ```
  GET  /api/v1/bookings?date=2026-04-05    — list bookings
  POST /api/v1/bookings                     — create booking
  PUT  /api/v1/bookings/:id/status          — update status
  GET  /api/v1/tables                       — list tables
  PUT  /api/v1/tables/:id/status            — update table status
  ```
- "View Full Documentation" link
- "Regenerate Key" button (with confirmation)

### Dinto Terminal QR Connect:

When "Generate QR Code" clicked:
1. Generate a short-lived token (expires in 10 minutes)
2. Show QR code containing: `dinto://connect?token=xxxx&restaurantId=yyyy`
3. When tablet app scans → authenticates and links to restaurant
4. Dashboard shows: "Terminal connected ✓" with device name

### Backend:

```
POST   /api/integrations/poster/test     body: { accountName, apiToken } → { success, restaurantName }
POST   /api/integrations/poster/connect  body: { accountName, apiToken, config } → { integration }
DELETE /api/integrations/poster           → 204
GET    /api/integrations                  → { poster: {...}, terminal: {...}, apiKeys: [...] }

POST   /api/api-keys                     → 201 { key } (shown once)
GET    /api/api-keys                     → { keys: [{id, name, lastUsed, created, keyPreview}] }
DELETE /api/api-keys/:id                 → 204

POST   /api/terminal/generate-qr         → { token, qrUrl, expiresAt }
GET    /api/terminal/status              → { connected, deviceName, lastSeen }
```

### Integration model:
```prisma
model Integration {
  id           String   @id @default(uuid())
  restaurantId String
  provider     String   // poster, iiko, rkeeper, custom
  credentials  Json     // encrypted: { accountName, apiToken }
  config       Json     // { syncTables, syncBookings, interval }
  status       String   @default("active") // active, error, disconnected
  lastSyncAt   DateTime?
  createdAt    DateTime @default(now())
  
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id])
  
  @@unique([restaurantId, provider])
}
```

### i18n:
```json
{
  "integrations": {
    "title": "Integrations",
    "subtitle": "Connect your restaurant systems",
    "connect": "Connect",
    "connected": "Connected",
    "notConnected": "Not connected",
    "comingSoon": "Coming Soon",
    "notifyMe": "Notify me",
    "disconnect": "Disconnect",
    "testConnection": "Test Connection",
    "connectionSuccess": "Successfully connected",
    "posterPOS": "Poster POS",
    "posterDesc": "Sync tables, orders, and availability with Poster",
    "dintoTerminal": "Dinto Terminal",
    "terminalDesc": "Manage walk-ins and bookings from tablet",
    "generateQR": "Generate QR Code",
    "scanQR": "Scan this QR code with your tablet",
    "customAPI": "Custom API",
    "apiDesc": "Connect any system via REST API",
    "getApiKey": "Get API Key",
    "apiKey": "API Key",
    "apiEndpoint": "API Endpoint",
    "regenerateKey": "Regenerate Key",
    "viewDocs": "View Documentation",
    "syncTables": "Sync tables",
    "syncBookings": "Sync bookings",
    "realTimeStatus": "Real-time table status",
    "syncInterval": "Sync interval",
    "activate": "Activate Integration",
    "qrExpires": "QR code expires in {minutes} minutes"
  }
}
```

Build the full Integrations page with Poster POS flow, QR terminal connect, and API key management.
Poster API calls can be mocked for now — the UI and flow must be complete.
```

---

# ═══════════════════════════════════════════════
# STEP 5: MANUAL BOOKING + EXPORT + SMS TEMPLATES
# ═══════════════════════════════════════════════

```
## Task: Manual booking creation + CSV export + SMS template editor

### 1. Manual Booking Modal

Component: apps/web-dashboard/components/bookings/NewBookingModal.tsx

Trigger: "New Booking" button on Overview and Bookings pages

Fields:
- Guest name * (text)
- Phone * (+48 prefix, masked input)
- Email (optional)
- Date * (date picker, default today)
- Time * (dropdown: 30-min slots from restaurant working hours)
- Party size * (stepper - 2 +, range 1-20)
- Table (dropdown: available tables for date/time/size, or "Auto-assign")
- Special requests (textarea)
- Send SMS notification (toggle, default ON)

Backend:
POST /api/bookings → 201 { booking }
Body: { restaurantId, guestName, guestPhone, guestEmail, date, time, partySize, tableId, specialRequests, source: "dashboard", sendSms: true }

On success: toast "Booking DN-XXXX created", refresh list, close modal.

Available tables check:
GET /api/restaurants/:id/tables/available?date=2026-04-10&time=19:00&partySize=4
Returns tables where: not booked at that time AND capacity fits.

### 2. CSV Export

Utility: apps/web-dashboard/lib/export.ts
```typescript
export function exportToCSV(data: any[], filename: string, columns: {key: string, label: string}[]) {
  const BOM = '\ufeff'; // UTF-8 BOM for Excel
  const header = columns.map(c => c.label).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key] ?? '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')
  );
  const csv = BOM + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `dinto_${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}
```

Add "Export CSV" button to: Bookings, Admin Restaurants, Admin Users, Admin Partners, Reviews.

### 3. SMS Template Editor

Add tab to Settings: General | Hours | Notifications | SMS Templates | Danger Zone

Model:
```prisma
model SmsTemplate {
  id           String   @id @default(uuid())
  restaurantId String
  type         String   // booking_confirmed, booking_reminder, booking_cancelled, booking_manual
  language     String   // en, pl, ru, uk
  template     String
  isActive     Boolean  @default(true)
  updatedAt    DateTime @updatedAt
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id])
  @@unique([restaurantId, type, language])
}
```

UI:
- Template type dropdown: Confirmed / Reminder / Cancelled / Manual Booking
- Language tabs: EN | PL | RU | UK
- Textarea with template text
- Available variables chips (clickable to insert): {guestName} {restaurant} {date} {time} {partySize} {bookingCode}
- Live preview panel: shows rendered example with sample data
- "Reset to default" / "Save" buttons
- "Send Test SMS" button → sends to owner's phone

Default templates (PL example):
- confirmed: "Cześć {guestName}! Rezerwacja w {restaurant} potwierdzona: {date} o {time}, {partySize} os. Do zobaczenia! — Dinto"
- reminder: "Przypomnienie: Dziś o {time} masz rezerwację w {restaurant} na {partySize} os. Do zobaczenia!"
- cancelled: "Rezerwacja w {restaurant} ({date}, {time}) została anulowana. Zarezerwuj ponownie na dinto.pl"

Build all three features fully.
```

---

# ═══════════════════════════════════════════════
# STEP 6: POLISH — SEARCH, BREADCRUMBS, NOTIFICATIONS, MOBILE
# ═══════════════════════════════════════════════

```
## Task: Final polish — search, breadcrumbs, notification bell, badges, mobile, performance

### 1. Global Search (Cmd+K)
Component: apps/web-dashboard/components/shared/GlobalSearch.tsx

- Keyboard shortcut: Cmd+K (Mac) / Ctrl+K (Windows)
- Modal overlay with search input
- Search across: bookings (name, phone, code), menu items, staff
- Admin: also search restaurants, users
- Results grouped by category with icons
- Click result → navigate to detail page
- Recent searches saved to localStorage

### 2. Breadcrumbs
Component: apps/web-dashboard/components/shared/Breadcrumbs.tsx

Show below PageHeader on every page:
- Dashboard > Overview
- Dashboard > Calendar > April 5, 2026
- Dashboard > Settings > SMS Templates
- Admin > Restaurants > Różana

### 3. Notification Bell
Component: apps/web-dashboard/components/shared/NotificationBell.tsx

Bell icon in header with red badge count.
Dropdown shows last 10 notifications:
- 🔔 New booking: "Jan Kowalski — Apr 10, 19:00, 4 guests"
- ❌ Cancelled: "Anna Nowak cancelled Apr 8 booking"
- ⭐ New review: "5★ review from Marcin W."
- ⚠️ No-show: "Danya test didn't show up"

Each notification: icon, text, time ago, read/unread dot.
"Mark all as read" link.
"View all" → /dashboard/notifications (optional full page).

Data source: existing Socket.io notifications + GET /api/notifications endpoint.

### 4. Sidebar Badges
Add small count badges to sidebar items:
- Bookings: amber badge with pending count
- Reviews: blue badge with unread count
- Staff: amber badge with pending invites

### 5. Mobile Responsive
Test and fix for 375px width:
- Sidebar: hidden by default, hamburger button in header
- DataTables: horizontal scroll wrapper
- Calendar month view: switch to list on <768px
- Modals: full-screen on mobile
- Forms: single column
- Stats cards: 2 columns on tablet, 1 on mobile
- Chart cards: full width, smaller height

### 6. Performance
- React.lazy() for admin pages
- Debounce search inputs (300ms)
- next/image for restaurant photos
- Add loading="lazy" to images

### 7. Page Titles
Dynamic titles: "{Page} — Dinto"
Favicon: Dinto logo (green fork/spoon icon or "D" in green circle)

### 8. Print Bookings
"Print" button on Bookings page:
- Opens print dialog
- Clean layout: restaurant name, date range, table of bookings
- No sidebar, no header — just the data
- Suitable for host stand printout

### 9. Keyboard Shortcuts
- Cmd+K → Global search
- Cmd+N → New booking modal
- Cmd+/ → Toggle sidebar
- Escape → Close any modal

Build all 9 items. Focus on 1-5 first (critical UX), 6-9 are polish.
```

---

# ═══════════════════════════════════════════════
# STEP 7: VERCEL DEPLOYMENT + FINAL QA
# ═══════════════════════════════════════════════

```
## Task: Fix Vercel deployment and run final QA

### Vercel Fix:

1. Check/create vercel.json in apps/web-dashboard/:
```json
{
  "framework": "nextjs"
}
```

2. In Vercel Dashboard → stolik-dashboard → Settings → General:
   - Root Directory: apps/web-dashboard
   - Build Command: next build
   - Install Command: npm install
   - Node.js Version: 20.x

3. Environment variables in Vercel:
   - NEXT_PUBLIC_API_URL=https://stolik-production.up.railway.app
   - NEXT_PUBLIC_SOCKET_URL=https://stolik-production.up.railway.app
   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
   - NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=... (for reviews)

4. Commit all changes and push. Verify Vercel deploys.

### Final QA Checklist:

**Every page — check:**
- [ ] Loads without errors
- [ ] Loading skeleton shows while fetching
- [ ] Empty state shows when no data
- [ ] Error state with retry on API failure
- [ ] Language switch works (all 4)
- [ ] Theme switch works (light/dark)
- [ ] Mobile responsive (375px)

**Specific pages:**
- [ ] /login — works, redirects to /dashboard after login
- [ ] /register — works
- [ ] /onboarding — 5 steps complete, publish works
- [ ] /dashboard — overview loads with stats
- [ ] /dashboard/calendar — month/week/day views
- [ ] /dashboard/bookings — table with filters, new booking modal
- [ ] /dashboard/tables — CRUD works
- [ ] /dashboard/analytics — charts render (no crash)
- [ ] /dashboard/menu — loads (empty state or categories)
- [ ] /dashboard/reviews — app + google reviews tabs
- [ ] /dashboard/staff — invite modal works
- [ ] /dashboard/settings — all tabs: general, hours, notifications, sms templates, danger zone
- [ ] /dashboard/billing — plans display, upgrade buttons
- [ ] /dashboard/integrations — POS connect, QR code, API keys
- [ ] /admin — KPI cards load
- [ ] /admin/restaurants — table with filters
- [ ] /admin/restaurants/[id] — detail page
- [ ] /admin/users — table
- [ ] /admin/statistics — charts
- [ ] /admin/partners — CRUD

**Cross-cutting:**
- [ ] CSV export works on all data tables
- [ ] No hardcoded strings (all i18n)
- [ ] No TypeScript errors: npm run build → 0 errors
- [ ] No console errors in browser
- [ ] Favicon set
- [ ] Page titles dynamic
- [ ] Cmd+K search works

### Build and deploy:
```bash
cd /Users/macbookpro/Documents/stolik
npm run build:web
git add -A
git commit -m "Dinto v3: Google reviews, integrations, SMS templates, manual bookings, theme/language switcher"
git push origin master
```

Verify: stolik-dashboard.vercel.app updated.
```

---

# ═══════════════════════════════════════════════
# EXECUTION SUMMARY
# ═══════════════════════════════════════════════

| Step | What | Time | Priority |
|------|------|------|----------|
| 1 | Rebrand + critical fixes (analytics, menu, tables) | 15 min | 🔴 |
| 2 | Language switcher + dark/light theme | 15 min | 🔴 |
| 3 | Google Reviews integration | 20 min | 🟡 |
| 4 | Quick Connect — POS, Terminal, API keys | 20 min | 🟡 |
| 5 | Manual booking + CSV export + SMS templates | 20 min | 🟡 |
| 6 | Polish — search, breadcrumbs, notifications, mobile | 20 min | 🟢 |
| 7 | Vercel fix + final QA | 10 min | 🔴 |

**Total: ~2 hours Claude Code time**

---

# WHAT'S NEEDED BEFORE STARTING:

1. **Google Places API key** — get from Google Cloud Console
   - Enable "Places API" and "Places API (New)"
   - Create API key, restrict to Places API
   - Add to Railway env: GOOGLE_PLACES_API_KEY=xxx

2. **Stripe keys** (if not already):
   - STRIPE_SECRET_KEY (Railway)
   - STRIPE_PUBLISHABLE_KEY (Vercel as NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
   - STRIPE_WEBHOOK_SECRET (Railway)
   - Create products/prices in Stripe Dashboard for Pro (149 zł) and Business (349 zł)

3. **Domain** — is it dinto.pl? dinto.app? Set up custom domain on Vercel when ready.

4. **Apple Developer Account** — still needed for iOS TestFlight ($99/year)
