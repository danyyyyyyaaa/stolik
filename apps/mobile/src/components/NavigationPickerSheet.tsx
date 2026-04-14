import React, { useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Pressable, Animated, ActivityIndicator,
} from 'react-native'
import { useTheme, radii, shadows } from '../theme'
import { type NavApp, openDirections } from '../utils/navigation'

interface Props {
  visible:    boolean
  apps:       NavApp[]
  loading:    boolean
  lat:        number
  lng:        number
  name:       string
  titleLabel: string   // t.navigate_to_restaurant
  cancelLabel: string  // t.cancel
  onClose:    () => void
}

// ─── Single app row ───────────────────────────────────────────────────────────

function AppRow({
  app, lat, lng, name, onClose, th,
}: {
  app: NavApp; lat: number; lng: number; name: string
  onClose: () => void; th: any
}) {
  const scale = useRef(new Animated.Value(1)).current

  function pressIn()  { Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, tension: 200, friction: 10 }).start() }
  function pressOut() { Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 10 }).start() }

  async function onPress() {
    onClose()
    await openDirections(app.id, lat, lng, name)
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      activeOpacity={1}
    >
      <Animated.View style={[
        ds.row,
        { borderBottomColor: th.border },
        { transform: [{ scale }] },
      ]}>
        <View style={[ds.iconWrap, { backgroundColor: th.bgCardAlt, borderColor: th.border }]}>
          <Text style={ds.emoji}>{app.emoji}</Text>
        </View>
        <Text style={[ds.appName, { color: th.text }]}>{app.name}</Text>
        <View style={[ds.arrowWrap]}>
          <Text style={[ds.arrow, { color: th.textMuted }]}>›</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  )
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

export default function NavigationPickerSheet({
  visible, apps, loading, lat, lng, name,
  titleLabel, cancelLabel, onClose,
}: Props) {
  const { th } = useTheme()
  const slideY  = useRef(new Animated.Value(500)).current

  useEffect(() => {
    if (!visible) return
    slideY.setValue(500)
    Animated.spring(slideY, {
      toValue:         0,
      useNativeDriver: true,
      tension:         65,
      friction:        11,
    }).start()
  }, [visible])

  function dismiss() {
    Animated.timing(slideY, {
      toValue:         500,
      duration:        220,
      useNativeDriver: true,
    }).start(onClose)
  }

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <Pressable style={ds.overlay} onPress={dismiss}>
        <Pressable onPress={() => {}}>
          <Animated.View style={[
            ds.sheet,
            { backgroundColor: th.bgCard, transform: [{ translateY: slideY }] },
          ]}>
            {/* Handle */}
            <View style={[ds.handle, { backgroundColor: th.border }]} />

            {/* Title */}
            <View style={[ds.header, { borderBottomColor: th.border }]}>
              <Text style={[ds.title, { color: th.text }]}>{titleLabel}</Text>
            </View>

            {/* Loading */}
            {loading ? (
              <View style={ds.loadingWrap}>
                <ActivityIndicator color={th.accent} />
              </View>
            ) : (
              <View>
                {apps.map(app => (
                  <AppRow
                    key={app.id}
                    app={app}
                    lat={lat}
                    lng={lng}
                    name={name}
                    onClose={dismiss}
                    th={th}
                  />
                ))}
              </View>
            )}

            {/* Cancel */}
            <TouchableOpacity onPress={dismiss} style={[ds.cancelBtn, { borderTopColor: th.border }]}>
              <Text style={[ds.cancelText, { color: th.textSub }]}>{cancelLabel}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ds = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    justifyContent:  'flex-end',
  },
  sheet: {
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    paddingBottom:        36,
    ...shadows.xl,
  },
  handle: {
    width:        40,
    height:       4,
    borderRadius: 2,
    alignSelf:    'center',
    marginTop:    10,
    marginBottom: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom:     16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize:   16,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  loadingWrap: {
    paddingVertical: 32,
    alignItems:      'center',
  },
  row: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: 20,
    paddingVertical:   14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap:              14,
  },
  iconWrap: {
    width:        44,
    height:       44,
    borderRadius: radii.md,
    borderWidth:  1,
    alignItems:   'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
    lineHeight: 30,
  },
  appName: {
    flex:       1,
    fontSize:   15,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  arrowWrap: {
    width: 24,
    alignItems: 'center',
  },
  arrow: {
    fontSize:   22,
    lineHeight: 26,
  },
  cancelBtn: {
    marginTop:        8,
    paddingVertical:  16,
    paddingHorizontal: 20,
    borderTopWidth:   StyleSheet.hairlineWidth,
    alignItems:       'center',
  },
  cancelText: {
    fontSize:   14,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
})
