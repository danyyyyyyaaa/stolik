export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

export const PLANS = {
  free:     { name: 'Free',     price: 0,   color: 'text-muted' },
  pro:      { name: 'Pro',      price: 149, color: 'text-accent' },
  business: { name: 'Business', price: 349, color: 'text-amber' },
} as const

export const BOOKING_STATUSES = {
  pending:   { label: 'Pending',   color: 'bg-warning/20 text-warning' },
  confirmed: { label: 'Confirmed', color: 'bg-success/20 text-success' },
  cancelled: { label: 'Cancelled', color: 'bg-error/20 text-error' },
  completed: { label: 'Completed', color: 'bg-muted/20 text-muted' },
  no_show:   { label: 'No-show',   color: 'bg-amber/20 text-amber' },
} as const

export const USER_ROLES = {
  guest:             'Guest',
  owner:             'Owner',
  restaurant_owner:  'Restaurant Owner',
  manager:           'Manager',
  staff:             'Staff',
  admin:             'Admin',
  super_admin:       'Super Admin',
} as const

export const CUISINES = [
  'Polish', 'Italian', 'Japanese', 'French', 'Georgian',
  'American', 'Mediterranean', 'Asian', 'Mexican', 'Indian',
] as const

export const DISTRICTS = [
  'Śródmieście', 'Mokotów', 'Wola', 'Praga-Południe', 'Ursynów',
  'Żoliborz', 'Ochota', 'Targówek', 'Bemowo', 'Bielany',
] as const
