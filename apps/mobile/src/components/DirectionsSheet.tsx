import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Pressable, Linking, Platform, Animated,
} from 'react-native'
import { useTheme, radii, shadows } from '../theme'

export interface DirectionsSheetProps {
  visible:       boolean
  name:          string
  address?:      string
  lat?:          number
  lng?:          number
  googlePlaceId?: string
  t:             any
  onClose:       () => void
}

// ─── URL builders ──────────────────────────────────────────────────────────────

function googleMapsUrl(lat?: number, lng?: number, googlePlaceId?: string, address?: string): string {
  if (lat && lng) {
    const placeParam = googlePlaceId ? `&destination_place_id=${googlePlaceId}` : ''
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${placeParam}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address ?? '')}`
}

function googleMapsNativeUrl(lat?: number, lng?: number, address?: string): string {
  if (Platform.OS === 'ios') {
    return lat && lng
      ? `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`
      : `comgooglemaps://?q=${encodeURIComponent(address ?? '')}`
  }
  // Android: use navigation intent
  return lat && lng
    ? `google.navigation:q=${lat},${lng}`
    : `geo:0,0?q=${encodeURIComponent(address ?? '')}`
}

function appleMapsUrl(lat?: number, lng?: number, address?: string): string {
  return lat && lng
    ? `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
    : `https://maps.apple.com/?q=${encodeURIComponent(address ?? '')}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DirectionsSheet({
  visible, name, address, lat, lng, googlePlaceId, t, onClose,
}: DirectionsSheetProps) {
  const { th }   = useTheme()
  const slideY   = useRef(new Animated.Value(400)).current
  const [googleInstalled, setGoogleInstalled] = useState<boolean | null>(null)

  // Detect Google Maps app (iOS check; Android always available)
  useEffect(() => {
    if (!visible) return
    Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 60, friction: 12 }).start()
    if (Platform.OS === 'ios') {
      Linking.canOpenURL('comgooglemaps://').then(setGoogleInstalled).catch(() => setGoogleInstalled(false))
    } else {
      setGoogleInstalled(true)
    }
  }, [visible])

  function dismiss() {
    Animated.timing(slideY, { toValue: 400, duration: 220, useNativeDriver: true }).start(onClose)
  }

  function openGoogle() {
    const nativeUrl = googleMapsNativeUrl(lat, lng, address)
    const webUrl    = googleMapsUrl(lat, lng, googlePlaceId, address)

    // Try native app first, fall back to web
    Linking.canOpenURL(nativeUrl)
      .then(ok => Linking.openURL(ok ? nativeUrl : webUrl))
      .catch(() => Linking.openURL(webUrl))

    dismiss()
  }

  function openApple() {
    Linking.openURL(appleMapsUrl(lat, lng, address)).catch(() => {})
    dismiss()
  }

  // Show Google Maps if: Android (always) OR iOS with app installed, OR iOS without (use web)
  const showGoogle = Platform.OS === 'android' || Platform.OS === 'ios'
  // Show Apple Maps only on iOS
  const showApple  = Platform.OS === 'ios'
  // If neither lat/lng nor address → nothing to navigate to
  const hasTarget  = !!(lat && lng) || !!address

  if (!visible || !hasTarget) return null

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <Pressable style={ds.overlay} onPress={dismiss}>
        {/* Stop touch propagation so tapping the sheet doesn't close it */}
        <Pressable onPress={() => {}}>
          <Animated.View
            style={[
              ds.sheet,
              { backgroundColor: th.bgCard, transform: [{ translateY: slideY }] },
              shadows.xl,
            ]}
          >
            {/* Drag handle */}
            <View style={[ds.handle, { backgroundColor: th.border }]} />

            {/* Restaurant info */}
            <View style={[ds.header, { borderBottomColor: th.border }]}>
              <Text style={[ds.name, { color: th.text }]} numberOfLines={1}>{name}</Text>
              {address ? (
                <Text style={[ds.addr, { color: th.textSub }]} numberOfLines={2}>{address}</Text>
              ) : null}
            </View>

            {/* Section label */}
            <Text style={[ds.sectionLabel, { color: th.textMuted }]}>
              {t.get_directions}
            </Text>

            {/* Map buttons */}
            <View style={ds.buttons}>
              {showGoogle && (
                <TouchableOpacity
                  style={[ds.mapBtn, { backgroundColor: th.bgCardAlt, borderColor: th.border }]}
                  onPress={openGoogle}
                  activeOpacity={0.72}
                >
                  <Text style={ds.mapBtnEmoji}>🗺️</Text>
                  <Text style={[ds.mapBtnText, { color: th.text }]}>
                    {t.open_google_maps}
                  </Text>
                </TouchableOpacity>
              )}
              {showApple && (
                <TouchableOpacity
                  style={[ds.mapBtn, { backgroundColor: th.bgCardAlt, borderColor: th.border }]}
                  onPress={openApple}
                  activeOpacity={0.72}
                >
                  <Text style={ds.mapBtnEmoji}>🍎</Text>
                  <Text style={[ds.mapBtnText, { color: th.text }]}>
                    {t.open_apple_maps}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Cancel */}
            <TouchableOpacity
              style={[ds.cancelBtn, { backgroundColor: th.bgCardAlt, borderColor: th.border }]}
              onPress={dismiss}
              activeOpacity={0.72}
            >
              <Text style={[ds.cancelText, { color: th.textSub }]}>{t.cancel}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const ds = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.52)', justifyContent: 'flex-end' },
  sheet:        {
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    paddingHorizontal:    16,
    paddingBottom:        36,
  },
  handle:       { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 14 },
  header:       { paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  name:         { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 4 },
  addr:         { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 18 },
  sectionLabel: {
    fontSize:       11,
    fontFamily:     'PlusJakartaSans_600SemiBold',
    letterSpacing:  0.7,
    textTransform:  'uppercase',
    marginTop:      18,
    marginBottom:   10,
    marginLeft:     2,
  },
  buttons:      { gap: 10, marginBottom: 12 },
  mapBtn:       {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            12,
    paddingVertical:   15,
    paddingHorizontal: 16,
    borderRadius:   radii.lg,
    borderWidth:    1,
  },
  mapBtnEmoji:  { fontSize: 22, lineHeight: 28 },
  mapBtnText:   { fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold', flex: 1 },
  cancelBtn:    {
    paddingVertical:   15,
    borderRadius:   radii.lg,
    borderWidth:    1,
    alignItems:     'center',
  },
  cancelText:   { fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold' },
})
