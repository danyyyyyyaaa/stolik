# STOLIK — План реализации Phase 3
## Критические фиксы + 13 новых фич

---

## 🚨 CRITICAL FIX 1: Изоляция дашборда по ресторану

**Проблема:** После онбординга ресторатор попадает в общий дашборд, а не в свой ресторан. Данные онбординга не отображаются. Это ломает core product.

**Root cause:** Дашборд не фильтрует данные по `restaurantId` текущего владельца. После создания ресторана в онбординге, сессия не привязывается к конкретному `restaurantId`.

### Промпт для Claude Code:

```
CRITICAL BUG: Restaurant owner isolation in dashboard.

After onboarding, the restaurant owner sees a generic dashboard instead of THEIR restaurant data. The data they filled during onboarding (name, address, hours, tables) is not displayed.

Fix the following:

1. AUTH CONTEXT — after onboarding creates a restaurant, store the restaurantId in the user session/JWT. The middleware should inject restaurantId into every API request.

2. DASHBOARD DATA — every dashboard page must filter by the authenticated user's restaurantId:
   - /dashboard → show THIS restaurant's bookings, stats
   - /dashboard/bookings → only THIS restaurant's bookings
   - /dashboard/tables → only THIS restaurant's tables
   - /dashboard/calendar → only THIS restaurant's calendar
   - /dashboard/guests → only THIS restaurant's guests (CRM)
   - /dashboard/menu → only THIS restaurant's menu
   - /dashboard/reviews → only THIS restaurant's reviews
   - /dashboard/staff → only THIS restaurant's staff
   - /dashboard/settings → THIS restaurant's settings pre-filled with onboarding data
   - /dashboard/analytics → THIS restaurant's analytics
   - /dashboard/integrations → THIS restaurant's integrations

3. MULTI-RESTAURANT — if an owner has multiple restaurants, the restaurant switcher in the sidebar should update the active restaurantId in session. Already implemented in admin, adapt for owner role.

4. ONBOARDING DATA DISPLAY — after publish, redirect to /dashboard and show:
   - Restaurant name + logo in sidebar
   - Address, phone, email in settings
   - Working hours in calendar
   - Tables in /dashboard/tables
   - Cover photo wherever displayed

5. API MIDDLEWARE — add requireRestaurant() middleware that:
   - Extracts restaurantId from session
   - Returns 403 if user doesn't own this restaurant
   - Injects restaurant into req.restaurant

Test: Create a new restaurant via onboarding. After publish, every dashboard page should show ONLY that restaurant's data. The restaurant name should appear in the sidebar.
```

---

## 🚨 CRITICAL FIX 2: i18n — реально рабочие 4 языка

**Проблема:** EN/PL/RU/UA заявлены, но работает только English. Хардкод строк в компонентах.

### Промпт для Claude Code:

```
FIX: Make i18n actually work in 4 languages (EN, PL, RU, UA) across BOTH web-dashboard and mobile app.

DASHBOARD (Next.js):
1. Audit ALL pages for hardcoded strings — search for any quoted text in JSX/TSX files across apps/web-dashboard/src/
2. Create/update translation files: apps/web-dashboard/src/locales/{en,pl,ru,ua}.json
3. Structure translations by page: { "dashboard": {...}, "onboarding": {...}, "bookings": {...}, "settings": {...}, "auth": {...}, "common": {...} }
4. Replace every hardcoded string with t('key') using the existing i18n setup
5. Include ALL UI text: buttons, labels, placeholders, error messages, empty states, tooltips, sidebar nav items, page titles
6. The language switcher in the sidebar footer (already shows flag + "EN") must actually switch the language and persist the choice in localStorage
7. Check these known hardcoded files: login/page.tsx, register/page.tsx, onboarding/page.tsx — previously had Polish/Russian hardcoded strings

MOBILE (React Native/Expo):
8. Same audit for apps/mobile/src/ — all screens, components, modals
9. Create/update: apps/mobile/src/locales/{en,pl,ru,ua}.json
10. Language selection in app settings must persist via AsyncStorage
11. Default language = English (not device locale)

CRITICAL: Do not just create empty translation files. Actually translate ALL strings into Polish, Russian, and Ukrainian. Use proper native translations, not Google Translate quality.

After fixing, test: switch to Polish in dashboard → every single piece of text should be in Polish. No English remnants.
```

---

## Phase 3A: Бронирование и гости (фичи 1, 2, 3, 6, 11, 13)

### Фича 1: Спец-запросы при бронировании

```
FEATURE: Special requests field in booking flow.

MOBILE APP — booking form:
1. Add "Special requests" section after table/time selection:
   - Toggle chips: "Window seat", "Kids table", "Quiet area", "Wheelchair accessible"
   - Free text field: "Any allergies or dietary needs?"
   - Allergy tags: "Gluten-free", "Nut allergy", "Lactose-free", "Vegan", "Halal"
2. Save to booking record

BACKEND:
3. Add to bookings table (Prisma migration):
   - specialRequests: String? (free text)
   - seatingPreference: String? (enum: 'window', 'kids', 'quiet', 'wheelchair', null)
   - allergies: String[] (array of tags)
4. Update POST /api/restaurants/:id/bookings to accept these fields
5. Update GET bookings to return them

DASHBOARD:
6. Show special requests in booking details view
7. Show allergy warnings with red badge in bookings list
8. Filter bookings by "has allergies" in bookings management

i18n: All new strings in 4 languages.
```

### Фича 2: Лист ожидания + Push

```
FEATURE: Waitlist when all tables are occupied.

MOBILE APP:
1. When user selects a date/time and no tables available:
   - Show "All tables are booked" message
   - Show "Join waitlist" button with estimated wait time
   - User joins waitlist for that date/time/party size
2. When a table opens (cancellation or completed booking):
   - Send push notification: "A table is now available at [Restaurant]! Book now before it's gone"
   - Deep link to booking screen with pre-filled date/time

BACKEND:
3. New table: waitlist
   - id, lessonId, lessonId, restaurantId, userId, date, timeSlot, partySize, status (waiting/notified/expired/converted), createdAt
4. Endpoints:
   - POST /api/restaurants/:id/waitlist — join
   - GET /api/restaurants/:id/waitlist — list (for dashboard)
   - DELETE /api/restaurants/:id/waitlist/:entryId — leave
5. Cron job or Socket.io event: when a booking is cancelled, check waitlist for matching date/time/partySize, send push notification via existing push notification system
6. Auto-expire waitlist entries after 24 hours past the date

DASHBOARD:
7. New "Waitlist" tab in Bookings page showing current waitlist entries
8. Manual "Notify" button to ping waitlisted guests

i18n: All new strings in 4 languages.
```

### Фича 3: Поделиться ссылкой после подтверждения брони

```
FEATURE: Share booking confirmation link.

MOBILE APP:
1. After booking is confirmed (status = 'confirmed'), show "Share" button
2. Generate shareable content:
   - Deep link: stolik://booking/{bookingId} or https://stolik.pl/b/{shortCode}
   - Text: "I just booked a table at [Restaurant] for [date] at [time]! 🍽️ Book yours: [link]"
3. Use React Native Share API to open native share sheet
4. Track shares for analytics (increment shareCount on booking)

BACKEND:
5. Add shortCode field to bookings (nanoid, 8 chars)
6. GET /api/bookings/s/:shortCode — public endpoint returning restaurant name, date, time + CTA to download app
7. Landing page at /b/:shortCode on web showing restaurant info + app download links

i18n: Share text in user's selected language.
```

### Фича 6: "Забронировать снова" в Мои брони

```
FEATURE: "Book again" button in My Bookings (past bookings).

MOBILE APP:
1. In "My Bookings" screen, for past/completed bookings, show "Book again" button (like Glovo "Order again")
2. Tapping it opens booking flow pre-filled with:
   - Same restaurant
   - Same party size
   - Same special requests / allergies
   - Date = next available
3. User just picks date/time and confirms

No backend changes needed — this is pure frontend logic reusing existing booking flow.

i18n: "Book again" / "Zarezerwuj ponownie" / "Забронировать снова" / "Забронювати знову"
```

### Фича 11: Плюшки на день рождения

```
FEATURE: Birthday perks — free dessert offer.

MOBILE APP:
1. If user's birthday is within 7 days, show birthday banner on home screen:
   "🎂 Happy Birthday! Get a free dessert at participating restaurants"
2. In restaurant card, show "🎁 Birthday perk: Free dessert" badge for restaurants that enabled it
3. When booking during birthday week, auto-apply birthday perk
4. Show in booking confirmation: "Your birthday perk: Free dessert will be prepared!"

BACKEND:
5. Add to restaurants table: birthdayPerkEnabled: Boolean (default false), birthdayPerkDescription: String?
6. Add to bookings: hasBirthdayPerk: Boolean (default false)
7. Endpoint: GET /api/restaurants?birthdayPerks=true — filter restaurants with active perks
8. Logic: if user.dateOfBirth is within 7 days of booking date AND restaurant.birthdayPerkEnabled → flag the booking

DASHBOARD:
9. In Settings > Promotions: toggle "Enable birthday perks" + custom description field
10. In bookings list: birthday cake icon 🎂 for bookings with birthday perk

i18n: All in 4 languages.
```

### Фича 13: Дата рождения в профиле

```
FEATURE: Date of birth in user profile.

MOBILE APP:
1. In Profile/Settings screen, add "Date of birth" field with date picker
2. Show age verification note: "Used for birthday perks at restaurants"
3. Save via PATCH /api/users/me

BACKEND:
4. Add to users table: dateOfBirth: DateTime? (Prisma migration)
5. Update PATCH /api/users/me to accept dateOfBirth
6. Never expose exact DOB to restaurants — only "birthday this week: yes/no"

DASHBOARD (for guest CRM):
7. In guest detail view, show "Birthday: March" (month only, no exact date)
8. Filter guests by "birthday this month" for targeted campaigns

i18n: 4 languages.
```

---

## Phase 3B: Ресторан — расширение (фичи 4, 7, 8, 10, 12)

### Фича 4: Аналитика для ресторанов

```
FEATURE: Restaurant analytics dashboard.

DASHBOARD — /dashboard/analytics page:
1. Key metrics cards:
   - Total guests via Stolik (this month / all time)
   - Average party size
   - Average check (if integrated with POS, otherwise manual input)
   - Booking conversion rate (views → bookings)
   - Repeat guest rate
   - Most popular time slots (heatmap)
   - No-show rate

2. Charts:
   - Daily/weekly/monthly bookings trend (line chart)
   - Guests by source: Stolik app / widget / walk-in (pie chart)
   - Peak hours heatmap (day of week × hour)
   - Table utilization rate (% occupied per time slot)

3. Guest insights:
   - Top 10 repeat guests
   - New vs returning guests ratio
   - Average visits per guest

BACKEND:
4. GET /api/restaurants/:id/analytics?period=7d|30d|90d|all
   Returns aggregated stats from bookings table
5. GET /api/restaurants/:id/analytics/heatmap — hourly data
6. All queries filtered by restaurantId (critical for isolation!)

No new tables needed — all derived from existing bookings + guests data.

i18n: All labels, chart titles, empty states in 4 languages.
```

### Фича 7: Паркинг в информации о ресторане

```
FEATURE: Parking info for restaurants.

BACKEND:
1. Add to restaurants table (Prisma migration):
   - hasParking: Boolean (default false)
   - parkingDetails: String? ("Free parking for guests", "Paid parking nearby", etc.)

DASHBOARD:
2. In Settings > Basic Info: toggle "Parking available" + details text field

MOBILE APP:
3. On restaurant detail screen, show parking badge: 🅿️ "Free parking" or "Paid parking nearby"
4. In booking confirmation: "Parking: [details]"

i18n: Parking labels in 4 languages.
```

### Фича 8: Ads Manager для ресторанов

```
FEATURE: Ads Manager — paid promotion to boost restaurant in search results.

This is a revenue feature tied to Stripe subscriptions.

DASHBOARD — /dashboard/ads (new page):
1. "Boost your restaurant" interface:
   - Campaign type: "Top of search" / "Featured on home" / "Category spotlight"
   - Duration: 1 day / 7 days / 30 days
   - Budget display with pricing per day
   - Preview of how the ad looks in the app
   - Active / Past campaigns list
2. Payment via Stripe (reuse subscription billing)

BACKEND:
3. New table: restaurant_promotions
   - id, restaurantId, type (top_search/featured_home/category_spotlight)
   - startDate, endDate, status (active/expired/cancelled)
   - dailyRate, totalPaid, stripePaymentId
4. POST /api/restaurants/:id/promotions — create campaign + Stripe charge
5. GET /api/restaurants/:id/promotions — list campaigns
6. Modify GET /api/restaurants (public listing):
   - Promoted restaurants appear first, sorted by dailyRate
   - Show "Promoted" badge

MOBILE APP:
7. In restaurant list, promoted restaurants show first with subtle "Ad" badge
8. Featured restaurants carousel on home screen

NOTE: Stripe integration is a prerequisite. Implement after Stripe is set up.

i18n: 4 languages.
```

### Фича 10: Акции заведений

```
FEATURE: Restaurant promotions/deals visible in app.

DASHBOARD — new section in Settings or standalone /dashboard/promotions:
1. Create/edit promotions:
   - Title: "Happy Hour -30%"
   - Description: details
   - Discount type: percentage / fixed / free item
   - Valid dates: from-to
   - Conditions: "Mon-Fri 16:00-18:00", "Minimum 2 guests"
   - Cover image
   - Toggle active/inactive
2. List of active/past promotions

BACKEND:
3. New table: restaurant_promotions_deals (separate from ads)
   - id, restaurantId, title, description, discountType, discountValue
   - conditions, imageUrl, startDate, endDate, isActive
4. CRUD endpoints: /api/restaurants/:id/deals
5. Public: GET /api/deals — all active deals across restaurants (for app feed)

MOBILE APP:
6. New "Deals 🔥" tab/section on home screen
7. Deal cards showing: restaurant name, deal title, discount, valid until
8. Tap → restaurant detail with deal highlighted
9. When booking at a restaurant with active deal, show "Active deal: [title]" in booking flow

i18n: 4 languages.
```

### Фича 12: Изменить номер и почту

```
FEATURE: Properly change phone number and email in user settings.

MOBILE APP:
1. Profile > Settings:
   - "Change email" — enter new email → send verification → confirm → update
   - "Change phone" — enter new phone → send SMS code → verify → update
2. Require current password before changing email

BACKEND:
3. POST /api/users/me/change-email — sends verification email to new address
4. POST /api/users/me/verify-new-email — confirms with token
5. POST /api/users/me/change-phone — sends SMS code via Twilio
6. POST /api/users/me/verify-new-phone — confirms with code
7. Update user record only after verification

DASHBOARD (restaurant owner):
8. Same flow for owner's email/phone in Settings

i18n: All verification messages and UI in 4 languages.
```

---

## Phase 3C: Вовлечение и рост (фичи 5, 9)

### Фича 5: Любимые заведения

```
FEATURE: Favorite restaurants (like Glovo).

MOBILE APP:
1. Heart icon on restaurant cards and detail page
2. Tap to toggle favorite (optimistic UI)
3. New tab/section: "Favorites ❤️" — list of saved restaurants
4. Show in favorites: restaurant photo, name, cuisine, rating, distance

BACKEND:
5. New table: user_favorites
   - id, lessonId, lessonId, restaurantId, createdAt
   - Unique constraint: (userId, restaurantId)
6. POST /api/favorites/:restaurantId — toggle (add/remove)
7. GET /api/favorites — user's favorites list with restaurant details

i18n: "Favorites" / "Ulubione" / "Избранное" / "Обране"
```

### Фича 9: Реферальная программа

```
FEATURE: Referral program — invite friends, get rewards.

MOBILE APP:
1. Profile > "Invite friends" button
2. Show personal referral code + share link: https://stolik.pl/r/{code}
3. Share via native share sheet
4. Track: "You've invited X friends, Y joined"
5. Reward display: "Earn a free booking perk for every 3 friends who join"

BACKEND:
6. Add to users: referralCode (unique, auto-generated on registration)
7. New table: referrals
   - id, referrerId, referredId, status (pending/completed), rewardClaimed, createdAt
8. On registration: if referral code provided, create referral record
9. After referred user makes first booking → mark referral as completed
10. POST /api/referrals/claim — claim reward after threshold met
11. GET /api/referrals/stats — count, rewards available

MOBILE APP:
12. During registration: "Have a referral code?" field
13. Push notification when friend joins: "Your friend [name] joined Stolik! 🎉"

i18n: 4 languages. Share text localized.
```

---

## Порядок выполнения (рекомендация)

| # | Задача | Приоритет | Зависимости |
|---|--------|-----------|-------------|
| 1 | 🚨 Dashboard isolation (CRITICAL FIX 1) | БЛОКЕР | — |
| 2 | 🚨 i18n 4 languages (CRITICAL FIX 2) | БЛОКЕР | — |
| 3 | Фича 13: Date of birth | HIGH | Нужен для фичи 11 |
| 4 | Фича 1: Special requests | HIGH | — |
| 5 | Фича 7: Parking info | EASY | — |
| 6 | Фича 5: Favorites | HIGH | — |
| 7 | Фича 6: Book again | MEDIUM | — |
| 8 | Фича 12: Change email/phone | MEDIUM | Twilio (уже есть) |
| 9 | Фича 4: Analytics | HIGH | Fix 1 (isolation) |
| 10 | Фича 2: Waitlist + push | HIGH | Push notifications (уже есть) |
| 11 | Фича 3: Share booking link | MEDIUM | — |
| 12 | Фича 11: Birthday perks | MEDIUM | Фича 13 |
| 13 | Фича 10: Deals/Promotions | MEDIUM | — |
| 14 | Фича 9: Referral program | LOW | — |
| 15 | Фича 8: Ads Manager | LOW | Stripe (не реализован) |

---

## Как использовать этот план

1. **Копируй промпты по одному** в Claude Code в указанном порядке
2. После каждого промпта: `npm run build` в web-dashboard, проверяй TS ошибки
3. После каждого промпта: `git add -A && git push origin master`
4. Тестируй на `stolik-web-dashboard.vercel.app` и в Expo Go
5. Начни с **CRITICAL FIX 1** — без него всё остальное бессмысленно
