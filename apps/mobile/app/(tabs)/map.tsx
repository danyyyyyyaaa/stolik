import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable,
  ActivityIndicator, Platform, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronDown, Search, List, Navigation, Star, MapPin } from 'lucide-react-native'
import { router } from 'expo-router'
import { useTheme, colors, shadows, radii } from '../../src/theme'
import { useLang } from '../../src/i18n'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API = process.env.EXPO_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'
const CITY_KEY = 'stolik_selected_city'
const CITIES = [
  { name: 'Warszawa', lat: 52.2297, lng: 21.0122 },
  { name: 'Kraków',   lat: 50.0647, lng: 19.9450 },
  { name: 'Wrocław',  lat: 51.1079, lng: 17.0385 },
  { name: 'Gdańsk',   lat: 54.3520, lng: 18.6466 },
  { name: 'Poznań',   lat: 52.4064, lng: 16.9252 },
]

let MapView: any = null, Marker: any = null, PROVIDER_GOOGLE: any = null
if (Platform.OS !== 'web') {
  try {
    const m = require('react-native-maps')
    MapView = m.default; Marker = m.Marker; PROVIDER_GOOGLE = m.PROVIDER_GOOGLE
  } catch {}
}

// Silver/retro light map style — warm minimalism
const SILVER_STYLE = [
  { elementType: 'geometry',                  stylers: [{ color: '#f8f5f0' }] },
  { elementType: 'labels.icon',               stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill',          stylers: [{ color: '#6b7280' }] },
  { elementType: 'labels.text.stroke',        stylers: [{ color: '#f8f5f0' }] },
  { featureType: 'administrative',            elementType: 'geometry', stylers: [{ color: '#e5e0d8' }] },
  { featureType: 'poi',                       elementType: 'geometry', stylers: [{ color: '#ede8e0' }] },
  { featureType: 'poi.park',                  elementType: 'geometry', stylers: [{ color: '#d4e8d0' }] },
  { featureType: 'poi.park',                  elementType: 'labels.text.fill', stylers: [{ color: '#4a7c59' }] },
  { featureType: 'road',                      elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road',                      elementType: 'geometry.stroke', stylers: [{ color: '#e8e2da' }] },
  { featureType: 'road.arterial',             elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'road.highway',              elementType: 'geometry', stylers: [{ color: '#ede8df' }] },
  { featureType: 'road.highway',              elementType: 'geometry.stroke', stylers: [{ color: '#d9d2c8' }] },
  { featureType: 'road.local',                elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'transit.line',              elementType: 'geometry', stylers: [{ color: '#e8e2da' }] },
  { featureType: 'transit.station',           elementType: 'geometry', stylers: [{ color: '#ede8e0' }] },
  { featureType: 'water',                     elementType: 'geometry', stylers: [{ color: '#b8d4e8' }] },
  { featureType: 'water',                     elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
]

// ─── Custom Marker ────────────────────────────────────────────────────────────
function RestaurantMarker({ r, selected }: { r: any; selected: boolean }) {
  return (
    <View style={[mk.wrap, selected && mk.wrapSelected]}>
      <View style={[mk.pin, { backgroundColor: selected ? colors.primaryAccent : colors.primary }]}>
        <Text style={mk.pinEmoji}>{r.emoji ?? '🍽️'}</Text>
      </View>
      {r.rating > 0 && (
        <View style={mk.ratingWrap}>
          <Star size={8} color="#F0A500" fill="#F0A500" />
          <Text style={mk.ratingTxt}>{r.rating?.toFixed(1)}</Text>
        </View>
      )}
    </View>
  )
}
const mk = StyleSheet.create({
  wrap:         { alignItems: 'center' },
  wrapSelected: { transform: [{ scale: 1.2 }] },
  pin:          { width: 38, height: 38, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', ...shadows.md },
  pinEmoji:     { fontSize: 18 },
  ratingWrap:   { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#fff', paddingHorizontal: 5, paddingVertical: 2, borderRadius: radii.full, marginTop: 3, ...shadows.sm },
  ratingTxt:    { fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A1A' },
})

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────
function BottomSheet({ r, th, t, onClose }: { r: any; th: any; t: any; onClose: () => void }) {
  const slideY = useRef(new Animated.Value(300)).current

  useEffect(() => {
    Animated.spring(slideY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start()
  }, [])

  return (
    <Animated.View
      style={[bs.sheet, { backgroundColor: th.bgCard, transform: [{ translateY: slideY }] }, shadows.xl]}
    >
      {/* Drag handle */}
      <View style={[bs.handle, { backgroundColor: th.border }]} />

      <View style={bs.content}>
        {/* Emoji + Info */}
        <View style={bs.row}>
          <View style={[bs.emojiBox, { backgroundColor: (r.color ?? colors.primary) + '20' }]}>
            <Text style={{ fontSize: 26 }}>{r.emoji ?? '🍽️'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[bs.name, { color: th.text }]}>{r.name}</Text>
            <Text style={[bs.sub, { color: th.textSub }]}>
              {r.cuisine} · {r.priceRange}
            </Text>
            {r.rating > 0 && (
              <View style={bs.ratingRow}>
                <Star size={12} color="#F0A500" fill="#F0A500" />
                <Text style={[bs.ratingTxt, { color: th.textSub }]}>{r.rating?.toFixed(1)}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={bs.closeBtn}>
            <Text style={[bs.closeTxt, { color: th.textMuted }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Details */}
        {r.address && (
          <View style={bs.detailRow}>
            <MapPin size={14} color={th.textMuted} />
            <Text style={[bs.detailTxt, { color: th.textSub }]}>{r.address}</Text>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: r.id } })}
          activeOpacity={0.85}
          style={[bs.bookBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={bs.bookTxt}>🍽️  Забронировать столик</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}
const bs = StyleSheet.create({
  sheet:     { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingBottom: 32 },
  handle:    { width: 40, height: 4, borderRadius: radii.full, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  content:   { padding: 16, gap: 12 },
  row:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  emojiBox:  { width: 52, height: 52, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  name:      { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 3 },
  sub:       { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', marginBottom: 3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingTxt: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium' },
  closeBtn:  { padding: 4 },
  closeTxt:  { fontSize: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailTxt: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', flex: 1 },
  bookBtn:   { paddingVertical: 16, borderRadius: radii.md, alignItems: 'center' },
  bookTxt:   { color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold' },
})

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function MapScreen() {
  const { th } = useTheme()
  const { t }  = useLang()
  const mapRef = useRef<any>(null)

  const [restaurants, setRestaurants] = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState<any>(null)
  const [city,        setCity]        = useState(CITIES[0])
  const [showPicker,  setShowPicker]  = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(CITY_KEY).then(s => {
      if (s) { const f = CITIES.find(c => c.name === s); if (f) setCity(f) }
    })
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 10000)
    fetch(`${API}/api/restaurants`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => setRestaurants(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => { clearTimeout(timer); setLoading(false) })
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [])

  function selectCity(c: typeof CITIES[0]) {
    setCity(c)
    AsyncStorage.setItem(CITY_KEY, c.name)
    setShowPicker(false)
    mapRef.current?.animateToRegion(
      { latitude: c.lat, longitude: c.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 },
      600,
    )
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
            onPress={() => mapRef.current?.animateToRegion(
              { latitude: city.lat, longitude: city.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 500,
            )}
            style={[s.iconBtn, { backgroundColor: th.bgCardAlt, borderColor: th.border }]}
          >
            <Navigation size={16} color={th.textSub} strokeWidth={1.75} />
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
                onPress={() => setSelected(r)}
                tracksViewChanges={false}
              >
                <RestaurantMarker r={r} selected={selected?.id === r.id} />
              </Marker>
            ))}
          </MapView>
        )
      )}

      {/* Bottom sheet on marker tap */}
      {selected && (
        <BottomSheet r={selected} th={th} t={t} onClose={() => setSelected(null)} />
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
                style={[s.cityOpt, { borderBottomColor: th.border }]}
              >
                <Text style={[s.cityOptTx, { color: c.name === city.name ? colors.primary : th.text }]}>
                  {c.name === city.name ? '✓ ' : ''}{c.name}
                </Text>
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
  cityOpt:      { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  cityOptTx:    { fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium' },
})
