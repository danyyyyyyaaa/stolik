import type { Restaurant } from '../store/useAppStore'

export const CUISINE_EMOJI: Record<string, string> = {
  polska: '🥘', polish: '🥘', włoska: '🍝', italiana: '🍝', italian: '🍝',
  japońska: '🍱', japanese: '🍱', francuska: '🥂', french: '🥂',
  default: '🍽️',
}

export const CUISINE_COLOR: Record<string, string> = {
  polska: '#2D6A35', polish: '#2D6A35', włoska: '#C84B31', italiana: '#C84B31', italian: '#C84B31',
  japońska: '#C0392B', japanese: '#C0392B', francuska: '#8B5A2B', french: '#8B5A2B',
  default: '#238636',
}

export type NormalizedRestaurant = Restaurant & {
  emoji:    string
  color:    string
  open:     string
  price:    string
  desc:     string
}

export function normalizeRestaurant(r: Record<string, any>): NormalizedRestaurant {
  const cuisine = (r.cuisine ?? '').toLowerCase()
  return {
    id:         String(r.id ?? ''),
    name:       r.name ?? '',
    slug:       r.slug ?? String(r.id ?? ''),
    cuisine:    r.cuisine ?? '',
    district:   r.district ?? '',
    city:       r.city ?? '',
    address:    r.address ?? '',
    phone:      r.phone ?? '',
    priceRange: r.priceRange ?? r.price ?? '$$',
    rating:     typeof r.rating === 'number' ? r.rating : 4.5,
    openUntil:  r.openUntil ?? r.open ?? '22:00',
    emoji:      r.emoji || CUISINE_EMOJI[cuisine] || CUISINE_EMOJI.default,
    color:      r.color || CUISINE_COLOR[cuisine] || CUISINE_COLOR.default,
    open:       r.openUntil ?? r.open ?? '22:00',
    price:      r.priceRange ?? r.price ?? '$$',
    desc:       r.description ?? r.desc ?? '',
  }
}

export function buildDates(tonight: string, tomorrow: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().split('T')[0]
    let label: string
    if (i === 0)      label = tonight
    else if (i === 1) label = tomorrow
    else              label = d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })
    return { label, value: iso }
  })
}
