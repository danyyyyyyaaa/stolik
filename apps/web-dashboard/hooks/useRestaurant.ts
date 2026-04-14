'use client'
/**
 * useMyRestaurant — reads from RestaurantContext (set up in DashboardLayout + MenuLayout).
 * All call sites live inside those layouts, so the provider is always present.
 */
import { useRestaurant } from '@/context/RestaurantContext'

export type { Restaurant } from '@/context/RestaurantContext'

export function useMyRestaurant() {
  return useRestaurant()
}
