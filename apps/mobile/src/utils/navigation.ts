import { Linking, Platform } from 'react-native'

// ─── App definitions ──────────────────────────────────────────────────────────

export interface NavApp {
  id:     'google' | 'apple' | 'waze' | 'uber' | 'bolt' | 'citymapper'
  name:   string
  emoji:  string
  scheme: string
}

const NAV_APPS: NavApp[] = [
  { id: 'google',     name: 'Google Maps', emoji: '🗺️', scheme: 'comgooglemaps://' },
  { id: 'apple',      name: 'Apple Maps',  emoji: '🍎', scheme: 'maps://'           },
  { id: 'waze',       name: 'Waze',        emoji: '🚗', scheme: 'waze://'           },
  { id: 'uber',       name: 'Uber',        emoji: '🚕', scheme: 'uber://'           },
  { id: 'bolt',       name: 'Bolt',        emoji: '⚡', scheme: 'bolt://'           },
  { id: 'citymapper', name: 'Citymapper',  emoji: '🗺', scheme: 'citymapper://'     },
]

// ─── Deeplink builders ────────────────────────────────────────────────────────

export function buildDeeplink(
  app: NavApp['id'],
  lat: number,
  lng: number,
  name: string,
): string {
  const n = encodeURIComponent(name)

  switch (app) {
    case 'google':
      return `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`
    case 'apple':
      return `maps://?daddr=${lat},${lng}&dirflg=d`
    case 'waze':
      return `waze://?ll=${lat},${lng}&navigate=yes`
    case 'uber':
      return `uber://?action=setPickup&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${n}`
    case 'bolt':
      return `bolt://r?dest_lat=${lat}&dest_lng=${lng}`
    case 'citymapper':
      return `citymapper://directions?endcoord=${lat},${lng}&endname=${n}`
  }
}

export function buildFallbackUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

export function buildGeoIntent(lat: number, lng: number, name: string): string {
  return `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(name)})`
}

// ─── Available apps (iOS only — Android uses geo: intent) ────────────────────

export async function checkAvailableApps(): Promise<NavApp[]> {
  if (Platform.OS !== 'ios') return []

  const results = await Promise.all(
    NAV_APPS.map(async app => {
      try {
        const ok = await Linking.canOpenURL(app.scheme)
        return ok ? app : null
      } catch {
        return null
      }
    }),
  )

  const available = results.filter((a): a is NavApp => a !== null)

  // Apple Maps is always available on iOS — ensure it's in the list
  if (!available.find(a => a.id === 'apple')) {
    const apple = NAV_APPS.find(a => a.id === 'apple')!
    available.push(apple)
  }

  return available
}

// ─── Open directions ──────────────────────────────────────────────────────────

export async function openDirections(
  app: NavApp['id'],
  lat: number,
  lng: number,
  name: string,
): Promise<void> {
  const deeplink = buildDeeplink(app, lat, lng, name)
  const fallback = buildFallbackUrl(lat, lng)

  try {
    const canOpen = await Linking.canOpenURL(deeplink)
    await Linking.openURL(canOpen ? deeplink : fallback)
  } catch {
    // Last resort: Google Maps web
    try { await Linking.openURL(fallback) } catch {}
  }
}

// ─── Android: open with native chooser ───────────────────────────────────────

export async function openDirectionsAndroid(
  lat: number,
  lng: number,
  name: string,
): Promise<void> {
  const geoUrl     = buildGeoIntent(lat, lng, name)
  const fallbackUrl = buildFallbackUrl(lat, lng)

  try {
    await Linking.openURL(geoUrl)
  } catch {
    try { await Linking.openURL(fallbackUrl) } catch {}
  }
}
