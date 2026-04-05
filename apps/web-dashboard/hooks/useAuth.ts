'use client'
import { useState, useEffect, useCallback } from 'react'
import { getStoredUser, getStoredToken, storeAuth, clearAuth, type AuthUser } from '@/lib/auth'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const storedUser = getStoredUser()
    const storedToken = getStoredToken()
    if (storedUser && storedToken) {
      setUser(storedUser)
      setToken(storedToken)
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ user: AuthUser; token: string }>('/api/auth/login', { email, password })
    storeAuth(res.token, res.user)
    setUser(res.user)
    setToken(res.token)

    const role = res.user.role
    if (role === 'admin' || role === 'super_admin') {
      router.push('/admin')
    } else {
      router.push('/dashboard')
    }
    return res
  }, [router])

  const logout = useCallback(() => {
    clearAuth()
    setUser(null)
    setToken(null)
    router.push('/login')
  }, [router])

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isOwner = user?.role === 'owner' || user?.role === 'restaurant_owner'

  return { user, token, loading, login, logout, isAdmin, isOwner }
}
