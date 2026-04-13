# STOLIK — Admin Panel Complete Overhaul + Missing Features from Competitors

## Competitor Analysis Summary
Based on research of: Tablein, Anolla, Tableo, Mies, OpenTable, Resy, SevenRooms, Tock, Hostme, Eat App

### Features competitors have that Stolik is MISSING:
1. **Floor plan / table map view** — visual drag-drop table layout (Tablein, Anolla, OpenTable)
2. **No-show prevention** — deposits, credit card holds, cancellation fees (Tock, Resy, Hostme)
3. **Guest CRM with visit history** — past visits, spend, preferences per guest (SevenRooms, Eat App)
4. **Automated email/SMS marketing** — campaigns to past guests (Hostme, SevenRooms)
5. **POS integration sync** — live order data, average check (Anolla, Milagro)
6. **Predictive analytics** — demand forecasting, peak hour prediction (Anolla)
7. **Multi-channel booking** — widget + Google Reserve + Instagram + phone (Tableo, Mies)
8. **Event management** — private dining, special events booking (Resy, Tock)
9. **Two-way SMS/WhatsApp** — chat with guests about their booking (Tock, Tableo)
10. **Deposit/prepayment** for bookings — reduce no-shows (Mies, Resy, Tock)

---

## PROMPT FOR CLAUDE CODE:

```
ADMIN PANEL COMPLETE OVERHAUL + NEW FEATURES

The admin panel at /admin/* is broken and incomplete. Fix everything and add missing features.

=== CRITICAL BUGS ===

BUG 1: /admin/restaurants shows "0 total" but /admin dashboard shows "5 restaurants"
- The Restaurants page API call is failing or using wrong endpoint
- Fix: ensure GET /api/admin/restaurants returns all restaurants with owner info, plan, status, rating

BUG 2: All admin pages should use admin-specific API endpoints (GET /api/admin/*)
- These endpoints must NOT filter by restaurantId (admin sees ALL data)
- Check auth middleware: admin routes need requireAdmin() not requireRestaurant()

=== ADMIN DASHBOARD (/admin) ===

Improve the overview page:
1. KPI cards (already exist, enhance):
   - Restaurants: total + new this week + active vs inactive
   - Users: total + new this week + guests vs owners ratio
   - Bookings: today + this week + this month + trend arrow
   - Revenue: MRR (from subscriptions) + total platform revenue
   - No-show rate: percentage across all restaurants
   - Average rating: across all restaurants
2. Add "Recent activity" feed: latest bookings, new signups, new restaurants (live updates)
3. Add "Alerts" section: restaurants with high no-show rate, expired subscriptions, pending reviews
4. Quick actions: "Add restaurant manually", "Send announcement", "Export data"

=== ADMIN > RESTAURANTS (/admin/restaurants) ===

FIX the empty state bug first. Then enhance:
1. Table columns: Name, Owner (name + email), District, Plan (Free/Pro/Business), Status (badge), Rating, Bookings count, Created date, Actions
2. Click on restaurant row → opens restaurant detail page (/admin/restaurants/[id])
3. Restaurant detail page shows:
   - ALL restaurant info (name, address, phone, hours, tables, photos)
   - Owner info
   - Booking history (table with filters)
   - Guest list (who booked at this restaurant)
   - Revenue/analytics for THIS restaurant
   - Subscription status + plan management
   - "Edit" button to modify any restaurant field
   - "Suspend" / "Activate" / "Delete" actions
   - "Login as owner" button (impersonation for debugging)
4. Filters: by plan, by status, by district, by rating range
5. Search by name or owner email
6. Bulk actions: export CSV, change plan, send notification

=== ADMIN > USERS (/admin/users) ===

Already shows users but enhance:
1. Add columns: Total bookings, Last booking date, Restaurants owned (if owner), Referral count
2. Click on user → user detail page showing:
   - Profile info
   - Booking history across all restaurants
   - Favorite restaurants
   - Referral stats
   - Activity log
   - "Edit role" (guest/owner/admin)
   - "Suspend" / "Delete" actions
   - "Send notification" button
3. Fix "Inactive" status — should show "Active" if user has logged in within 30 days
4. Export users to CSV

=== ADMIN > STATISTICS (/admin/statistics) ===

Already has charts, enhance:
1. Add period selector: 7d / 30d / 90d / 1y / All time (already exists, verify it works)
2. Revenue dashboard:
   - MRR by plan tier (stacked bar chart)
   - Revenue trend over time
   - Churn rate
   - LTV per restaurant
3. Booking analytics:
   - Bookings by source (app / widget / manual)
   - Peak hours heatmap (ALL restaurants combined)
   - No-show rate trend
   - Average party size
   - Cancellation rate
4. User analytics:
   - DAU/WAU/MAU
   - Retention cohorts (simple table)
   - Signup funnel: registered → first booking → repeat booking
5. Restaurant analytics:
   - Top 10 restaurants by bookings
   - Top 10 restaurants by rating
   - Average tables per restaurant
   - District distribution pie chart

=== ADMIN > PARTNERS (/admin/partners) ===

This is for affiliate/sales partners who bring restaurants to the platform:
1. Partner model: id, name, email, phone, commissionRate (%), status, createdAt
2. CRUD: Add partner, edit, deactivate
3. Track which restaurants were onboarded by which partner
4. Commission tracking: calculate based on restaurant subscription revenue
5. Partner detail page: restaurants they brought, total commission earned, payout history
6. If this is too complex for now, at minimum make the "Add Partner" button work and save to DB

=== ADMIN > SETTINGS (/admin/settings) ===

Currently empty placeholder. Add:
1. Platform settings:
   - Platform name (Dinto/Stolik)
   - Support email
   - Default language
   - Maintenance mode toggle
2. Subscription plans management:
   - Edit plan names, prices, features for Free/Pro/Business tiers
   - Feature gating configuration
3. Notification templates:
   - Edit SMS/email templates for booking confirmations, reminders, etc.
4. API keys management:
   - Show current Twilio, Stripe, Google Maps API key status (connected/not)
5. System health:
   - Database status
   - Last migration applied
   - API uptime

=== NEW FEATURES FROM COMPETITORS ===

FEATURE A — No-show tracking + deposit system:
1. Add noShowCount to Guest/Booking model
2. When restaurant marks booking as "no-show", increment counter
3. Dashboard shows no-show rate per restaurant
4. Admin can see chronic no-show guests
5. Future: deposit/prepayment via Stripe (mark as TODO for Stripe phase)

FEATURE B — Guest CRM enhancement (for restaurant dashboard, not admin):
1. Guest detail page should show:
   - Visit history (all bookings at this restaurant)
   - Total spend (if available)
   - Preferences (allergies, seating preference)
   - VIP status toggle
   - Notes field (staff can add notes about guest)
   - "Birthday this month" indicator
   - Last visit date
2. Guest tags: VIP, Regular, New, No-show risk
3. Export guest list to CSV

FEATURE C — Event management (basic):
1. New model: RestaurantEvent (id, restaurantId, title, description, date, startTime, endTime, maxGuests, pricePerPerson, imageUrl, isActive)
2. Dashboard: /dashboard/events — create/manage events
3. Mobile: Events section showing upcoming events at restaurants, book a spot
4. Admin: see all events across platform in statistics

FEATURE D — Two-way messaging (basic):
1. Add a simple message/note system between restaurant and guest for a specific booking
2. Restaurant can send message: "Your table is ready" / "We have a special menu tonight"
3. Guest sees messages in booking detail in the app
4. Model: BookingMessage (id, bookingId, senderId, senderRole, message, createdAt)
5. Dashboard: in booking detail, chat-like interface
6. Mobile: in booking detail, see messages from restaurant

=== BACKEND REQUIREMENTS ===

New/updated API endpoints needed:
- GET /api/admin/restaurants (list all, no ownership filter)
- GET /api/admin/restaurants/:id (full detail with owner, bookings, stats)
- PATCH /api/admin/restaurants/:id (edit any field)
- DELETE /api/admin/restaurants/:id
- GET /api/admin/users (enhanced with booking counts)
- GET /api/admin/users/:id (full detail)
- PATCH /api/admin/users/:id (edit role, status)
- GET /api/admin/statistics?period=7d|30d|90d|1y
- GET /api/admin/statistics/heatmap
- CRUD /api/admin/partners
- GET/PATCH /api/admin/settings
- CRUD /api/restaurants/:id/events
- CRUD /api/bookings/:id/messages
- POST /api/restaurants/:id/bookings/:bookingId/no-show

All admin endpoints MUST check requireAdmin() middleware.

=== i18n ===
ALL new strings in 4 languages (EN, PL, RU, UA).

=== AFTER IMPLEMENTING ===
Run: cd apps/web-dashboard && npm run build
Fix ALL TypeScript errors.
Then: git add -A && git commit -m "feat: admin panel overhaul + events + messaging + no-show tracking" && git push origin master
```
