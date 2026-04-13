import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable,
  ActivityIndicator, Platform, Animated, Image, PanResponder,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronDown, Search, List, Navigation, MapPin, ArrowRight } from 'lucide-react-native'
import { router } from 'expo-router'
import * as Location from 'expo-location'
import { useTheme, colors, shadows, radii } from '../../src/theme'
import { useLang } from '../../src/i18n'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DirectionsSheet from '../../src/components/DirectionsSheet'
import { CUISINE_EMOJI, CUISINE_COLOR } from '../../src/utils/restaurant'

const API      = process.env.EXPO_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'
const CITY_KEY = 'dinto_selected_city'
const CITIES   = [
  { name: 'Warszawa',  lat: 52.2297, lng: 21.0122, flag: '🇵🇱', active: true  },
  { name: 'București', lat: 44.4268, lng: 26.1025, flag: '🇷🇴', active: false },
]

let MapView: any = null, Marker: any = null, PROVIDER_GOOGLE: any = null
if (Platform.OS !== 'web') {
  try {
    const m = require('react-native-maps')
    MapView = m.default; Marker = m.Marker; PROVIDER_GOOGLE = m.PROVIDER_GOOGLE
  } catch {}
}

const SILVER_STYLE = [
  { elementType: 'geometry',             stylers: [{ color: '#f8f5f0' }] },
  { elementType: 'labels.icon',          stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill',     stylers: [{ color: '#6b7280' }] },
  { elementType: 'labels.text.stroke',   stylers: [{ color: '#f8f5f0' }] },
  { featureType: 'administrative',       elementType: 'geometry', stylers: [{ color: '#e5e0d8' }] },
  { featureType: 'poi',                  elementType: 'geometry', stylers: [{ color: '#ede8e0' }] },
  { featureType: 'poi.park',             elementType: 'geometry', stylers: [{ color: '#d4e8d0' }] },
  { featureType: 'poi.park',             elementType: 'labels.text.fill', stylers: [{ color: '#4a7c59' }] },
  { featureType: 'road',                 elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road',                 elementType: 'geometry.stroke', stylers: [{ color: '#e8e2da' }] },
  { featureType: 'road.arterial',        elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'road.highway',         elementType: 'geometry', stylers: [{ color: '#ede8df' }] },
  { featureType: 'road.highway',         elementType: 'geometry.stroke', stylers: [{ color: '#d9d2c8' }] },
  { featureType: 'road.local',           elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'transit.line',         elementType: 'geometry', stylers: [{ color: '#e8e2da' }] },
  { featureType: 'transit.station',      elementType: 'geometry', stylers: [{ color: '#ede8e0' }] },
  { featureType: 'water',                elementType: 'geometry', stylers: [{ color: '#b8d4e8' }] },
  { featureType: 'water',                elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function fmtDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

function cuisineIcon(cuisine: string): string {
  return CUISINE_EMOJI[(cuisine ?? '').toLowerCase()] ?? '🍽️'
}

function cuisineAccent(cuisine: string, fallback?: string): string {
  return fallback || CUISINE_COLOR[(cuisine ?? '').toLowerCase()] || colors.primary
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRow({ rating, reviewCount, size = 13 }: { rating: number; reviewCount?: number; size?: number }) {
  const rounded = Math.round(rating * 2) / 2  // half-star precision via rounding
  const full    = Math.floor(rounded)
  const hasHalf = rounded - full >= 0.5
  const empty   = 5 - full - (hasHalf ? 1 : 0)

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {Array.from({ length: full  }, (_, i) => <Text key={`f${i}`} style={[sr.star, { fontSize: size, color: '#F0A500' }]}>★</Text>)}
      {hasHalf && <Text style={[sr.star, { fontSize: size - 1, color: '#F0A500' }]}>⯨</Text>}
      {Array.from({ length: empty }, (_, i) => <Text key={`e${i}`} style={[sr.star, { fontSize: size, color: '#D1D5DB' }]}>★</Text>)}
      {rating > 0 && (
        <Text style={[sr.label, { fontSize: size - 1 }]}>
          {rating.toFixed(1)}
          {reviewCount != null && reviewCount > 0 ? ` (${reviewCount})` : ''}
        </Text>
      )}
    </View>
  )
}
const sr = StyleSheet.create({
  star:  { lineHeight: 18 },
  label: { color: '#6B7280', marginLeft: 4 },
})

// ─── Custom Marker ────────────────────────────────────────────────────────────
// pointerEvents="none" is REQUIRED — without it, the View absorbs touch events
// on Android and Marker's onPress never fires.

function RestaurantMarker({ r, selected }: { r: any; selected: boolean }) {
  const hasPhoto  = !!r.coverImage
  const icon      = r.emoji || cuisineIcon(r.cuisine)
  const accent    = cuisineAccent(r.cuisine, r.color)
  const showBadge = r.rating >= 4.0

  return (
    <View style={mk.root} pointerEvents="none">
      {/* Circle */}
      <View style={[
        mk.circle,
        selected ? mk.circleSelected : mk.circleDefault,
        selected && { borderColor: colors.primaryAccent },
        selected ? { ...shadows.lg, elevation: 8 } : { ...shadows.sm, elevation: 2 },
      ]}>
        {hasPhoto ? (
          <Image source={{ uri: r.coverImage }} style={mk.circleImg} />
        ) : (
          <View style={[mk.circleEmoji, { backgroundColor: accent + '22' }]}>
            <Text style={[mk.emojiTxt, { fontSize: selected ? 20 : 18 }]}>{icon}</Text>
          </View>
        )}
      </View>

      {/* Rating badge — 4.0+ only */}
      {showBadge && (
        <View style={mk.badge}>
          <Text style={mk.badgeStar}>★</Text>
          <Text style={mk.badgeTxt}>{r.rating.toFixed(1)}</Text>
        </View>
      )}

      {/* Drop shadow pointer */}
      <View style={[mk.pointer, {
        borderTopColor: selected ? colors.primaryAccent : '#fff',
      }]} />
    </View>
  )
}

const MARKER_SIZE     = 44
const MARKER_SELECTED = 54

const mk = StyleSheet.create({
  root:           { alignItems: 'center' },
  circle:         {
    width:        MARKER_SIZE,
    height:       MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    overflow:     'hidden',
    borderWidth:  2.5,
  },
  circleDefault:  { borderColor: '#fff',                transform: [{ scale: 1 }]   },
  circleSelected: { borderColor: colors.primaryAccent,  transform: [{ scale: 1.22 }] },
  circleImg:      { width: '100%', height: '100%' },
  circleEmoji:    { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  emojiTxt:       { lineHeight: MARKER_SIZE },
  pointer:        {
    width:           0,
    height:          0,
    borderLeftWidth:  5,
    borderRightWidth: 5,
    borderTopWidth:   6,
    borderLeftColor:  'transparent',
    borderRightColor: 'transparent',
    marginTop:        -1,
  },
  badge:          {
    position:        'absolute',
    top:             -6,
    right:           -10,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             2,
    backgroundColor: '#fff',
    borderRadius:    radii.full,
    paddingHorizontal: 5,
    paddingVertical: 2,
    ...shadows.sm,
    elevation: 2,
  },
  badgeStar:      { fontSize: 9, color: '#F0A500', lineHeight: 13 },
  badgeTxt:       { fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A1A', lineHeight: 13 },
})

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────

function BottomSheet({
  r, th, t, onClose, userLoc,
}: {
  r: any; th: any; t: any; onClose: () => void
  userLoc: { latitude: number; longitude: number } | null
}) {
  const slideY          = useRef(new Animated.Value(380)).current
  const panY            = useRef(new Animated.Value(0)).current
  const [showDir, setShowDir] = useState(false)

  const hasPhoto  = !!r.coverImage
  const icon      = r.emoji || cuisineIcon(r.cuisine)
  const accent    = cuisineAccent(r.cuisine, r.color)
  const hasCoords = !!(r.latitude && r.longitude)

  const distStr = (() => {
    if (!userLoc || !hasCoords) return null
    const km = haversine(userLoc.latitude, userLoc.longitude, r.latitude, r.longitude)
    return fmtDistance(km)
  })()

  // Spring slide-in on mount
  useEffect(() => {
    Animated.spring(slideY, {
      toValue:   0,
      tension:   65,
      friction:  11,
      useNativeDriver: true,
    }).start()
  }, [])

  // PanResponder: swipe down → dismiss, swipe up → navigate to detail
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy, dx }) => Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx),
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0)      panY.setValue(dy)
        else if (dy < 0) panY.setValue(dy * 0.25)  // resist upward pull
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 70 || vy > 0.6) {
          Animated.timing(panY, { toValue: 420, duration: 200, useNativeDriver: true }).start(onClose)
        } else if (dy < -60) {
          Animated.spring(panY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }).start()
          router.push({ pathname: '/restaurant/[id]', params: { id: r.id } })
        } else {
          Animated.spring(panY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }).start()
        }
      },
    })
  ).current

  const translateY = Animated.add(slideY, panY)

  return (
    <>
      <Animated.View
        style={[bs.sheet, { backgroundColor: th.bgCard, transform: [{ translateY }] }, shadows.xl]}
        {...pan.panHandlers}
      >
        {/* Drag handle */}
        <View style={[bs.handle, { backgroundColor: th.border }]} />

        {/* Cover photo / emoji header — tap to open restaurant detail */}
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: r.id } })}
          activeOpacity={0.92}
          style={bs.coverArea}
        >
          {hasPhoto ? (
            <Image source={{ uri: r.coverImage }} style={bs.coverImg} resizeMode="cover" />
          ) : (
            <View style={[bs.coverEmoji, { backgroundColor: accent + '18' }]}>
              <Text style={bs.coverEmojiTxt}>{icon}</Text>
            </View>
          )}
          {/* Dark scrim for readability */}
          {hasPhoto && <View style={bs.coverScrim} />}

          {/* Close button */}
          <TouchableOpacity onPress={onClose} style={bs.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={bs.closeTxt}>✕</Text>
          </TouchableOpacity>

          {/* "Swipe up for details" hint */}
          <View style={bs.swipeHint}>
            <Text style={bs.swipeHintTxt}>↑  {t.view_restaurant ?? 'View restaurant'}</Text>
          </View>
        </TouchableOpacity>

        {/* Info content */}
        <View style={bs.content}>
          {/* Name + cuisine row */}
          <View style={bs.nameRow}>
            {!hasPhoto && (
              <View style={[bs.emojiBadge, { backgroundColor: accent + '1A' }]}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[bs.name, { color: th.text }]} numberOfLines={1}>{r.name}</Text>
              <Text style={[bs.sub, { color: th.textSub }]}>
                {r.cuisine}{r.cuisine && r.priceRange ? ' · ' : ''}{r.priceRange}
              </Text>
            </View>
          </View>

          {/* Stars */}
          {r.rating > 0 && (
            <StarRow rating={r.rating} reviewCount={r.reviewCount} size={14} />
          )}

          {/* Address + distance */}
          <View style={bs.metaRow}>
            {r.address && (
              <View style={bs.metaItem}>
                <MapPin size={13} color={th.textMuted} strokeWidth={1.75} />
                <Text style={[bs.metaTxt, { color: th.textSub }]} numberOfLines={1}>{r.address}</Text>
              </View>
            )}
            {distStr && (
              <View style={[bs.distancePill, { backgroundColor: th.accentBg }]}>
                <Text style={[bs.distanceTxt, { color: th.accent }]}>{distStr} away</Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          <View style={bs.btnRow}>
            {/* Directions — outlined */}
            {(hasCoords || r.address) && (
              <TouchableOpacity
                onPress={() => setShowDir(true)}
                activeOpacity={0.8}
                style={[bs.dirBtn, { borderColor: th.border, backgroundColor: th.bgCardAlt }]}
              >
                <Navigation size={15} color={th.text} strokeWidth={1.75} />
                <Text style={[bs.dirBtnTxt, { color: th.text }]}>{t.get_directions}</Text>
              </TouchableOpacity>
            )}

            {/* Book a table — filled green */}
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: r.id } })}
              activeOpacity={0.85}
              style={[bs.bookBtn, { flex: hasCoords || r.address ? 1 : undefined, width: hasCoords || r.address ? undefined : '100%' }]}
            >
              <Text style={bs.bookTxt}>{t.reserve}</Text>
              <ArrowRight size={15} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <DirectionsSheet
        visible={showDir}
        name={r.name}
        address={r.address}
        lat={r.latitude}
        lng={r.longitude}
        googlePlaceId={r.googlePlaceId}
        t={t}
        onClose={() => setShowDir(false)}
      />
    </>
  )
}

const bs = StyleSheet.create({
  sheet:       {
    position:          'absolute',
    bottom:            0,
    left:              0,
    right:             0,
    borderTopLeftRadius:  radii.xl,
    borderTopRightRadius: radii.xl,
    overflow:          'hidden',
    // Extra shadow on top edge
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: -4 },
    shadowOpacity:     0.12,
    shadowRadius:      20,
    elevation:         14,
  },
  handle:      { width: 40, height: 4, borderRadius: radii.full, alignSelf: 'center', marginTop: 10, marginBottom: 0 },
  coverArea:   { height: 130, position: 'relative', overflow: 'hidden' },
  coverImg:    { width: '100%', height: '100%' },
  coverEmoji:  { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  coverEmojiTxt: { fontSize: 56 },
  coverScrim:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  closeBtn:    {
    position:        'absolute',
    top:             10,
    right:           14,
    width:           30,
    height:          30,
    borderRadius:    15,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  closeTxt:    { color: '#fff', fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' },
  swipeHint:   {
    position:        'absolute',
    bottom:          10,
    left:            0,
    right:           0,
    alignItems:      'center',
  },
  swipeHintTxt: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium' },
  content:     { padding: 16, paddingBottom: 28, gap: 10 },
  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emojiBadge:  { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  name:        { fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 2 },
  sub:         { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#888' },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 },
  metaTxt:     { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', flex: 1 },
  distancePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.full },
  distanceTxt:  { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold' },
  btnRow:      { flexDirection: 'row', gap: 10, marginTop: 4 },
  dirBtn:      {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              7,
    paddingHorizontal: 16,
    paddingVertical:  14,
    borderRadius:     radii.md,
    borderWidth:      1,
    minHeight:        48,
  },
  dirBtnTxt:   { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold' },
  bookBtn:     {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             7,
    paddingVertical: 14,
    borderRadius:    radii.md,
    backgroundColor: colors.primary,
    minHeight:       48,
  },
  bookTxt:     { color: '#fff', fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold' },
})

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const { th }  = useTheme()
  const { t }   = useLang()
  const mapRef  = useRef<any>(null)

  const [restaurants, setRestaurants] = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState<any>(null)
  const [trackAll,    setTrackAll]    = useState(false)  // briefly true after selection change
  const [city,        setCity]        = useState(CITIES[0])
  const [showPicker,  setShowPicker]  = useState(false)
  const [userLoc,     setUserLoc]     = useState<{ latitude: number; longitude: number } | null>(null)

  useEffect(() => {
    AsyncStorage.getItem(CITY_KEY).then(s => {
      if (s) { const f = CITIES.find(c => c.name === s && c.active); if (f) setCity(f) }
    })
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(pos => {
          setUserLoc({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
          mapRef.current?.animateToRegion({
            latitude:      pos.coords.latitude,
            longitude:     pos.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 600)
        }).catch(() => {})
      }
    }).catch(() => {})
    const ctrl  = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 10000)
    fetch(`${API}/api/restaurants`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => setRestaurants(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => { clearTimeout(timer); setLoading(false) })
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [])

  function handleMarkerPress(r: any) {
    setSelected(r)
    // Briefly allow all markers to re-render so deselected marker scales back down
    setTrackAll(true)
    setTimeout(() => setTrackAll(false), 400)
  }

  function selectCity(c: typeof CITIES[0]) {
    if (!c.active) return
    setCity(c)
    AsyncStorage.setItem(CITY_KEY, c.name)
    setShowPicker(false)
    mapRef.current?.animateToRegion(
      { latitude: c.lat, longitude: c.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 },
      600,
    )
  }

  function goToMyLocation() {
    if (userLoc) {
      mapRef.current?.animateToRegion({ ...userLoc, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 500)
    } else {
      Location.requestForegroundPermissionsAsync().then(({ status }) => {
        if (status === 'granted') {
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(pos => {
            const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
            setUserLoc(loc)
            mapRef.current?.animateToRegion({ ...loc, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 500)
          }).catch(() => {})
        }
      }).catch(() => {})
    }
  }

  function getCoords(r: any, idx: number) {
    if (r.latitude && r.longitude) return { latitude: r.latitude, longitude: r.longitude }
    const off = idx * 0.003
    return { latitude: city.lat + off % 0.04, longitude: city.lng + (off * 1.3) % 0.04 }
  }

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: th.bg }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🗺️</Text>
          <Text style={{ color: th.textSub, fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center' }}>
            Map available in mobile app
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <View style={s.safe}>
      {/* Header */}
      <SafeAreaView
        style={[s.hdr, { backgroundColor: th.bgCard }, shadows.md, { shadowOffset: { width: 0, height: 2 } }]}
        edges={['top']}
      >
        <TouchableOpacity onPress={() => setShowPicker(true)} style={s.cityBtn}>
          <Text style={[s.cityNm, { color: th.text }]}>{city.name}</Text>
          <ChevronDown size={16} color={th.textMuted} />
        </TouchableOpacity>
        <View style={s.headerActions}>
          <TouchableOpacity
            onPress={() => router.navigate('/(tabs)/search')}
            style={[s.iconBtn, { backgroundColor: th.bgCardAlt, borderColor: th.border }]}
          >
            <Search size={16} color={th.textSub} strokeWidth={1.75} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.iconBtn, { backgroundColor: th.bgCardAlt, borderColor: th.border }]}
          >
            <List size={16} color={th.textSub} strokeWidth={1.75} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={goToMyLocation}
            style={[s.iconBtn, { backgroundColor: th.bgCardAlt, borderColor: th.border }]}
          >
            <Navigation size={16} color={userLoc ? colors.primary : th.textSub} strokeWidth={1.75} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        MapView && (
          <MapView
            ref={mapRef}
            style={s.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{ latitude: city.lat, longitude: city.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
            customMapStyle={SILVER_STYLE}
            onPress={() => setSelected(null)}
          >
            {restaurants.map((r, i) => (
              <Marker
                key={r.id}
                coordinate={getCoords(r, i)}
                onPress={(e: any) => { e.stopPropagation?.(); handleMarkerPress(r) }}
                tracksViewChanges={trackAll || selected?.id === r.id}
              >
                <RestaurantMarker r={r} selected={selected?.id === r.id} />
              </Marker>
            ))}
          </MapView>
        )
      )}

      {/* Bottom sheet */}
      {selected && (
        <BottomSheet
          r={selected}
          th={th}
          t={t}
          onClose={() => setSelected(null)}
          userLoc={userLoc}
        />
      )}

      {/* City picker modal */}
      <Modal visible={showPicker} transparent animationType="fade">
        <Pressable style={s.mOverlay} onPress={() => setShowPicker(false)}>
          <View style={[s.picker, { backgroundColor: th.bgCard, borderColor: th.border }, shadows.lg]}>
            <Text style={[s.pickerTitle, { color: th.text }]}>{t.select_city ?? 'Select city'}</Text>
            {CITIES.map(c => (
              <TouchableOpacity
                key={c.name}
                onPress={() => selectCity(c)}
                disabled={!c.active}
                style={[s.cityOpt, { borderBottomColor: th.border, opacity: c.active ? 1 : 0.5 }]}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 18, marginRight: 8 }}>{c.flag}</Text>
                <Text style={[s.cityOptTx, { color: c.name === city.name ? colors.primary : c.active ? th.text : th.textSub, flex: 1 }]}>
                  {c.name === city.name ? '✓ ' : ''}{c.name}
                </Text>
                {!c.active && (
                  <Text style={[s.comingSoon, { color: th.textMuted }]}>{t.coming_soon}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  hdr:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  cityBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cityNm:       { fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold' },
  headerActions:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn:      { width: 36, height: 36, borderRadius: radii.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  map:          { flex: 1 },
  mOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 40 },
  picker:       { borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' },
  pickerTitle:  { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', padding: 16, paddingBottom: 8 },
  cityOpt:      { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  cityOptTx:    { fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium' },
  comingSoon:   { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular' },
})
