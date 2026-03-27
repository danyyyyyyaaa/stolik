'use client'
import React, { useEffect, useRef, useState } from 'react'
import {
  Animated, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'

import { useLang } from '../../src/i18n'
import { useAppStore } from '../../src/store/useAppStore'
import { MOCK_RESTAURANTS } from '../../src/data/mockRestaurants'
import { RESTAURANT_COORDS } from '../../src/data/restaurantCoords'
import { Stars } from '../../src/components/Stars'
import type { NormalizedRestaurant } from '../../src/utils/restaurant'

// ─── constants ────────────────────────────────────────────────────────────────

const BRAND   = '#2D6A35'
const BRAND_BG = 'rgba(45,106,53,0.10)'

// ─── helpers ──────────────────────────────────────────────────────────────────

function priceEuros(r: NormalizedRestaurant): string {
  const pl = (r as any).priceLevel
  if (typeof pl === 'number') return '€'.repeat(Math.min(pl, 3))
  return (r.price ?? '$$').replace(/\$/g, '€')
}

function makeIcon(L: any, emoji: string, active: boolean) {
  const size   = active ? 48 : 40
  const anchor = size / 2
  return L.divIcon({
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:${size}px;height:${size}px;border-radius:50%;
      background:${active ? '#fff' : BRAND};
      border:${active ? `3px solid ${BRAND}` : '2.5px solid #fff'};
      box-shadow:0 ${active ? 6 : 3}px ${active ? 20 : 10}px rgba(0,0,0,${active ? 0.28 : 0.22});
      font-size:${active ? 24 : 20}px;line-height:1;cursor:pointer;
      transition:all .15s ease;
    ">${emoji}</div>`,
    className:  '',
    iconSize:   [size, size],
    iconAnchor: [anchor, anchor],
  })
}

// ─── main component ───────────────────────────────────────────────────────────

export default function MapScreen() {
  const { t }      = useLang()
  const insets     = useSafeAreaInsets()
  const storeRests = useAppStore(s => s.restaurants)

  const [query,    setQuery]    = useState('')
  const [selected, setSelected] = useState<NormalizedRestaurant | null>(null)
  const sheetAnim               = useRef(new Animated.Value(340)).current

  // Vanilla Leaflet refs — zero static import, browser-only access
  const mapDivRef      = useRef<HTMLDivElement>(null)
  const leafletRef     = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef     = useRef<Map<string, any>>(new Map())
  const selectedIdRef  = useRef<string | null>(null)
  const allRestsRef    = useRef<NormalizedRestaurant[]>([])

  const allRests: NormalizedRestaurant[] =
    storeRests.length > 0
      ? (storeRests as NormalizedRestaurant[])
      : (MOCK_RESTAURANTS as unknown as NormalizedRestaurant[])

  allRestsRef.current = allRests

  const filtered = query.trim()
    ? allRests.filter(r =>
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        (r.district ?? '').toLowerCase().includes(query.toLowerCase()),
      )
    : allRests

  // ── Inject Leaflet CSS once ──────────────────────────────────────────────
  useEffect(() => {
    const id = 'leaflet-css'
    if (document.getElementById(id)) return
    document.head.appendChild(
      Object.assign(document.createElement('link'), {
        id, rel: 'stylesheet',
        href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
      })
    )
    // Override Leaflet default styles
    const style = document.createElement('style')
    style.textContent = `
      .leaflet-container:focus{outline:none}
      .leaflet-control-zoom{border:none!important;box-shadow:0 2px 10px rgba(0,0,0,0.14)!important;border-radius:10px!important;overflow:hidden}
      .leaflet-control-zoom a{background:#fff!important;color:#333!important;border:none!important;width:34px!important;height:34px!important;line-height:34px!important;font-size:18px!important}
      .leaflet-control-zoom a:hover{background:#f5f5f5!important;color:${BRAND}!important}
      .leaflet-control-attribution{font-size:9px!important;background:rgba(255,255,255,0.7)!important;padding:2px 6px!important;border-radius:4px 0 0 0!important}
    `
    document.head.appendChild(style)
  }, [])

  // ── Init map once ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current || mapInstanceRef.current) return

    import('leaflet').then(({ default: L }) => {
      leafletRef.current = L

      const map = L.map(mapDivRef.current!, {
        center:       [52.2297, 21.0122],
        zoom:         13,
        zoomControl:  false,
        attributionControl: false,
      })
      mapInstanceRef.current = map

      // Light tiles — CartoDB Positron
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          maxZoom: 19,
        },
      ).addTo(map)

      // Compact attribution in the corner
      L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map)

      // Custom zoom control — top-right, styled below via CSS
      L.control.zoom({ position: 'topright' }).addTo(map)

      // Deselect on map background click
      map.on('click', () => {
        markersRef.current.forEach((marker, id) => {
          const r = allRestsRef.current.find(x => x.id === id)
          if (r) marker.setIcon(makeIcon(L, r.emoji ?? '🍽️', false))
        })
        selectedIdRef.current = null
        setSelected(null)
      })
    })

    return () => {
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
      markersRef.current.clear()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync markers with filtered list ─────────────────────────────────────
  useEffect(() => {
    const L   = leafletRef.current
    const map = mapInstanceRef.current
    if (!L || !map) return

    const existing   = new Set(markersRef.current.keys())
    const filteredIds = new Set(filtered.map(r => r.id))

    // Remove stale markers
    existing.forEach(id => {
      if (!filteredIds.has(id)) {
        markersRef.current.get(id)?.remove()
        markersRef.current.delete(id)
        if (selectedIdRef.current === id) {
          selectedIdRef.current = null
          setSelected(null)
        }
      }
    })

    // Add new / update existing
    filtered.forEach(r => {
      const coords = RESTAURANT_COORDS[r.id]
      if (!coords) return

      const isActive = selectedIdRef.current === r.id
      const icon     = makeIcon(L, r.emoji ?? '🍽️', isActive)

      if (markersRef.current.has(r.id)) {
        markersRef.current.get(r.id)!.setIcon(icon)
        return
      }

      const marker = L.marker([coords.latitude, coords.longitude], { icon })
      marker.on('click', (e: any) => {
        e.originalEvent?.stopPropagation()

        // Deactivate previous
        if (selectedIdRef.current && selectedIdRef.current !== r.id) {
          const prev     = markersRef.current.get(selectedIdRef.current)
          const prevRest = allRestsRef.current.find(x => x.id === selectedIdRef.current)
          if (prev && prevRest) prev.setIcon(makeIcon(L, prevRest.emoji ?? '🍽️', false))
        }

        if (selectedIdRef.current === r.id) {
          marker.setIcon(makeIcon(L, r.emoji ?? '🍽️', false))
          selectedIdRef.current = null
          setSelected(null)
        } else {
          marker.setIcon(makeIcon(L, r.emoji ?? '🍽️', true))
          selectedIdRef.current = r.id
          setSelected(r)
        }
      })
      marker.addTo(map)
      markersRef.current.set(r.id, marker)
    })
  }, [filtered]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bottom sheet animation ───────────────────────────────────────────────
  useEffect(() => {
    Animated.spring(sheetAnim, {
      toValue:        selected ? 0 : 340,
      useNativeDriver: true,
      friction:       10,
      tension:        72,
    }).start()
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  function closeSheet() {
    const L = leafletRef.current
    if (L && selectedIdRef.current) {
      const prev     = markersRef.current.get(selectedIdRef.current)
      const prevRest = allRestsRef.current.find(x => x.id === selectedIdRef.current)
      if (prev && prevRest) prev.setIcon(makeIcon(L, prevRest.emoji ?? '🍽️', false))
    }
    selectedIdRef.current = null
    setSelected(null)
  }

  const reviews = selected ? (selected as any).reviewCount as number | undefined : undefined
  const isOpen  = selected ? (selected as any).isOpen !== false : false

  return (
    <View style={s.root}>

      {/* ── Full-screen map ────────────────────────────────────── */}
      <div ref={mapDivRef} style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%', zIndex: 0,
      }} />

      {/* ── Search bar ─────────────────────────────────────────── */}
      <View
        pointerEvents="box-none"
        style={[s.searchWrap, { paddingTop: insets.top + 12 }]}
      >
        <View style={s.searchCard}>
          <Feather name="search" size={16} color="#888" />
          <TextInput
            style={s.searchInput as any}
            placeholder={t.map_search_placeholder}
            placeholderTextColor="#aaa"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Feather name="x" size={15} color="#aaa" />
            </TouchableOpacity>
          )}
          <View style={s.countPill}>
            <Text style={s.countTxt}>{filtered.length}</Text>
          </View>
        </View>
      </View>

      {/* ── Bottom sheet ───────────────────────────────────────── */}
      <Animated.View
        pointerEvents={selected ? 'auto' : 'none'}
        style={[s.sheet, { transform: [{ translateY: sheetAnim }] }]}
      >
        {selected && (
          <>
            {/* Handle */}
            <View style={s.handle} />

            {/* Close */}
            <TouchableOpacity style={s.closeBtn} onPress={closeSheet} hitSlop={10}>
              <Feather name="x" size={17} color="#666" />
            </TouchableOpacity>

            {/* Restaurant header */}
            <View style={s.sheetHeader}>
              <View style={[s.emojiCircle, { backgroundColor: BRAND_BG }]}>
                <Text style={s.emojiLarge}>{selected.emoji ?? '🍽️'}</Text>
              </View>
              <View style={s.sheetHeaderText}>
                <Text style={s.sheetName} numberOfLines={1}>{selected.name}</Text>
                <View style={s.metaRow}>
                  <Text style={s.metaCuisine}>
                    {(selected as any).cuisine ?? ''}
                  </Text>
                  {selected.district ? (
                    <>
                      <Text style={s.metaDot}>·</Text>
                      <Text style={s.metaDistrict}>{selected.district}</Text>
                    </>
                  ) : null}
                  <Text style={s.metaDot}>·</Text>
                  <Text style={s.metaPrice}>{priceEuros(selected)}</Text>
                </View>
                <View style={s.ratingRow}>
                  <Stars rating={selected.rating} size={13} />
                  <Text style={s.ratingNum}>{selected.rating.toFixed(1)}</Text>
                  {reviews !== undefined && (
                    <Text style={s.reviewsCount}>({reviews} {t.rating})</Text>
                  )}
                  {isOpen && (
                    <View style={s.openPill}>
                      <View style={s.openDot} />
                      <Text style={s.openTxt}>{t.available_now}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Reserve button */}
            <TouchableOpacity
              style={s.reserveBtn}
              activeOpacity={0.88}
              onPress={() => {
                closeSheet()
                router.push(`/restaurant/${selected.id}`)
              }}
            >
              <Text style={s.reserveTxt}>{t.reserve}</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>
    </View>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f0f0' },

  // Search bar
  searchWrap: {
    position:      'absolute',
    top:           0, left: 0, right: 0,
    paddingHorizontal: 16,
    zIndex:        10,
    pointerEvents: 'box-none',
  } as any,
  searchCard: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
    backgroundColor: '#fff',
    borderRadius:   14,
    paddingHorizontal: 14,
    paddingVertical:   11,
    ...({ boxShadow: '0 2px 14px rgba(0,0,0,0.13)' } as any),
  },
  searchInput: {
    flex:       1,
    fontSize:   14,
    color:      '#222',
    outlineWidth: 0,
    fontFamily: 'inherit',
  },
  countPill: {
    backgroundColor: BRAND_BG,
    borderRadius:    20,
    paddingHorizontal: 8,
    paddingVertical:   2,
  },
  countTxt: { fontSize: 12, fontWeight: '700', color: BRAND },

  // Bottom sheet
  sheet: {
    position:            'absolute',
    bottom:              0, left: 0, right: 0,
    backgroundColor:     '#fff',
    borderTopLeftRadius:  22,
    borderTopRightRadius: 22,
    paddingHorizontal:   22,
    paddingTop:          12,
    paddingBottom:       36,
    gap:                 14,
    zIndex:              20,
    ...({ boxShadow: '0 -4px 32px rgba(0,0,0,0.13)' } as any),
  },
  handle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginBottom: 4,
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 18,
    padding: 4,
    backgroundColor: '#f4f4f4',
    borderRadius: 20,
  },

  // Restaurant header inside sheet
  sheetHeader: {
    flexDirection: 'row',
    gap:           14,
    alignItems:    'flex-start',
  },
  emojiCircle: {
    width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  emojiLarge:     { fontSize: 28 },
  sheetHeaderText:{ flex: 1, gap: 3, marginRight: 32 },
  sheetName:      { fontSize: 17, fontWeight: '800', color: '#111', letterSpacing: -0.3 },

  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 1 },
  metaCuisine:{ fontSize: 13, color: '#555', textTransform: 'capitalize' },
  metaDot:    { fontSize: 13, color: '#bbb' },
  metaDistrict:{ fontSize: 13, color: '#555' },
  metaPrice:  { fontSize: 13, fontWeight: '700', color: BRAND },

  ratingRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3, flexWrap: 'wrap' },
  ratingNum:    { fontSize: 13, fontWeight: '700', color: '#333' },
  reviewsCount: { fontSize: 12, color: '#888' },

  openPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(45,106,53,0.12)',
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 20,
  },
  openDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: BRAND },
  openTxt: { color: BRAND, fontSize: 11, fontWeight: '600' },

  // CTA
  reserveBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:             8,
    backgroundColor: BRAND,
    paddingVertical: 14,
    borderRadius:    13,
    marginTop:       2,
    ...({ boxShadow: `0 4px 14px rgba(45,106,53,0.30)` } as any),
  },
  reserveTxt: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
})
