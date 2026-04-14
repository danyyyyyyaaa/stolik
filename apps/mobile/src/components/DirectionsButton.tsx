import React, { useRef, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Platform,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, radii } from '../theme'
import { useLang } from '../i18n'
import NavigationPickerSheet from './NavigationPickerSheet'
import {
  checkAvailableApps,
  openDirectionsAndroid,
  type NavApp,
} from '../utils/navigation'

interface Props {
  lat?:  number | null
  lng?:  number | null
  name:  string
}

export default function DirectionsButton({ lat, lng, name }: Props) {
  const { th }    = useTheme()
  const { t }     = useLang()
  const scale     = useRef(new Animated.Value(1)).current

  const [sheetVisible, setSheetVisible] = useState(false)
  const [apps,         setApps]         = useState<NavApp[]>([])
  const [loading,      setLoading]      = useState(false)

  // Hide entirely if no coordinates
  if (!lat || !lng) return null

  function pressIn()  { Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 200, friction: 10 }).start() }
  function pressOut() { Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 10 }).start() }

  async function onPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    if (Platform.OS === 'android') {
      // Android: geo: intent → native chooser
      await openDirectionsAndroid(lat!, lng!, name)
      return
    }

    // iOS: discover installed apps, then show picker sheet
    setSheetVisible(true)
    setLoading(true)
    try {
      const available = await checkAvailableApps()
      setApps(available)
    } catch {
      setApps([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={ds.wrap}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
      >
        <Animated.View style={[
          ds.btn,
          { backgroundColor: th.accent, transform: [{ scale }] },
        ]}>
          {/* Navigation icon */}
          <View style={ds.iconWrap}>
            <Text style={ds.icon}>↗</Text>
          </View>
          <Text style={ds.label}>{t.get_directions}</Text>
        </Animated.View>
      </TouchableOpacity>

      <NavigationPickerSheet
        visible={sheetVisible}
        apps={apps}
        loading={loading}
        lat={lat!}
        lng={lng!}
        name={name}
        titleLabel={t.navigate_to_restaurant}
        cancelLabel={t.cancel}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  )
}

const ds = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    marginBottom:      16,
  },
  btn: {
    height:         48,
    borderRadius:   radii.md,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
  },
  iconWrap: {
    width:          24,
    height:         24,
    borderRadius:   radii.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems:     'center',
    justifyContent: 'center',
  },
  icon: {
    color:      '#fff',
    fontSize:   13,
    fontWeight: '700',
    lineHeight: 16,
  },
  label: {
    color:      '#fff',
    fontSize:   15,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: 0.1,
  },
})
