import React, { useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  Animated, Dimensions, Pressable,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLang, type LangKey } from '../i18n'
import { useTheme } from '../theme'

const LANGS: { code: LangKey; label: string; flag: string }[] = [
  { code: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'pl', label: 'Polski',     flag: '🇵🇱' },
  { code: 'ru', label: 'Русский',    flag: '🇷🇺' },
  { code: 'uk', label: 'Українська', flag: '🇺🇦' },
]

interface Props {
  visible:  boolean
  onClose:  () => void
}

export default function LanguagePickerModal({ visible, onClose }: Props) {
  const { th }           = useTheme()
  const { lang, setLang } = useLang()
  const insets           = useSafeAreaInsets()
  const translateY       = useRef(new Animated.Value(300)).current
  const backdropOpacity  = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, tension: 100, friction: 12, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 300, duration: 180, useNativeDriver: true }),
      ]).start()
    }
  }, [visible])

  function select(code: LangKey) {
    setLang(code)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          s.sheet,
          {
            backgroundColor: th.bgCard,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Handle */}
        <View style={[s.handle, { backgroundColor: th.border }]} />

        {/* Title */}
        <Text style={[s.title, { color: th.text }]}>🌐  Language</Text>

        {/* Options */}
        {LANGS.map((l, i) => {
          const active = lang === l.code
          return (
            <TouchableOpacity
              key={l.code}
              onPress={() => select(l.code)}
              activeOpacity={0.75}
              style={[
                s.row,
                { borderBottomColor: th.border },
                i === LANGS.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <Text style={s.flag}>{l.flag}</Text>
              <Text style={[s.label, { color: active ? th.accent : th.text }]}>{l.label}</Text>
              {active && <Feather name="check" size={18} color={th.accent} />}
            </TouchableOpacity>
          )
        })}
      </Animated.View>
    </Modal>
  )
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position:     'absolute',
    bottom:       0,
    left:         0,
    right:        0,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    paddingTop:   12,
    paddingHorizontal: 0,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 20,
  },
  title: {
    fontSize: 16, fontWeight: '700',
    paddingHorizontal: 24, marginBottom: 8,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  flag:  { fontSize: 24 },
  label: { flex: 1, fontSize: 16, fontWeight: '500' },
})
