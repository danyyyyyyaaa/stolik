import React, { useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Pressable, Linking, Platform, Animated,
} from 'react-native'
import { useTheme, radii, shadows } from '../theme'

export interface DirectionsSheetProps {
  visible:        boolean
  name:           string
  address?:       string
  lat?:           number
  lng?:           number
  googlePlaceId?: string
  t:              any
  onClose:        () => void
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
  return lat && lng
    ? `google.navigation:q=${lat},${lng}`
    : `geo:0,0?q=${encodeURIComponent(address ?? '')}`
}

function appleMapsUrl(lat?: number, lng?: number, address?: string): string {
  return lat && lng
    ? `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
    : `https://maps.apple.com/?q=${encodeURIComponent(address ?? '')}`
}

// ─── Map App Card ─────────────────────────────────────────────────────────────

function MapCard({
  emoji, label, sublabel, onPress, th,
}: {
  emoji: string; label: string; sublabel?: string; onPress: () => void; th: any
}) {
  const scale = useRef(new Animated.Value(1)).current

  function pressIn()  { Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, tension: 200, friction: 10 }).start() }
  function pressOut() { Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 10 }).start() }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      activeOpacity={1}
      style={{ flex: 1 }}
    >
      <Animated.View style={[
        ds.card,
        { backgroundColor: th.bgCardAlt, borderColor: th.border },
        { transform: [{ scale }] },
      ]}>
        <Text style={ds.cardEmoji}>{emoji}</Text>
        <Text style={[ds.cardLabel, { color: th.text }]}>{label}</Text>
        {sublabel ? <Text style={[ds.cardSublabel, { color: th.textMuted }]}>{sublabel}</Text> : null}
      </Animated.View>
    </TouchableOpacity>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DirectionsSheet({
  visible, name, address, lat, lng, googlePlaceId, t, onClose,
}: DirectionsSheetProps) {
  const { th }  = useTheme()
  const slideY  = useRef(new Animated.Value(400)).current

  useEffect(() => {
    if (!visible) return
    Animated.spring(slideY, {
      toValue:         0,
      useNativeDriver: true,
      tension:         65,
      friction:        11,
    }).start()
  }, [visible])

  function dismiss() {
    Animated.timing(slideY, { toValue: 400, duration: 220, useNativeDriver: true }).start(onClose)
  }

  function openGoogle() {
    const nativeUrl = googleMapsNativeUrl(lat, lng, address)
    const webUrl    = googleMapsUrl(lat, lng, googlePlaceId, address)
    Linking.canOpenURL(nativeUrl)
      .then(ok => Linking.openURL(ok ? nativeUrl : webUrl))
      .catch(() => Linking.openURL(webUrl))
    dismiss()
  }

  function openApple() {
    Linking.openURL(appleMapsUrl(lat, lng, address)).catch(() => {})
    dismiss()
  }

  const showGoogle = Platform.OS === 'android' || Platform.OS === 'ios'
  const showApple  = Platform.OS === 'ios'
  const hasTarget  = !!(lat && lng) || !!address

  if (!visible || !hasTarget) return null

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      {/* Backdrop — tap to dismiss */}
      <Pressable style={ds.overlay} onPress={dismiss}>
        {/* Sheet — stop touch propagation */}
        <Pressable onPress={() => {}}>
          <Animated.View style={[ds.sheet, { backgroundColor: th.bgCard, transform: [{ translateY: slideY }] }]}>
            {/* Drag handle */}
            <View style={[ds.handle, { backgroundColor: th.border }]} />

            {/* Header */}
            <View style={[ds.header, { borderBottomColor: th.border }]}>
              <Text style={[ds.name, { color: th.text }]} numberOfLines={1}>{name}</Text>
              {address ? (
                <Text style={[ds.addr, { color: th.textSub }]} numberOfLines={2}>{address}</Text>
              ) : null}
            </View>

            {/* Cards */}
            <View style={ds.cards}>
              {showGoogle && (
                <MapCard
                  emoji="🗺️"
                  label="Google Maps"
                  sublabel={Platform.OS === 'ios' ? t.open_google_maps : undefined}
                  onPress={openGoogle}
                  th={th}
                />
              )}
              {showApple && (
                <MapCard
                  emoji="🍎"
                  label="Apple Maps"
                  sublabel={t.open_apple_maps}
                  onPress={openApple}
                  th={th}
                />
              )}
            </View>

            {/* Dismiss hint */}
            <Text style={[ds.dismissHint, { color: th.textMuted }]}>
              {t.cancel ?? 'Tap outside to close'}
            </Text>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const ds = StyleSheet.create({
  overlay:       {
    flex:              1,
    backgroundColor:   'rgba(0,0,0,0.52)',
    justifyContent:    'flex-end',
  },
  sheet:         {
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    paddingBottom:        40,
    shadowColor:          '#000',
    shadowOffset:         { width: 0, height: -4 },
    shadowOpacity:        0.14,
    shadowRadius:         20,
    elevation:            16,
  },
  handle:        { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 20 },
  header:        { paddingHorizontal: 20, paddingBottom: 18, borderBottomWidth: StyleSheet.hairlineWidth },
  name:          { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 5 },
  addr:          { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 19, color: '#888' },
  cards:         { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  card:          {
    alignItems:        'center',
    justifyContent:    'center',
    paddingVertical:   22,
    paddingHorizontal: 12,
    borderRadius:      radii.lg,
    borderWidth:       1,
    gap:               8,
    ...shadows.sm,
  },
  cardEmoji:     { fontSize: 36, lineHeight: 44 },
  cardLabel:     { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'center' },
  cardSublabel:  { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center' },
  dismissHint:   {
    textAlign:      'center',
    fontSize:       12,
    fontFamily:     'PlusJakartaSans_400Regular',
    paddingTop:     4,
    paddingBottom:  4,
  },
})
