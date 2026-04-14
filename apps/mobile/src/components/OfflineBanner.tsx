import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLang } from '../i18n'

export default function OfflineBanner() {
  const { t }    = useLang()
  const insets   = useSafeAreaInsets()
  const opacity  = useRef(new Animated.Value(0)).current
  const slideY   = useRef(new Animated.Value(-48)).current
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const isOffline = state.isConnected === false
      setOffline(isOffline)

      if (isOffline) {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.spring(slideY, { toValue: 0, tension: 100, friction: 12, useNativeDriver: true }),
        ]).start()
      } else {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(slideY, { toValue: -48, duration: 300, useNativeDriver: true }),
        ]).start()
      }
    })

    return unsub
  }, [])

  if (!offline) return null

  return (
    <Animated.View
      style={[
        ds.banner,
        { paddingTop: insets.top + 6 },
        { opacity, transform: [{ translateY: slideY }] },
      ]}
      pointerEvents="none"
    >
      <View style={ds.inner}>
        <Text style={ds.dot}>●</Text>
        <Text style={ds.text}>{t.no_connection}</Text>
      </View>
    </Animated.View>
  )
}

const ds = StyleSheet.create({
  banner: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    zIndex:          999,
    backgroundColor: '#B45309',  // amber-700 — visible in both themes
    paddingBottom:   8,
    paddingHorizontal: 16,
  },
  inner: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            8,
    justifyContent: 'center',
  },
  dot: {
    color:    '#FDE68A',
    fontSize: 8,
    lineHeight: 14,
  },
  text: {
    color:      '#FEF3C7',
    fontSize:   13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    textAlign:  'center',
  },
})
