import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow public assets and API
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname === '/') {
    return NextResponse.next()
  }

  // Protected paths require token (check via cookie or we just pass through —
  // actual auth validation happens client-side with localStorage)
  // Middleware primarily handles redirects for non-authed users

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
