import React, { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ActivityIndicator, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTheme } from '../../src/theme'
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

const DARK_STYLE = [
  { elementType: 'geometry',         stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'road',   elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'water',  elementType: 'geometry', stylers: [{ color: '#17263c' }] },
]

export default function MapScreen() {
  const { th } = useTheme()
  const { t } = useLang()
  const mapRef = useRef<any>(null)
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [city, setCity] = useState(CITIES[0])
  const [showPicker, setShowPicker] = useState(false)

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
    mapRef.current?.animateToRegion({ latitude: c.lat, longitude: c.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 600)
  }

  function getCoords(r: any, idx: number) {
    if (r.latitude && r.longitude) return { latitude: r.latitude, longitude: r.longitude }
    const off = idx * 0.003
    return { latitude: city.lat + off % 0.04, longitude: city.lng + (off * 1.3) % 0.04 }
  }

  if (Platform.OS === 'web') return (
    <SafeAreaView style={[s.safe, { backgroundColor: th.bg }]}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🗺️</Text>
        <Text style={{ color: th.textSub, fontSize: 14, textAlign: 'center' }}>Map available in mobile app</Text>
      </View>
    </SafeAreaView>
  )

  return (
    <View style={s.safe}>
      <SafeAreaView style={[s.hdr, { backgroundColor: th.bgCard, borderBottomColor: th.border }]} edges={['top']}>
        <TouchableOpacity onPress={() => setShowPicker(true)} style={s.cityBtn}>
          <Text style={[s.cityNm, { color: th.text }]}>{city.name}</Text>
          <Feather name="chevron-down" size={16} color={th.textMuted} />
        </TouchableOpacity>
        <Text style={[s.cnt, { color: th.textMuted }]}>{restaurants.length} {t.all_restaurants_map ?? 'restaurants'}</Text>
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={th.accent} size="large" />
        </View>
      ) : (
        MapView && (
          <MapView ref={mapRef} style={s.map} provider={PROVIDER_GOOGLE}
            initialRegion={{ latitude: city.lat, longitude: city.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
            customMapStyle={DARK_STYLE} onPress={() => setSelected(null)}>
            {restaurants.map((r, i) => (
              <Marker key={r.id} coordinate={getCoords(r, i)} onPress={() => setSelected(r)}>
                <View style={[s.pin, { backgroundColor: selected?.id === r.id ? th.accent : th.bgCard, borderColor: selected?.id === r.id ? th.accent : th.border }]}>
                  <Text style={{ fontSize: 16 }}>{r.emoji ?? '🍽️'}</Text>
                </View>
              </Marker>
            ))}
          </MapView>
        )
      )}

      {selected && (
        <View style={[s.sheet, { backgroundColor: th.bgCard, borderTopColor: th.border }]}>
          <View style={s.sheetRow}>
            <View style={[s.sEmoji, { backgroundColor: (selected.color ?? th.accent) + '20' }]}>
              <Text style={{ fontSize: 24 }}>{selected.emoji ?? '🍽️'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.sName, { color: th.text }]}>{selected.name}</Text>
              <Text style={[s.sSub, { color: th.textSub }]}>{selected.cuisine} · {selected.priceRange}</Text>
              {selected.rating > 0 ? <Text style={[s.sRating, { color: th.textSub }]}>⭐ {selected.rating?.toFixed(1)}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: selected.id } })}
              style={[s.bookBtn, { backgroundColor: th.accent }]}>
              <Text style={s.bookTx}>{t.reserve ?? 'Book'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={showPicker} transparent animationType="fade">
        <Pressable style={s.mOverlay} onPress={() => setShowPicker(false)}>
          <View style={[s.picker, { backgroundColor: th.bgCard, borderColor: th.border }]}>
            <Text style={[s.pickerTitle, { color: th.text }]}>{t.select_city ?? 'Select city'}</Text>
            {CITIES.map(c => (
              <TouchableOpacity key={c.name} onPress={() => selectCity(c)} style={[s.cityOpt, { borderBottomColor: th.border }]}>
                <Text style={[s.cityOptTx, { color: c.name === city.name ? th.accent : th.text }]}>{c.name === city.name ? '✓ ' : ''}{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  safe:       { flex: 1 },
  hdr:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1 },
  cityBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cityNm:     { fontSize: 18, fontWeight: '700' },
  cnt:        { fontSize: 12 },
  map:        { flex: 1 },
  pin:        { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  sheet:      { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, padding: 16, paddingBottom: 32 },
  sheetRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sEmoji:     { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sName:      { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  sSub:       { fontSize: 12 },
  sRating:    { fontSize: 12, marginTop: 2 },
  bookBtn:    { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  bookTx:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  mOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 40 },
  picker:     { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  pickerTitle:{ fontSize: 16, fontWeight: '700', padding: 16, paddingBottom: 8 },
  cityOpt:    { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  cityOptTx:  { fontSize: 15, fontWeight: '500' },
})
