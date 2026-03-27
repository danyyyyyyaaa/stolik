import type { NormalizedRestaurant } from './restaurant'

export interface FilterState {
  priceLevels: number[]    // [] = any; [1], [2], [3] = specific levels
  minRating:   number | null
  cuisine:     string      // 'all' | 'polish' | 'italiana' | 'japanese' | 'french'
  availableNow: boolean
}

export const DEFAULT_FILTERS: FilterState = {
  priceLevels:  [],
  minRating:    null,
  cuisine:      'all',
  availableNow: false,
}

export function countActiveFilters(f: FilterState): number {
  let n = 0
  if (f.priceLevels.length > 0) n++
  if (f.minRating !== null) n++
  if (f.cuisine !== 'all') n++
  if (f.availableNow) n++
  return n
}

export function applyFilters(
  rests: NormalizedRestaurant[],
  filters: FilterState,
): NormalizedRestaurant[] {
  return rests.filter(r => {
    if (filters.priceLevels.length > 0) {
      const pl = (r as any).priceLevel as number | undefined
      if (pl === undefined || !filters.priceLevels.includes(pl)) return false
    }
    if (filters.minRating !== null && (r.rating ?? 0) < filters.minRating) return false
    if (filters.cuisine !== 'all' && r.cuisine !== filters.cuisine) return false
    if (filters.availableNow && (r as any).isOpen === false) return false
    return true
  })
}
