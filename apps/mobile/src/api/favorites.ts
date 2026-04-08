import client from './client'
import type { Restaurant } from '../store/useAppStore'

export async function getFavorites(): Promise<Restaurant[]> {
  const { data } = await client.get<Restaurant[]>('/api/favorites')
  return Array.isArray(data) ? data : []
}

export async function getFavoriteIds(): Promise<string[]> {
  const { data } = await client.get<string[]>('/api/favorites/ids')
  return Array.isArray(data) ? data : []
}

export async function toggleFavorite(restaurantId: string): Promise<{ favorited: boolean }> {
  const { data } = await client.post<{ favorited: boolean }>(`/api/favorites/${restaurantId}`)
  return data
}
