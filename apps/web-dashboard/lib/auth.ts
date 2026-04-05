export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  avatarUrl?: string
  language?: string
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('user') || localStorage.getItem('stolik_user')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token') || localStorage.getItem('stolik_token')
}

export function storeAuth(token: string, user: AuthUser): void {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
  // Keep legacy keys for compatibility
  localStorage.setItem('stolik_token', token)
  localStorage.setItem('stolik_user', JSON.stringify(user))
}

export function clearAuth(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('stolik_token')
  localStorage.removeItem('stolik_user')
}

export function isAdmin(role?: string): boolean {
  return role === 'super_admin' || role === 'admin'
}

export function isOwner(role?: string): boolean {
  return role === 'owner' || role === 'restaurant_owner'
}
