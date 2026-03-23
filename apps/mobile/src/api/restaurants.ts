import client from './client'
import type { Restaurant } from '../store/useAppStore'

export interface RestaurantFilters {
  cuisine?: string
  city?:    string
  search?:  string
}

export interface SlotsResponse {
  slots: string[]
  date:  string
}

export async function getRestaurants(filters?: RestaurantFilters): Promise<Restaurant[]> {
  const params: Record<string, string> = {}
  if (filters?.cuisine && filters.cuisine !== 'all') params.cuisine = filters.cuisine
  if (filters?.city)    params.city    = filters.city
  if (filters?.search)  params.search  = filters.search

  const { data } = await client.get<Restaurant[]>('/api/restaurants', { params })
  return Array.isArray(data) ? data : []
}

export async function getRestaurant(id: string): Promise<Restaurant> {
  const { data } = await client.get<Restaurant>(`/api/restaurants/${id}`)
  return data
}

export async function getSlots(
  restaurantId: string,
  date: string,
  guests: number
): Promise<string[]> {
  const { data } = await client.get<SlotsResponse>('/api/bookings/slots', {
    params: { restaurantId, date, guestCount: guests },
  })
  return data.slots ?? []
}
