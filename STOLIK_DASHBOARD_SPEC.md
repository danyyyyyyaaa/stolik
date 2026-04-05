# STOLIK — Full Dashboard Rebuild Specification
## Spec-First Methodology · v2.0

---

# PART 1: PROJECT_IDEA

## 1. Problem

Restaurant table reservation platforms in Poland charge per-booking commissions (5-15%), eating into thin restaurant margins. OpenTable, TheFork take 2-4€ per seated diner. Small/medium Warsaw restaurants (5,000+ establishments) need affordable digital booking without per-booking fees.

Current Stolik state: mobile app is production-ready (React Native/Expo), but the web dashboard is an MVP prototype — no proper admin panel, no restaurant self-registration, no analytics, no calendar, no multi-role access. Restaurants can't self-onboard or manage operations independently.

## 2. Solution

Two-sided SaaS platform:
- **Guest side**: Mobile app (iOS/Android) — search, book, review restaurants in Warsaw → DONE
- **Restaurant side**: Web dashboard — self-registration, booking management, analytics, menu editor → REBUILD FROM SCRATCH
- **Admin side**: Super-admin panel — all restaurants, all users, platform statistics, partner management → BUILD NEW

Revenue: flat monthly subscription (Free/Pro/Business), zero commission per booking.

## 3. Target Audience

**Primary**: Restaurant owners/managers in Warsaw (5,000+ restaurants)
**Secondary**: Platform administrators (Stolik team, 1-3 people)
**Tertiary**: Restaurant staff (hostess, manager roles)

## 4. Architecture

```
┌─────────────────────────────────────────────────┐
│                    FRONTEND                      │
│  Next.js 14+ App Router (Vercel)                │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │  Admin    │ │  Restaurant  │ │  Restaurant  │ │
│  │  Panel    │ │  Onboarding  │ │  Dashboard   │ │
│  │ /admin/*  │ │ /onboarding/*│ │ /dashboard/* │ │
│  └──────────┘ └──────────────┘ └──────────────┘ │
└─────────────────┬───────────────────────────────┘
                  │ REST API
┌─────────────────▼───────────────────────────────┐
│                   BACKEND                        │
│  Node.js + Express + Prisma (Railway)            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐         │
│  │ Auth │ │ CRUD │ │Upload│ │Analytics│         │
│  └──────┘ └──────┘ └──────┘ └────────┘         │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              PostgreSQL (Railway)                 │
│  + Cloudflare R2 (file storage)                  │
│  + Stripe (payments)                             │
└─────────────────────────────────────────────────┘
```

## 5. Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | Next.js 14+ App Router, TypeScript, Tailwind CSS | SSR, file-based routing, Vercel native |
| UI Library | shadcn/ui + custom design system | Matches app's green/white theme |
| Charts | Recharts | Lightweight, React-native |
| Calendar | react-day-picker or custom | Booking calendar views |
| i18n | next-intl | EN/PL/RU/UK support |
| Backend | Node.js, Express, Prisma ORM | Already deployed on Railway |
| Database | PostgreSQL | Already on Railway |
| Storage | Cloudflare R2 | Already configured |
| Payments | Stripe | Subscription billing |
| Auth | JWT (existing) | Already implemented |
| Deploy FE | Vercel | Already configured |
| Deploy BE | Railway | Already configured |

## 6. Design System (matching mobile app)

From screenshots analysis:
- **Primary color**: `#1B7A4A` (dark green) — buttons, active tabs, icons
- **Primary light**: `#E8F5EE` — backgrounds, cards
- **Accent**: `#F5A623` (amber) — stars, ratings, badges
- **Background**: `#FAFAF5` (warm off-white)
- **Surface**: `#FFFFFF` — cards
- **Text primary**: `#1A1A1A`
- **Text secondary**: `#6B7280`
- **Error/cancel**: `#E53E3E` — cancelled badges
- **Warning**: `#F6AD55` — no-show badges
- **Success**: `#38A169` — available indicators
- **Font**: Plus Jakarta Sans (already in app)
- **Border radius**: 12px cards, 8px buttons, 24px chips
- **Shadows**: subtle `0 1px 3px rgba(0,0,0,0.08)`

## 7. Monetization

| Plan | Price | Features |
|------|-------|----------|
| Free | 0 zł/mo | 1 location, 20 bookings/mo, basic calendar |
| Pro | 149 zł/mo | Unlimited bookings, analytics, menu editor, reviews |
| Business | 349 zł/mo | Multi-location, API access, priority support, custom branding |

## 8. Roles & Access

| Role | Code | Access |
|------|------|--------|
| Super Admin | `SUPER_ADMIN` | Everything: all restaurants, all users, platform stats, partner management |
| Admin | `ADMIN` | Platform stats, restaurant moderation |
| Restaurant Owner | `RESTAURANT_OWNER` | Own restaurant(s) dashboard, settings, billing |
| Restaurant Manager | `MANAGER` | Booking management, calendar, limited settings |
| Restaurant Staff | `STAFF` | View bookings, confirm/decline |

---

# PART 2: TECHNICAL SPECIFICATION

## Module 1: Authentication & Authorization

### User Stories
- As a restaurant owner, I want to register my restaurant via a self-service flow
- As an admin, I want to log in to the admin panel with elevated privileges
- As a restaurant manager, I want to receive an invitation link to join my restaurant
- As any user, I want the interface in my preferred language (EN/PL/RU/UK)

### Data Model (Prisma additions/changes)

```prisma
enum UserRole {
  SUPER_ADMIN
  ADMIN
  RESTAURANT_OWNER
  MANAGER
  STAFF
  GUEST
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  firstName     String?
  lastName      String?
  phone         String?
  avatar        String?   // R2 URL
  role          UserRole  @default(GUEST)
  language      String    @default("en") // en, pl, ru, uk
  isActive      Boolean   @default(true)
  emailVerified Boolean   @default(false)
  lastLoginAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  ownedRestaurants  Restaurant[]     @relation("owner")
  staffMemberships  RestaurantStaff[]
  bookings          Booking[]
}

model RestaurantStaff {
  id           String       @id @default(uuid())
  userId       String
  restaurantId String
  role         StaffRole    @default(STAFF)
  invitedBy    String?
  inviteToken  String?      @unique
  inviteStatus InviteStatus @default(PENDING)
  createdAt    DateTime     @default(now())

  user       User       @relation(fields: [userId], references: [id])
  restaurant Restaurant @relation(fields: [restaurantId], references: [id])

  @@unique([userId, restaurantId])
}

enum StaffRole {
  MANAGER
  STAFF
}

enum InviteStatus {
  PENDING
  ACCEPTED
  DECLINED
}
```

### API Endpoints

| Method | Path | Body | Response | Auth |
|--------|------|------|----------|------|
| POST | /api/auth/register | {email, password, firstName, lastName} | 201 {user, token} | Public |
| POST | /api/auth/login | {email, password} | 200 {user, token} | Public |
| POST | /api/auth/forgot-password | {email} | 200 {message} | Public |
| POST | /api/auth/reset-password | {token, password} | 200 {message} | Public |
| GET | /api/auth/me | - | 200 {user} | JWT |
| PUT | /api/auth/me | {firstName, lastName, phone, language} | 200 {user} | JWT |
| POST | /api/staff/invite | {email, restaurantId, role} | 201 {invite} | OWNER/MANAGER |
| POST | /api/staff/accept-invite | {token} | 200 {membership} | JWT |

### Middleware

```typescript
// Role-based access middleware
const requireRole = (...roles: UserRole[]) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  next();
};

// Restaurant-scoped access
const requireRestaurantAccess = (req, res, next) => {
  // Check if user is owner OR staff member of the restaurant
};
```

---

## Module 2: Restaurant Onboarding (Self-Registration)

### User Stories
- As a restaurant owner, I want to register my restaurant step-by-step
- As a restaurant owner, I want to upload photos, logo, and set working hours
- As a restaurant owner, I want to configure tables and floor plan
- As a restaurant owner, I want to preview how my restaurant looks in the app
- As a restaurant owner, I want to publish (go live) when ready

### Onboarding Flow (5 Steps)

**Step 1: Basic Info**
- Restaurant name, description (PL + EN)
- Cuisine type (multi-select)
- Price range ($, $$, $$$)
- Address (with autocomplete via Google Places)
- Phone, email, website
- District (Mokotów, Śródmieście, etc.)

**Step 2: Working Hours & Schedule**
- Weekly schedule (Mon-Sun, open/close times)
- Special hours (holidays)
- Reservation slot duration (30/60/90/120 min)
- Max advance booking days (7/14/30/60)

**Step 3: Photos & Branding**
- Cover photo (hero image)
- Logo
- Gallery (up to 10 photos)
- Upload to Cloudflare R2

**Step 4: Tables & Floor Plan**
- Add tables: name, capacity (min/max guests), zone (indoor/outdoor/bar/terrace)
- Visual floor plan editor (drag & drop)
- Total capacity auto-calculated

**Step 5: Review & Publish**
- Preview card (as it appears in app)
- Status: Draft → Published
- "Go Live" button

### API Endpoints

| Method | Path | Body | Response | Auth |
|--------|------|------|----------|------|
| POST | /api/restaurants | {step1 data} | 201 {restaurant} | OWNER+ |
| PUT | /api/restaurants/:id | {any step data} | 200 {restaurant} | OWNER |
| PUT | /api/restaurants/:id/hours | {schedule[]} | 200 {hours} | OWNER |
| POST | /api/restaurants/:id/photos | multipart/form-data | 201 {photo} | OWNER |
| DELETE | /api/restaurants/:id/photos/:photoId | - | 204 | OWNER |
| POST | /api/restaurants/:id/tables | {name, capacity, zone} | 201 {table} | OWNER |
| PUT | /api/restaurants/:id/tables/:tableId | {position, etc.} | 200 {table} | OWNER |
| POST | /api/restaurants/:id/publish | - | 200 {restaurant} | OWNER |

---

## Module 3: Restaurant Dashboard

### User Stories
- As a restaurant owner, I want to see today's bookings at a glance
- As a restaurant manager, I want to confirm/decline bookings
- As a restaurant owner, I want to see weekly/monthly analytics
- As staff, I want a real-time view of current table status

### Dashboard Layout

**Sidebar Navigation** (collapsible, GitHub-dark style matching current):
```
🏠 Overview          /dashboard
📅 Calendar          /dashboard/calendar
📋 Bookings          /dashboard/bookings
🍽️ Tables            /dashboard/tables
📊 Analytics         /dashboard/analytics
🍕 Menu              /dashboard/menu
⭐ Reviews           /dashboard/reviews
👥 Staff             /dashboard/staff
⚙️ Settings          /dashboard/settings
💳 Billing           /dashboard/billing
```

### Dashboard Overview Page

**Top stats cards (4 columns)**:
- Today's bookings (count + vs yesterday %)
- Guests expected today (count)
- Revenue this month (if Stripe connected)
- Average rating (from reviews)

**Today's timeline**:
- Visual timeline 10:00-23:00 with booking blocks
- Color-coded: confirmed (green), pending (amber), cancelled (red)
- Click to expand booking details

**Recent activity feed**:
- New booking, cancellation, review — last 24h

### Calendar Page

Full calendar view (month/week/day toggle):
- **Month view**: dots indicating busy days, color intensity by booking count
- **Week view**: grid with time slots, bookings as blocks
- **Day view**: detailed timeline with table assignments
- Filters: by status, by table, by guest count
- Click any slot → create/view booking

### Bookings Page

Table view with columns:
- Booking ID (DN-XXXX)
- Guest name + phone
- Date & time
- Party size
- Table assigned
- Status badge (Confirmed/Pending/Cancelled/No-show/Completed)
- Actions (confirm, decline, edit, cancel)

Filters: date range, status, search by guest name/phone
Sort: by date, by status, by guest count
Pagination: 20 per page

### Analytics Page

**Date range picker** (today, 7d, 30d, 90d, custom)

**Charts**:
1. Bookings over time (line chart, daily/weekly)
2. Bookings by status (pie/donut chart)
3. Peak hours heatmap (day × hour grid)
4. Guest count distribution (bar chart)
5. No-show rate trend (line chart)
6. Table utilization % (horizontal bars per table)
7. Revenue trend (if Stripe, line chart)

**KPI cards**:
- Total bookings in period
- Unique guests
- Average party size
- No-show rate %
- Cancellation rate %
- Average booking lead time (days in advance)

### API Endpoints

| Method | Path | Response | Auth |
|--------|------|----------|------|
| GET | /api/dashboard/overview?restaurantId= | {todayBookings, guests, revenue, rating} | OWNER/MANAGER |
| GET | /api/dashboard/calendar?restaurantId=&month= | {days: [{date, bookingCount, bookings[]}]} | OWNER/MANAGER |
| GET | /api/dashboard/analytics?restaurantId=&from=&to= | {charts data} | OWNER/MANAGER |
| GET | /api/bookings?restaurantId=&status=&from=&to=&page= | {bookings[], total, pages} | OWNER/MANAGER/STAFF |
| PUT | /api/bookings/:id/status | {status} | OWNER/MANAGER/STAFF |

---

## Module 4: Super Admin Panel

### User Stories
- As a super admin, I want to see all restaurants on the platform
- As a super admin, I want to see all registered users (app + dashboard)
- As a super admin, I want to see platform-wide statistics
- As a super admin, I want to manage partners
- As a super admin, I want to moderate restaurants (approve, suspend)

### Admin Layout

**Sidebar Navigation**:
```
📊 Dashboard         /admin
🏪 Restaurants       /admin/restaurants
👤 Users             /admin/users
📈 Statistics        /admin/statistics
🤝 Partners          /admin/partners
⚙️ Settings          /admin/settings
```

### Admin Dashboard Page

**Platform KPIs (top cards)**:
- Total restaurants (active/draft/suspended)
- Total users (app + dashboard)
- Total bookings (today / this month / all time)
- Revenue (MRR from subscriptions)

**Charts**:
- New restaurants per week (line)
- New users per week (line)
- Bookings per day (bar)
- Revenue growth (line)
- Top 10 restaurants by bookings (horizontal bar)

**Recent activity**:
- New restaurant registrations
- New user sign-ups
- Subscription changes

### Restaurants Management

Table with columns:
- Restaurant name + logo
- Owner (name, email)
- District
- Status (Draft/Active/Suspended)
- Plan (Free/Pro/Business)
- Bookings count (total)
- Rating
- Created date
- Actions (view, edit, suspend, delete)

Detail view: full restaurant info, booking history, analytics, staff list

### Users Management

Table with columns:
- Name + avatar
- Email
- Role
- Registration date
- Last active
- Bookings count
- Status (Active/Inactive)
- Actions (view, edit, deactivate)

### Partners Module

Partners = entities that bring restaurants to the platform (sales reps, agencies).

```prisma
model Partner {
  id          String   @id @default(uuid())
  name        String
  email       String   @unique
  phone       String?
  company     String?
  commission  Float    @default(10) // % of restaurant subscription
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  restaurants Restaurant[] @relation("referredBy")
}

// Add to Restaurant model:
// partnerId  String?
// partner    Partner? @relation("referredBy", fields: [partnerId], references: [id])
```

### API Endpoints

| Method | Path | Response | Auth |
|--------|------|----------|------|
| GET | /api/admin/dashboard | {kpis, charts} | SUPER_ADMIN |
| GET | /api/admin/restaurants?page=&status=&search= | {restaurants[], total} | SUPER_ADMIN/ADMIN |
| PUT | /api/admin/restaurants/:id/status | {status: 'active'/'suspended'} | SUPER_ADMIN |
| GET | /api/admin/users?page=&role=&search= | {users[], total} | SUPER_ADMIN/ADMIN |
| PUT | /api/admin/users/:id | {role, isActive} | SUPER_ADMIN |
| GET | /api/admin/statistics?from=&to= | {detailed platform stats} | SUPER_ADMIN |
| POST | /api/admin/partners | {name, email, commission} | SUPER_ADMIN |
| GET | /api/admin/partners | {partners[]} | SUPER_ADMIN |
| PUT | /api/admin/partners/:id | {updates} | SUPER_ADMIN |

---

## Module 5: Menu Editor

### Already exists, needs enhancement:
- MenuCategory, MenuItem models in Prisma
- Add photo upload per menu item (R2)
- Add allergen tags
- Add popular/recommended badge
- Drag & drop category reordering

---

## Module 6: Reviews Management

### Dashboard view:
- List of all reviews for restaurant
- Reply to reviews
- Average rating widget
- Rating distribution chart (5/4/3/2/1 stars)

### Admin view:
- All reviews across platform
- Flag/remove inappropriate reviews

---

## Module 7: Billing (Stripe)

### User Stories
- As a restaurant owner, I want to choose a subscription plan
- As a restaurant owner, I want to manage my payment method
- As a restaurant owner, I want to see billing history

### Implementation
- Stripe Checkout for subscription creation
- Stripe Customer Portal for management
- Webhook handler for subscription events
- Plan gating in middleware

### API Endpoints

| Method | Path | Response | Auth |
|--------|------|----------|------|
| POST | /api/billing/create-checkout | {sessionUrl} | OWNER |
| POST | /api/billing/portal | {portalUrl} | OWNER |
| POST | /api/billing/webhook | Stripe webhook | Public (verified) |
| GET | /api/billing/subscription | {plan, status, nextBilling} | OWNER |

---

## Module 8: i18n (Internationalization)

### Languages: EN (default), PL, RU, UK

All dashboard text externalized to translation files:
```
/messages/en.json
/messages/pl.json
/messages/ru.json
/messages/uk.json
```

Language detection: user preference > browser locale > EN
Language switcher in header (all pages)

---

## Module 9: File Cleanup & Code Quality

### Delete from project:
- Unused components from old dashboard
- Duplicate/dead routes
- Leftover test files
- node_modules from wrong directories
- .env files with old/wrong values

### Code standards:
- TypeScript strict mode
- ESLint + Prettier configured
- Path aliases (@/components, @/lib, @/api)
- Consistent naming: PascalCase components, camelCase functions, kebab-case files

---

# PART 3: CLAUDE.md (≤120 lines)

```markdown
# STOLIK — Restaurant Reservation Platform

## Overview
Two-sided SaaS: mobile app (guests) + web dashboard (restaurants + admins).
This config covers the web dashboard only.

## Stack
- Frontend: Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Node.js, Express, Prisma ORM, PostgreSQL
- Storage: Cloudflare R2
- Payments: Stripe
- i18n: next-intl (EN/PL/RU/UK)
- Deploy: Vercel (frontend), Railway (backend)

## Architecture
- Monorepo: /apps/mobile (Expo), /apps/dashboard (Next.js), /apps/api (Express)
- Three panels: /admin/* (super-admin), /onboarding/* (restaurant registration), /dashboard/* (restaurant management)
- Role-based access: SUPER_ADMIN, ADMIN, RESTAURANT_OWNER, MANAGER, STAFF, GUEST

## Design System
- Primary: #1B7A4A (green), Accent: #F5A623 (amber), BG: #FAFAF5
- Font: Plus Jakarta Sans
- Components: shadcn/ui customized to match mobile app aesthetic
- Border radius: 12px cards, 8px buttons
- Sidebar: dark theme (#1A1A1A), content: light theme

## API Base
- Production: https://stolik-production.up.railway.app
- All endpoints prefixed with /api/
- Auth: JWT Bearer token
- File uploads: POST /api/upload → Cloudflare R2

## Key Commands
- `npm run dev` — start dashboard dev server
- `npx prisma migrate dev` — run migrations
- `npx prisma generate` — regenerate client
- `npm run build` — production build
- `npm run lint` — lint check

## Rules
- Always use TypeScript strict mode
- Use path aliases: @/components, @/lib, @/hooks, @/api
- All text through i18n — never hardcode strings
- API calls through centralized fetch wrapper with auth header
- Handle loading, error, empty states for every data fetch
- Mobile-responsive: all dashboard pages must work on tablet
```

---

# PART 4: SUBAGENTS

## Agent 1: database-architect

```yaml
name: database-architect
description: Schema design, Prisma migrations, indexes, seed data
tools: Read, Write, Edit, Bash, Glob, Grep
model: opus
```

**Role**: Senior database architect specializing in PostgreSQL and Prisma ORM.

**Responsibilities**:
- Design and update Prisma schema
- Create migrations
- Design indexes for query performance
- Seed data for development
- Ensure referential integrity

**Checklist before completion**:
- [ ] All models have proper relations
- [ ] Indexes on frequently queried fields
- [ ] Enums for fixed value sets
- [ ] Cascade delete rules defined
- [ ] Seed script updated

---

## Agent 2: backend-engineer

```yaml
name: backend-engineer
description: API routes, middleware, business logic, integrations
tools: Read, Write, Edit, Bash, Glob, Grep
model: opus
```

**Role**: Senior backend engineer on Node.js/Express/Prisma stack.

**Responsibilities**:
- REST API endpoints with proper validation (Zod)
- Auth middleware with role checks
- Stripe integration (subscriptions, webhooks)
- File upload to R2
- Analytics data aggregation queries

**Patterns**:
- Controller → Service → Prisma pattern
- Zod schemas for request validation
- Centralized error handling middleware
- Rate limiting on public endpoints

---

## Agent 3: frontend-developer

```yaml
name: frontend-developer
description: Next.js pages, components, forms, navigation, i18n
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
```

**Role**: Senior frontend developer on Next.js/TypeScript/Tailwind/shadcn stack.

**Responsibilities**:
- Page layouts (admin, dashboard, onboarding)
- Reusable components (DataTable, StatsCard, ChartCard)
- Forms with validation (react-hook-form + zod)
- i18n setup and translation files
- API integration with SWR or React Query
- Responsive design

**Design rules**:
- Match mobile app's green/white aesthetic
- shadcn/ui components customized with Stolik theme
- Plus Jakarta Sans font
- Sidebar: dark (#1A1A1A), content: light (#FAFAF5)
- Loading skeletons, error boundaries, empty states everywhere

---

## Agent 4: qa-reviewer

```yaml
name: qa-reviewer
description: Code review, security audit, UX consistency check
tools: Read, Bash, Glob, Grep
model: sonnet
```

**Role**: QA engineer reviewing code quality and security.

**NO Write or Edit access** — only describes issues.

**Checklist**:
- [ ] No hardcoded strings (all through i18n)
- [ ] Role checks on every API endpoint
- [ ] No sensitive data in client-side code
- [ ] Consistent error handling
- [ ] Loading/error/empty states present
- [ ] Mobile responsive
- [ ] TypeScript strict — no `any`

---

# PART 5: IMPLEMENTATION ROADMAP

## Phase 1: Foundation (Day 1-2)
1. Clean up project — remove unused files, fix structure
2. Update Prisma schema (new models: Partner, RestaurantStaff, enums)
3. Run migrations
4. Set up Next.js app structure with proper routing
5. Configure i18n (next-intl) with 4 languages
6. Set up design system (Tailwind config, shadcn/ui theme)
7. Create shared layouts (AdminLayout, DashboardLayout)
8. Auth pages: login, register, forgot password

## Phase 2: Restaurant Onboarding (Day 3-4)
1. 5-step onboarding wizard UI
2. API endpoints for each step
3. Photo upload to R2
4. Table/floor plan editor
5. Preview & publish flow

## Phase 3: Restaurant Dashboard (Day 5-8)
1. Dashboard overview page (stats + timeline)
2. Calendar view (month/week/day)
3. Bookings management table
4. Analytics page with charts
5. Menu editor enhancement
6. Reviews management
7. Staff management (invite, roles)
8. Settings page
9. Billing page (Stripe)

## Phase 4: Admin Panel (Day 9-11)
1. Admin dashboard (platform KPIs)
2. Restaurants management
3. Users management
4. Partners module
5. Platform statistics
6. Admin settings

## Phase 5: Polish (Day 12-14)
1. All translations complete (EN/PL/RU/UK)
2. Mobile responsive testing
3. Performance optimization
4. Error handling audit
5. Security review
6. Deploy to Vercel + Railway

---

# PART 6: CLAUDE CODE PROMPT

Copy this entire prompt into Claude Code to begin the rebuild:

---

```
You are rebuilding the Stolik web dashboard from scratch. This is a restaurant table reservation SaaS platform.

## Context
- Monorepo: github.com/danyyyyyyyyaaa/stolik
- Mobile app (React Native/Expo) is DONE — do not touch /apps/mobile
- Backend API (Node.js/Express/Prisma) is on Railway — enhance, don't break existing mobile API
- Dashboard (Next.js) is on Vercel — REBUILD from scratch

## Current deployed:
- Backend: stolik-production.up.railway.app
- Dashboard: stolik-dashboard.vercel.app

## Your task — Phase 1: Foundation

### Step 1: Audit & Clean
1. Read the full project structure
2. Identify and list unused/dead files in the dashboard app
3. DO NOT delete yet — just list them for approval

### Step 2: Prisma Schema Update
Add these models/enums to schema.prisma:
- UserRole enum: SUPER_ADMIN, ADMIN, RESTAURANT_OWNER, MANAGER, STAFF, GUEST
- StaffRole enum: MANAGER, STAFF
- InviteStatus enum: PENDING, ACCEPTED, DECLINED
- RestaurantStaff model (userId, restaurantId, role, inviteToken, inviteStatus)
- Partner model (name, email, phone, company, commission, isActive)
- Add partnerId to Restaurant model
- Add role, language, isActive, emailVerified, lastLoginAt to User model
- Run: npx prisma migrate dev --name add_roles_partners_staff

### Step 3: Next.js App Structure
Create this routing structure:
/app
  /(auth)/login/page.tsx
  /(auth)/register/page.tsx
  /(auth)/forgot-password/page.tsx
  /admin/layout.tsx — AdminLayout with dark sidebar
  /admin/page.tsx — Admin dashboard
  /admin/restaurants/page.tsx
  /admin/users/page.tsx
  /admin/statistics/page.tsx
  /admin/partners/page.tsx
  /admin/settings/page.tsx
  /onboarding/layout.tsx — Clean onboarding layout
  /onboarding/page.tsx — Step wizard
  /dashboard/layout.tsx — DashboardLayout with sidebar
  /dashboard/page.tsx — Overview
  /dashboard/calendar/page.tsx
  /dashboard/bookings/page.tsx
  /dashboard/tables/page.tsx
  /dashboard/analytics/page.tsx
  /dashboard/menu/page.tsx
  /dashboard/reviews/page.tsx
  /dashboard/staff/page.tsx
  /dashboard/settings/page.tsx
  /dashboard/billing/page.tsx

### Step 4: Design System
Tailwind config with Stolik theme:
- Colors: primary #1B7A4A, accent #F5A623, bg #FAFAF5, surface #FFFFFF
- Font: Plus Jakarta Sans (Google Fonts)
- Border radius: lg=12px, md=8px, full=24px
- shadcn/ui installed and themed

### Step 5: i18n Setup
Install next-intl, create:
/messages/en.json, /messages/pl.json, /messages/ru.json, /messages/uk.json
Start with EN, structure for all sections:
{
  "common": { "save": "Save", "cancel": "Cancel", ... },
  "auth": { "login": "Log in", "register": "Register", ... },
  "dashboard": { "overview": "Overview", "bookings": "Bookings", ... },
  "admin": { "restaurants": "Restaurants", "users": "Users", ... }
}

### Step 6: Shared Components
Create reusable components:
- StatsCard (icon, title, value, change%)
- DataTable (columns, data, pagination, filters, sorting)
- ChartCard (title, children)
- StatusBadge (variant: confirmed/pending/cancelled/no-show)
- Sidebar (items, activeItem, collapsed toggle)
- LanguageSwitcher (EN/PL/RU/UK dropdown)
- ThemeToggle (light/dark)
- LoadingSkeleton
- EmptyState (icon, title, description, action)
- PageHeader (title, description, actions)

### Step 7: Auth middleware
- Create withAuth HOC or middleware.ts for Next.js
- Role-based route protection
- Redirect unauthenticated to /login
- Redirect based on role: SUPER_ADMIN → /admin, OWNER → /dashboard

### Design rules:
- Sidebar: dark background #1A1A1A, green active item #1B7A4A
- Content area: warm off-white #FAFAF5
- Cards: white #FFFFFF with subtle shadow
- All text via i18n — zero hardcoded strings
- Every page: loading skeleton → data → empty state fallback
- TypeScript strict mode, no `any`
- File naming: kebab-case for files, PascalCase for components
```

---

# PART 7: BACKEND API ENDPOINTS (FULL REFERENCE)

## Auth
```
POST   /api/auth/register          → 201 {user, token}
POST   /api/auth/login             → 200 {user, token}
POST   /api/auth/forgot-password   → 200 {message}
POST   /api/auth/reset-password    → 200 {message}
GET    /api/auth/me                → 200 {user}
PUT    /api/auth/me                → 200 {user}
```

## Restaurant CRUD
```
POST   /api/restaurants            → 201 {restaurant}
GET    /api/restaurants            → 200 {restaurants[]}
GET    /api/restaurants/:id        → 200 {restaurant}
PUT    /api/restaurants/:id        → 200 {restaurant}
DELETE /api/restaurants/:id        → 204
PUT    /api/restaurants/:id/hours  → 200 {hours[]}
POST   /api/restaurants/:id/photos → 201 {photo}
DELETE /api/restaurants/:id/photos/:photoId → 204
POST   /api/restaurants/:id/publish → 200 {restaurant}
```

## Tables
```
POST   /api/restaurants/:id/tables          → 201 {table}
GET    /api/restaurants/:id/tables          → 200 {tables[]}
PUT    /api/restaurants/:id/tables/:tableId → 200 {table}
DELETE /api/restaurants/:id/tables/:tableId → 204
```

## Bookings
```
GET    /api/bookings?restaurantId=&status=&from=&to=&page= → 200 {bookings[], total, pages}
GET    /api/bookings/:id                    → 200 {booking}
PUT    /api/bookings/:id/status             → 200 {booking}
POST   /api/bookings/:id/cancel             → 200 {booking}
```

## Dashboard
```
GET    /api/dashboard/overview?restaurantId=      → 200 {stats}
GET    /api/dashboard/calendar?restaurantId=&month= → 200 {days[]}
GET    /api/dashboard/analytics?restaurantId=&from=&to= → 200 {charts}
```

## Menu
```
GET    /api/restaurants/:id/menu          → 200 {categories[]}
POST   /api/restaurants/:id/menu/categories → 201 {category}
PUT    /api/menu/categories/:id           → 200 {category}
DELETE /api/menu/categories/:id           → 204
POST   /api/menu/categories/:id/items     → 201 {item}
PUT    /api/menu/items/:id                → 200 {item}
DELETE /api/menu/items/:id                → 204
```

## Reviews
```
GET    /api/restaurants/:id/reviews       → 200 {reviews[], avgRating}
POST   /api/reviews/:id/reply             → 201 {reply}
```

## Staff
```
POST   /api/staff/invite                  → 201 {invite}
POST   /api/staff/accept-invite           → 200 {membership}
GET    /api/restaurants/:id/staff         → 200 {staff[]}
PUT    /api/staff/:id                     → 200 {staff}
DELETE /api/staff/:id                     → 204
```

## Billing
```
POST   /api/billing/create-checkout       → 200 {sessionUrl}
POST   /api/billing/portal                → 200 {portalUrl}
POST   /api/billing/webhook               → 200
GET    /api/billing/subscription          → 200 {subscription}
```

## Admin
```
GET    /api/admin/dashboard               → 200 {kpis, charts}
GET    /api/admin/restaurants?page=&status=&search= → 200 {restaurants[], total}
PUT    /api/admin/restaurants/:id/status  → 200 {restaurant}
GET    /api/admin/users?page=&role=&search= → 200 {users[], total}
PUT    /api/admin/users/:id               → 200 {user}
GET    /api/admin/statistics?from=&to=    → 200 {stats}
POST   /api/admin/partners               → 201 {partner}
GET    /api/admin/partners                → 200 {partners[]}
PUT    /api/admin/partners/:id            → 200 {partner}
DELETE /api/admin/partners/:id            → 204
```

## Upload
```
POST   /api/upload                        → 201 {url, key}
```

---

# PART 8: FILE STRUCTURE (Target)

```
stolik/
├── CLAUDE.md
├── apps/
│   ├── mobile/          ← DO NOT TOUCH
│   ├── dashboard/       ← REBUILD
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   └── forgot-password/page.tsx
│   │   │   ├── admin/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── restaurants/page.tsx
│   │   │   │   ├── users/page.tsx
│   │   │   │   ├── statistics/page.tsx
│   │   │   │   ├── partners/page.tsx
│   │   │   │   └── settings/page.tsx
│   │   │   ├── onboarding/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── calendar/page.tsx
│   │   │   │   ├── bookings/page.tsx
│   │   │   │   ├── tables/page.tsx
│   │   │   │   ├── analytics/page.tsx
│   │   │   │   ├── menu/page.tsx
│   │   │   │   ├── reviews/page.tsx
│   │   │   │   ├── staff/page.tsx
│   │   │   │   ├── settings/page.tsx
│   │   │   │   └── billing/page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── ui/          ← shadcn/ui
│   │   │   ├── shared/      ← StatsCard, DataTable, etc.
│   │   │   ├── layouts/     ← AdminLayout, DashboardLayout
│   │   │   └── charts/      ← BookingsChart, etc.
│   │   ├── lib/
│   │   │   ├── api.ts       ← fetch wrapper
│   │   │   ├── auth.ts      ← JWT helpers
│   │   │   ├── utils.ts
│   │   │   └── constants.ts
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useBookings.ts
│   │   │   └── useRestaurant.ts
│   │   ├── messages/
│   │   │   ├── en.json
│   │   │   ├── pl.json
│   │   │   ├── ru.json
│   │   │   └── uk.json
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── middleware.ts
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── api/                 ← ENHANCE
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── restaurants.ts
│       │   │   ├── bookings.ts
│       │   │   ├── dashboard.ts
│       │   │   ├── admin.ts
│       │   │   ├── billing.ts
│       │   │   ├── staff.ts
│       │   │   ├── menu.ts
│       │   │   ├── reviews.ts
│       │   │   └── upload.ts
│       │   ├── middleware/
│       │   │   ├── auth.ts
│       │   │   ├── roles.ts
│       │   │   └── validate.ts
│       │   ├── services/
│       │   ├── prisma/
│       │   │   ├── schema.prisma
│       │   │   ├── seed.ts
│       │   │   └── migrations/
│       │   └── index.ts
│       └── package.json
├── .claude/
│   ├── agents/
│   │   ├── database-architect.md
│   │   ├── backend-engineer.md
│   │   ├── frontend-developer.md
│   │   └── qa-reviewer.md
│   └── rules/
│       ├── prisma.md
│       ├── api-routes.md
│       └── components.md
└── package.json
```

---

**END OF SPECIFICATION**

Use this document as the single source of truth for the entire dashboard rebuild.
Every module, endpoint, component, and design decision is documented here.
No TODO placeholders. No ambiguity. Ready for autonomous Claude Code execution.
