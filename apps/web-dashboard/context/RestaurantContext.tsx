'use client'
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api } from '@/lib/api'

export interface Restaurant {
  id: string
  name: string
  slug: string
  description?: string
  cuisine: string
  district: string
  city: string
  address: string
  phone?: string
  email?: string
  website?: string
  instagram?: string
  priceRange: string
  rating: number
  reviewCount: number
  coverImage?: string
  logoUrl?: string
  isActive: boolean
  isPublished: boolean
  plan: string
  planStatus?: string
  status?: string
  ownerId: string
  openingHours?: string
  slotDuration?: number
  maxAdvanceDays?: number
  createdAt: string
}

interface RestaurantContextValue {
  restaurant: Restaurant | null
  loading: boolean
  error: string | null
  setRestaurant: (r: Restaurant | null) => void
  refresh: () => void
}

export const RestaurantContext = createContext<RestaurantContextValue | null>(null)

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(() => {
    setLoading(true)
    api.get<Restaurant[]>('/api/restaurants/my')
      .then(data => {
        setRestaurant(Array.isArray(data) ? data[0] ?? null : null)
        setError(null)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return (
    <RestaurantContext.Provider value={{ restaurant, loading, error, setRestaurant, refresh: fetch }}>
      {children}
    </RestaurantContext.Provider>
  )
}

export function useRestaurant(): RestaurantContextValue {
  const ctx = useContext(RestaurantContext)
  if (!ctx) throw new Error('useRestaurant must be used inside RestaurantProvider')
  return ctx
}
