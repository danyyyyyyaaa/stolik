'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export interface Restaurant {
  id: string
  name: string
  slug: string
  cuisine: string
  district: string
  city: string
  address: string
  phone?: string
  email?: string
  priceRange: string
  rating: number
  reviewCount: number
  coverImage?: string
  isActive: boolean
  isPublished: boolean
  plan: string
  status?: string
  ownerId: string
  createdAt: string
}

export function useMyRestaurant() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<Restaurant[]>('/api/restaurants')
      .then(data => {
        setRestaurant(Array.isArray(data) ? data[0] ?? null : null)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return { restaurant, loading, error, setRestaurant }
}
