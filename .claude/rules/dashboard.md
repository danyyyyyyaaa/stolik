# Rules for apps/web-dashboard/**/*.tsx

## Architecture
- Next.js 16, App Router
- Pages: `app/(dashboard)/[route]/page.tsx`
- Auth pages: `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`
- Layout: sidebar + main content area

## Styling
- GitHub-dark style sidebar
- Font: Plus Jakarta Sans
- Light/dark theme toggle
- Language switcher: PL/EN/RU/UK

## Socket.io
- Connect in root dashboard layout
- Join room: `restaurant:${user.restaurantId}`
- Global event listeners for booking:new, booking:updated, booking:cancelled
- ToastNotification component in layout — shows on all pages
- NotificationBadge on "Bookings" nav item

## API calls
- fetch() with JWT from cookie/localStorage
- Handle 401 → redirect to /login
- Loading states: skeleton or spinner
- Error states: toast notification with error message

## Components
- TypeScript, functional components with hooks
- All strings via i18n (no hardcoded text)
- Every page handles: loading, error, empty, success states
