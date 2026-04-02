# STOLIK — AI Restaurant Reservation Platform

## Overview
Two-sided SaaS for restaurant table reservations in Warsaw.
Monorepo: mobile app (Expo), web dashboard (Next.js 16), backend API (Express/Prisma), embeddable widget.

## Stack
- **Backend**: Node.js + Express + Prisma ORM + PostgreSQL (Railway)
- **Dashboard**: Next.js 16, App Router, Vercel
- **Mobile**: React Native + Expo, Zustand, SecureStore
- **Widget**: Vanilla JS, no dependencies
- **Services**: Stripe (billing), Twilio (SMS), Cloudflare R2 (files), Socket.io (real-time)

## Architecture
```
packages/api/          → Express REST API + Prisma + Socket.io
apps/web-dashboard/    → Next.js 16 dashboard for restaurant owners
apps/mobile/           → Expo + React Native for guests
apps/widget/           → Embeddable booking widget
```

## Database Models
User, Restaurant, Table, Booking, GuestProfile, Reminder, Review, MenuCategory, MenuItem, StaffMember, RefreshToken, EmailVerification

## Key Rules
1. **Language**: Code in English, comments in English, UI strings via i18n (EN/PL/RU/UA)
2. **API pattern**: Express router → Zod validation → Prisma query → JSON response
3. **Auth**: JWT access (15min) + refresh token rotation (30 days) in RefreshToken table
4. **Error format**: `{error: string, details?: object}` with appropriate HTTP codes
5. **Prisma**: Always use transactions for multi-table writes. Run `npx prisma migrate dev` after schema changes
6. **Mobile navigation**: Expo Router file-based routing. Auth flow: auth-choice → login|register → onboarding → (tabs)
7. **Dashboard**: GitHub-dark sidebar, Plus Jakarta Sans, light/dark theme, PL/EN/RU/UK switcher
8. **Socket.io rooms**: `restaurant:${restaurantId}` — emit booking events to restaurant owners
9. **Testing**: smoke test script at `packages/api/tests/smoke.test.ts`
10. **Deploy**: `git push origin master` → Railway (API) + Vercel (dashboard) auto-deploy

## Commands
- `cd packages/api && npm run dev` — start API locally
- `cd apps/web-dashboard && npm run dev` — start dashboard
- `cd apps/mobile && npx expo start` — start mobile
- `npx prisma migrate dev` — run migrations
- `npx prisma studio` — open DB GUI
- `npm run test:smoke` — E2E smoke test

## Current URLs
- API: stolik-production.up.railway.app
- Dashboard: stolik-dashboard.vercel.app
- Repo: github.com/danyyyyyyyyaaa/stolik

## MVP Priority (do in order)
1. Mobile register screen + onboarding
2. Refresh tokens (backend)
3. Socket.io toast/badge notifications (dashboard)
4. Email verification (backend + dashboard banner)
5. Calendar view for bookings (dashboard)
6. Settings screen (mobile)
7. E2E smoke test
