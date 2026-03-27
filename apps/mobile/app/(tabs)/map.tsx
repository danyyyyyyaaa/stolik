import React, { useEffect, useRef, useState } from 'react'
import {
  Animated, Image, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps'
import * as Location from 'expo-location'
import { useTheme } from '../../src/theme'
import { useLang } from '../../src/i18n'
import { useAppStore } from '../../src/store/useAppStore'
import { MOCK_RESTAURANTS } from '../../src/data/mockRestaurants'
import { RESTAURANT_COORDS } from '../../src/data/restaurantCoords'
import type { NormalizedRestaurant } from '../../src/utils/restaurant'

type Region = {
  latitude: number; longitude: number
  latitudeDelta: number; longitudeDelta: number
}

const WARSAW_CENTER: Region = {
  latitude: 52.2297, longitude: 21.0122,
  latitudeDelta: 0.12, longitudeDelta: 0.12,
}

const DARK_MAP_STYLE = [
  { elementType: 'geometry',            stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill',    stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke',  stylers: [{ color: '#1a3646' }] },
  { featureType: 'road', elementType: 'geometry',           stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'geometry.stroke',    stylers: [{ color: '#255763' }] },
  { featureType: 'road', elementType: 'labels.text.fill',   stylers: [{ color: '#98a5be' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
  { featureType: 'road.highway', elementType: 'geometry',        stylers: [{ color: '#2c6675' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke',  stylers: [{ color: '#255763' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b0d5ce' }] },
  { featureType: 'water', elementType: 'geometry',          stylers: [{ color: '#0e1626' }] },
  { featureType: 'water', elementType: 'labels.text.fill',  stylers: [{ color: '#4e6d70' }] },
  { featureType: 'poi',     stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#334e68' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9aa0a6' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#c4c4c4' }] },
]

function rImage(r: NormalizedRestaurant): string {
  return (r as any).image ?? `https://picsum.photos/seed/${r.id}/400/300`
}

function priceEuros(r: NormalizedRestaurant): string {
  const pl = (r as any).priceLevel
  if (typeof pl === 'number') return '€'.repeat(Math.min(pl, 3))
  return (r.price ?? '$$').replace(/\$/g, '€')
}

function isInRegion(lat: number, lng: number, region: Region): boolean {
  return (
    Math.abs(lat - region.latitude)  <= region.latitudeDelta  / 2 &&
    Math.abs(lng - region.longitude) <= region.longitudeDelta / 2
  )
}

// ─── Bottom restaurant card ───────────────────────────────────────────────────

function RestaurantCard({
  r, th, t, onDismiss,
}: {
  r: NormalizedRestaurant; th: any; t: any; onDismiss: () => void
}) {
  const slideY = useRef(new Animated.Value(220)).current

  useEffect(() => {
    Animated.spring(slideY, {
      toValue: 0, tension: 80, friction: 14, useNativeDriver: true,
    }).start()
  }, [])

  const isOpen      = (r as any).isOpen !== false
  const reviewCount = (r as any).reviewCount as number | undefined

  return (
    <Animated.View
      style={[mc.card, { backgroundColor: th.bgCard, transform: [{ translateY: slideY }] }]}
    >
      <View style={[mc.handle, { backgroundColor: th.border }]} />

      <View style={mc.row}>
        <Image source={{ uri: rImage(r) }} style={mc.thumb} resizeMode="cover" />

        <View style={mc.info}>
          <Text style={[mc.name, { color: th.text }]} numberOfLines={1}>{r.name}</Text>
          <Text style={[mc.meta, { color: th.textSub }]} numberOfLines={1}>
            {r.emoji}  {r.district}  ·  {priceEuros(r)}
          </Text>
          <View style={mc.starsRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <Feather
                key={i} name="star" size={11}
                color={i <= Math.round(r.rating) ? '#F0A500' : th.border}
              />
            ))}
            <Text style={[mc.rating, { color: th.textSub }]}>{r.rating.toFixed(1)}</Text>
            {reviewCount !== undefined && (
              <Text style={[mc.reviews, { color: th.textMuted }]}>({reviewCount})</Text>
            )}
          </View>
          {isOpen && (
            <View style={mc.openBadge}>
              <View style={mc.openDot} />
              <Text style={mc.openTxt}>{t.available_now}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={onDismiss} hitSlop={12} style={mc.closeBtn}>
          <Feather name="x" size={18} color={th.textMuted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => { onDismiss(); router.push(`/restaurant/${r.id}`) }}
        activeOpacity={0.85}
        style={[mc.reserveBtn, { backgroundColor: th.accent }]}
      >
        <Text style={mc.reserveTxt}>{t.reserve}</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

const mc = StyleSheet.create({
  card: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 6, paddingHorizontal: 16, paddingBottom: 32,
  },
  handle:   { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  row:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  thumb:    { width: 80, height: 80, borderRadius: 12 },
  info:     { flex: 1 },
  name:     { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  meta:     { fontSize: 12, marginBottom: 5 },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 6 },
  rating:   { fontSize: 12, fontWeight: '600', marginLeft: 4 },
  reviews:  { fontSize: 11 },
  openBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(26,127,55,0.18)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start',
  },
  openDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#238636' },
  openTxt:    { color: '#238636', fontSize: 11, fontWeight: '600' },
  closeBtn:   { paddingTop: 2 },
  reserveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 13, borderRadius: 12,
  },
  reserveTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
})

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const { th, themeKey } = useTheme()
  const { t }            = useLang()
  const storeRests       = useAppStore(s => s.restaurants)

  const mapRef = useRef<MapView>(null)
  const [region,   setRegion]   = useState<Region>(WARSAW_CENTER)
  const [selected, setSelected] = useState<NormalizedRestaurant | null>(null)

  const allRests: NormalizedRestaurant[] =
    storeRests.length > 0
      ? (storeRests as NormalizedRestaurant[])
      : (MOCK_RESTAURANTS as unknown as NormalizedRestaurant[])

  const visibleRests = allRests.filter(r => {
    const coords = RESTAURANT_COORDS[r.id]
    return coords ? isInRegion(coords.latitude, coords.longitude, region) : false
  })

  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const userRegion: Region = {
        latitude:      loc.coords.latitude,
        longitude:     loc.coords.longitude,
        latitudeDelta:  0.08,
        longitudeDelta: 0.08,
      }
      mapRef.current?.animateToRegion(userRegion, 800)
      setRegion(userRegion)
    })()
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: th.bg }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        initialRegion={WARSAW_CENTER}
        showsUserLocation
        showsMyLocationButton={false}
        customMapStyle={themeKey === 'dark' ? DARK_MAP_STYLE : []}
        onRegionChangeComplete={r => setRegion(r)}
        onPress={() => setSelected(null)}
      >
        {allRests.map(r => {
          const coords = RESTAURANT_COORDS[r.id]
          if (!coords) return null
          if (!isInRegion(coords.latitude, coords.longitude, region)) return null
          return (
            <Marker key={r.id} coordinate={coords} onPress={() => setSelected(r)}>
              <View style={[
                ms.pin,
                { backgroundColor: selected?.id === r.id ? th.accent : '#fff' },
              ]}>
                <Text style={ms.pinEmoji}>{r.emoji}</Text>
              </View>
            </Marker>
          )
        })}
      </MapView>

      {/* Header overlay */}
      <SafeAreaView edges={['top']} pointerEvents="box-none">
        <View style={[ms.header, { backgroundColor: th.navBg + 'E8' }]}>
          <Text style={[ms.headerTitle, { color: th.text }]}>{t.map_label}</Text>
          <View style={[ms.countBadge, { backgroundColor: th.accentBg }]}>
            <Text style={[ms.countTxt, { color: th.accentText }]}>{visibleRests.length}</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* My location button */}
      <TouchableOpacity
        style={[ms.locBtn, { backgroundColor: th.bgCard, borderColor: th.border }]}
        onPress={async () => {
          const { status } = await Location.requestForegroundPermissionsAsync()
          if (status !== 'granted') return
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          mapRef.current?.animateToRegion({
            latitude:      loc.coords.latitude,
            longitude:     loc.coords.longitude,
            latitudeDelta:  0.08,
            longitudeDelta: 0.08,
          }, 600)
        }}
        activeOpacity={0.8}
      >
        <Feather name="navigation" size={20} color={th.accent} />
      </TouchableOpacity>

      {/* Selected restaurant card */}
      {selected && (
        <RestaurantCard r={selected} th={th} t={t} onDismiss={() => setSelected(null)} />
      )}
    </View>
  )
}

const ms = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 8,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  countBadge:  { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  countTxt:    { fontSize: 12, fontWeight: '700' },
  pin: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.12)',
  },
  pinEmoji: { fontSize: 18 },
  locBtn: {
    position: 'absolute', bottom: 220, right: 16,
    width: 46, height: 46, borderRadius: 23, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 6, elevation: 4,
  },
})
