import React, { useEffect, useRef, useState } from 'react'
import {
  Animated, Dimensions, Modal, Pressable, ScrollView,
  StyleSheet, Switch, Text, TouchableOpacity, View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../theme'
import { useLang } from '../i18n'
import { type FilterState, DEFAULT_FILTERS } from '../utils/filters'

const { height: H } = Dimensions.get('window')

const CUISINES = [
  { id: 'all',      labelKey: 'all'      },
  { id: 'polish',   labelKey: 'polish'   },
  { id: 'italiana', labelKey: 'italian'  },
  { id: 'japanese', labelKey: 'japanese' },
  { id: 'french',   labelKey: 'french'   },
] as const

const RATING_OPTIONS = [
  { value: 4.0, label: '4.0+' },
  { value: 4.5, label: '4.5+' },
  { value: 4.8, label: '4.8+' },
]

interface Props {
  visible:        boolean
  initialFilters: FilterState
  onClose:        () => void
  onApply:        (filters: FilterState) => void
}

export default function FilterModal({ visible, initialFilters, onClose, onApply }: Props) {
  const { th } = useTheme()
  const { t }  = useLang()

  // Local draft state — committed only on Apply
  const [draft, setDraft] = useState<FilterState>(initialFilters)

  useEffect(() => {
    if (visible) setDraft(initialFilters)
  }, [visible])

  // Animation
  const backdropOpacity = useRef(new Animated.Value(0)).current
  const sheetY          = useRef(new Animated.Value(H)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.spring(sheetY, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetY, { toValue: H, duration: 220, useNativeDriver: true }),
      ]).start()
    }
  }, [visible])

  function togglePrice(level: number) {
    setDraft(d => ({
      ...d,
      priceLevels: d.priceLevels.includes(level)
        ? d.priceLevels.filter(p => p !== level)
        : [...d.priceLevels, level],
    }))
  }

  function selectRating(value: number) {
    setDraft(d => ({ ...d, minRating: d.minRating === value ? null : value }))
  }

  function handleApply() {
    onApply(draft)
    onClose()
  }

  function handleReset() {
    setDraft(DEFAULT_FILTERS)
    onApply(DEFAULT_FILTERS)
    onClose()
  }

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View
        style={[f.backdrop, { opacity: backdropOpacity }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          f.sheet,
          { backgroundColor: th.bgCard, transform: [{ translateY: sheetY }] },
        ]}
      >
        {/* Handle */}
        <View style={[f.handle, { backgroundColor: th.border }]} />

        {/* Header */}
        <View style={f.header}>
          <Text style={[f.title, { color: th.text }]}>{t.filters}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Feather name="x" size={20} color={th.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={f.body}>

          {/* ── Price level ── */}
          <Text style={[f.sectionLabel, { color: th.textSub }]}>{t.filter_price}</Text>
          <View style={f.pillRow}>
            {([1, 2, 3] as const).map(level => {
              const active = draft.priceLevels.includes(level)
              return (
                <TouchableOpacity
                  key={level}
                  onPress={() => togglePrice(level)}
                  activeOpacity={0.8}
                  style={[
                    f.pill,
                    {
                      backgroundColor: active ? th.accent    : th.pill,
                      borderColor:     active ? th.accent    : th.border,
                    },
                  ]}
                >
                  <Text style={[f.pillTxt, { color: active ? '#fff' : th.textSub }]}>
                    {'€'.repeat(level)}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* ── Min rating ── */}
          <Text style={[f.sectionLabel, { color: th.textSub }]}>{t.filter_rating}</Text>
          <View style={f.pillRow}>
            {RATING_OPTIONS.map(opt => {
              const active = draft.minRating === opt.value
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => selectRating(opt.value)}
                  activeOpacity={0.8}
                  style={[
                    f.pill,
                    {
                      backgroundColor: active ? th.accent : th.pill,
                      borderColor:     active ? th.accent : th.border,
                    },
                  ]}
                >
                  <Feather name="star" size={11} color={active ? '#fff' : '#F0A500'} />
                  <Text style={[f.pillTxt, { color: active ? '#fff' : th.textSub }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* ── Cuisine ── */}
          <Text style={[f.sectionLabel, { color: th.textSub }]}>{t.cuisine_label}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={f.chipRow}
          >
            {CUISINES.map(c => {
              const active = draft.cuisine === c.id
              const label  = (t as any)[c.labelKey] ?? c.id
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setDraft(d => ({ ...d, cuisine: c.id }))}
                  activeOpacity={0.8}
                  style={[
                    f.chip,
                    {
                      backgroundColor: active ? th.accent : th.pill,
                      borderColor:     active ? th.accent : th.border,
                    },
                  ]}
                >
                  <Text style={[f.chipTxt, { color: active ? '#fff' : th.textSub }]}>
                    {String(label)}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {/* ── Available now ── */}
          <View style={f.toggleRow}>
            <Text style={[f.toggleLabel, { color: th.text }]}>{t.available_now}</Text>
            <Switch
              value={draft.availableNow}
              onValueChange={v => setDraft(d => ({ ...d, availableNow: v }))}
              trackColor={{ false: th.border, true: th.accent }}
              thumbColor="#fff"
            />
          </View>

        </ScrollView>

        {/* Footer */}
        <View style={[f.footer, { borderTopColor: th.border }]}>
          <TouchableOpacity onPress={handleReset} hitSlop={8} style={f.resetBtn}>
            <Text style={[f.resetTxt, { color: th.textMuted }]}>{t.reset}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleApply}
            activeOpacity={0.85}
            style={[f.applyBtn, { backgroundColor: th.accent }]}
          >
            <Text style={f.applyTxt}>{t.apply_filters}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  )
}

const f = StyleSheet.create({
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
    maxHeight:    H * 0.82,
    paddingBottom: 34,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  title: { fontSize: 18, fontWeight: '700' },

  body: { paddingHorizontal: 20, paddingBottom: 8 },

  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginBottom: 10, marginTop: 4 },

  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 999, borderWidth: 1,
  },
  pillTxt: { fontSize: 14, fontWeight: '600' },

  chipRow: { gap: 8, paddingBottom: 20 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1,
  },
  chipTxt: { fontSize: 13, fontWeight: '600' },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, marginBottom: 4,
  },
  toggleLabel: { fontSize: 15, fontWeight: '500' },

  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14,
    borderTopWidth: 1,
  },
  resetBtn: { paddingVertical: 6 },
  resetTxt: { fontSize: 14, fontWeight: '500' },
  applyBtn: {
    flex: 1, marginLeft: 16,
    paddingVertical: 14, borderRadius: 12,
    alignItems: 'center',
  },
  applyTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
