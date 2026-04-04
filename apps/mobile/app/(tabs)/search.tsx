import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  Image, Modal, Pressable, ScrollView, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Search, SlidersHorizontal, X, ChevronRight, XCircle } from 'lucide-react-native'
import { router } from 'expo-router'
import { useTheme, colors, shadows, radii } from '../../src/theme'
import { useLang } from '../../src/i18n'

const API = process.env.EXPO_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

const CUISINES = ['Italian', 'Polish', 'Japanese', 'French', 'Georgian', 'American']
const PRICES   = ['$', '$$', '$$$', '$$$$']
const RATINGS  = [{ label: '4.0+', v: 4.0 }, { label: '4.5+', v: 4.5 }]

const CATEGORIES = [
  { emoji: '🍕', label: 'Итальянская', id: 'italian'  },
  { emoji: '🍣', label: 'Японская',    id: 'japanese' },
  { emoji: '🥘', label: 'Польская',    id: 'polish'   },
  { emoji: '🍷', label: 'Бар',         id: 'bar'      },
]

interface Filters { search: string; cuisine: string; priceRange: string; minRating: number | null }

function rImage(r: any): string {
  return r.image ?? `https://picsum.photos/seed/${r.id}/120/120`
}

// ─── Filter Modal ─────────────────────────────────────────────────────────────
function FilterModal({ visible, filters, onApply, onClose, th, t }: {
  visible: boolean; filters: Filters; onApply: (f: Filters) => void; onClose: () => void; th: any; t: any
}) {
  const [lf, setLf] = useState<Filters>(filters)
  useEffect(() => { if (visible) setLf(filters) }, [visible])
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={fm.overlay}>
        <View style={[fm.sheet, { backgroundColor: th.bgCard }]}>
          <View style={fm.hdr}>
            <Text style={[fm.title, { color: th.text }]}>{t.filter_by ?? 'Filters'}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color={th.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[fm.lbl, { color: th.textMuted }]}>Cuisine</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 8 }}>
              {CUISINES.map(c => {
                const active = lf.cuisine === c.toLowerCase()
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setLf(f => ({ ...f, cuisine: active ? '' : c.toLowerCase() }))}
                    style={[fm.chip, { backgroundColor: active ? th.accent : th.bgCardAlt, borderColor: active ? th.accent : th.border }]}
                  >
                    <Text style={[fm.chipTx, { color: active ? '#fff' : th.textSub }]}>{c}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>
          <Text style={[fm.lbl, { color: th.textMuted }]}>Price range</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            {PRICES.map(p => {
              const active = lf.priceRange === p
              return (
                <TouchableOpacity
                  key={p}
                  onPress={() => setLf(f => ({ ...f, priceRange: active ? '' : p }))}
                  style={[fm.chip, { backgroundColor: active ? th.accent : th.bgCardAlt, borderColor: active ? th.accent : th.border }]}
                >
                  <Text style={[fm.chipTx, { color: active ? '#fff' : th.textSub }]}>{p}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
          <Text style={[fm.lbl, { color: th.textMuted }]}>Min rating</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
            {RATINGS.map(r => {
              const active = lf.minRating === r.v
              return (
                <TouchableOpacity
                  key={r.label}
                  onPress={() => setLf(f => ({ ...f, minRating: active ? null : r.v }))}
                  style={[fm.chip, { backgroundColor: active ? th.accent : th.bgCardAlt, borderColor: active ? th.accent : th.border }]}
                >
                  <Text style={[fm.chipTx, { color: active ? '#fff' : th.textSub }]}>⭐ {r.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
          <View style={fm.btns}>
            <TouchableOpacity
              onPress={() => setLf(f => ({ ...f, cuisine: '', priceRange: '', minRating: null }))}
              style={[fm.resetBtn, { borderColor: th.border }]}
            >
              <Text style={[fm.resetTx, { color: th.textSub }]}>{t.reset ?? 'Reset'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onApply(lf)}
              style={[fm.applyBtn, { backgroundColor: th.accent }]}
            >
              <Text style={fm.applyTx}>{t.show_results ?? 'Show results'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const fm = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet:    { borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: 20, paddingBottom: 40 },
  hdr:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:    { fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold' },
  lbl:      { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 0.6, marginBottom: 8, marginTop: 14 },
  chip:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.full, borderWidth: 1 },
  chipTx:   { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium' },
  btns:     { flexDirection: 'row', gap: 12, marginTop: 20 },
  resetBtn: { flex: 1, paddingVertical: 13, borderRadius: radii.md, borderWidth: 1, alignItems: 'center' },
  resetTx:  { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold' },
  applyBtn: { flex: 2, paddingVertical: 13, borderRadius: radii.md, alignItems: 'center' },
  applyTx:  { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
})

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow({ th }: { th: any }) {
  const pulse = useRef(new Animated.Value(0.4)).current
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [])
  return (
    <Animated.View style={[sr.row, { opacity: pulse, backgroundColor: th.bgCard, borderColor: th.border }]}>
      <View style={[sr.photo, { backgroundColor: th.bgCardAlt }]} />
      <View style={sr.info}>
        <View style={[sr.line, { width: '55%', backgroundColor: th.bgCardAlt }]} />
        <View style={[sr.line, { width: '35%', height: 10, backgroundColor: th.bgCardAlt }]} />
      </View>
    </Animated.View>
  )
}
const sr = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radii.md, borderWidth: 1, marginBottom: 10 },
  photo: { width: 60, height: 60, borderRadius: radii.md },
  info:  { flex: 1, gap: 8 },
  line:  { height: 13, borderRadius: 6 },
})

// ─── Restaurant Row ────────────────────────────────────────────────────────────
function RestaurantRow({ item, th, onPress }: { item: any; th: any; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current
  const isOpen = item.isOpen !== false

  function onPressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 60, bounciness: 2 }).start()
  }
  function onPressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 60 }).start()
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }, shadows.sm, { borderRadius: radii.md, marginBottom: 10 }]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[rr.card, { backgroundColor: th.bgCard, borderColor: th.border }]}
      >
        <Image source={{ uri: rImage(item) }} style={rr.photo} resizeMode="cover" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[rr.name, { color: th.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[rr.sub, { color: th.textSub }]} numberOfLines={1}>
            {item.district} · {item.priceRange} · 1.2 км
          </Text>
          <View style={rr.statusRow}>
            <View style={[rr.statusDot, { backgroundColor: isOpen ? colors.success : colors.error }]} />
            <Text style={[rr.statusTxt, { color: isOpen ? colors.success : colors.error }]}>
              {isOpen ? 'Доступно' : 'Закрыто'}
            </Text>
            {item.rating > 0 && (
              <Text style={[rr.rating, { color: th.textSub }]}>  ⭐ {item.rating?.toFixed(1)}</Text>
            )}
          </View>
        </View>
        <ChevronRight size={16} color={th.textMuted} />
      </Pressable>
    </Animated.View>
  )
}
const rr = StyleSheet.create({
  card:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radii.md, borderWidth: 1 },
  photo:     { width: 60, height: 60, borderRadius: radii.md, flexShrink: 0 },
  name:      { fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 3 },
  sub:       { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', marginBottom: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 6, height: 6, borderRadius: radii.full, marginRight: 4 },
  statusTxt: { fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium' },
  rating:    { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular' },
})

// ─── Main ────────────────────────────────────────────────────────────────────
export default function SearchScreen() {
  const { th } = useTheme()
  const { t }  = useLang()

  const [filters,    setFilters]    = useState<Filters>({ search: '', cuisine: '', priceRange: '', minRating: null })
  const [results,    setResults]    = useState<any[]>([])
  const [loading,    setLoading]    = useState(false)
  const [showModal,  setShowModal]  = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeCnt = [filters.cuisine, filters.priceRange, filters.minRating != null ? '1' : ''].filter(Boolean).length
  const isSearching = !!filters.search || activeCnt > 0

  const fetchRests = useCallback(async (f: Filters) => {
    setLoading(true)
    const p = new URLSearchParams()
    if (f.search) p.set('search', f.search)
    if (f.cuisine) p.set('cuisine', f.cuisine)
    if (f.priceRange) p.set('priceRange', f.priceRange)
    if (f.minRating != null) p.set('minRating', String(f.minRating))
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 10000)
      const res = await fetch(`${API}/api/restaurants?${p}`, { signal: ctrl.signal }).finally(() => clearTimeout(timer))
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } catch { setResults([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => fetchRests(filters), 350)
    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [filters, fetchRests])

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: th.bg }]} edges={['top']}>
      {/* Title */}
      <Text style={[s.title, { color: th.text }]}>Поиск</Text>

      {/* Search + filter bar */}
      <View style={[s.searchRow, shadows.sm, { backgroundColor: th.bgCard, borderColor: th.border }]}>
        <Search size={16} color={th.textMuted} strokeWidth={1.75} />
        <TextInput
          value={filters.search}
          onChangeText={v => setFilters(f => ({ ...f, search: v }))}
          placeholder={t.search_placeholder}
          placeholderTextColor={th.textMuted}
          style={[s.input, { color: th.text, fontFamily: 'PlusJakartaSans_400Regular' }]}
          autoCapitalize="none"
        />
        {filters.search ? (
          <TouchableOpacity onPress={() => setFilters(f => ({ ...f, search: '' }))}>
            <XCircle size={16} color={th.textMuted} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          style={[s.filterBtn, activeCnt > 0 && { backgroundColor: th.accent }]}
        >
          <SlidersHorizontal size={15} color={activeCnt > 0 ? '#fff' : th.textSub} strokeWidth={1.75} />
          {activeCnt > 0 ? <Text style={s.filterBadge}>{activeCnt}</Text> : null}
        </TouchableOpacity>
      </View>

      {/* Active filter chips */}
      {activeCnt > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chips}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingRight: 16 }}
        >
          {filters.cuisine ? (
            <TouchableOpacity
              onPress={() => setFilters(f => ({ ...f, cuisine: '' }))}
              style={[s.chip, { backgroundColor: th.accentBg, borderColor: th.accentText + '40' }]}
            >
              <Text style={[s.chipTx, { color: th.accentText }]}>{filters.cuisine} ×</Text>
            </TouchableOpacity>
          ) : null}
          {filters.priceRange ? (
            <TouchableOpacity
              onPress={() => setFilters(f => ({ ...f, priceRange: '' }))}
              style={[s.chip, { backgroundColor: th.accentBg, borderColor: th.accentText + '40' }]}
            >
              <Text style={[s.chipTx, { color: th.accentText }]}>{filters.priceRange} ×</Text>
            </TouchableOpacity>
          ) : null}
          {filters.minRating != null ? (
            <TouchableOpacity
              onPress={() => setFilters(f => ({ ...f, minRating: null }))}
              style={[s.chip, { backgroundColor: th.accentBg, borderColor: th.accentText + '40' }]}
            >
              <Text style={[s.chipTx, { color: th.accentText }]}>⭐{filters.minRating}+ ×</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}

      <FlatList
        data={loading ? [] : results}
        keyExtractor={i => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          !isSearching ? (
            <View>
              {/* Categories grid */}
              <Text style={[s.sectionTitle, { color: th.text }]}>🗂 Категории</Text>
              <View style={s.catGrid}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.8}
                    onPress={() => setFilters(f => ({ ...f, cuisine: cat.id }))}
                    style={[s.catCard, { backgroundColor: th.bgCard, borderColor: th.border }, shadows.sm]}
                  >
                    <Text style={s.catEmoji}>{cat.emoji}</Text>
                    <Text style={[s.catLabel, { color: th.text }]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[s.sectionTitle, { color: th.text, marginTop: 24 }]}>📍 Рядом с вами</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <RestaurantRow
            item={item}
            th={th}
            onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View>
              {[0,1,2,3].map(i => <SkeletonRow key={i} th={th} />)}
            </View>
          ) : (
            <View style={s.center}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🔍</Text>
              <Text style={[{ color: th.textSub, fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular' }]}>
                {t.no_restaurants}
              </Text>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 24 }} />}
      />

      <FilterModal
        visible={showModal}
        filters={filters}
        onApply={f => { setFilters(f); setShowModal(false) }}
        onClose={() => setShowModal(false)}
        th={th}
        t={t}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  title:       { fontSize: 28, fontFamily: 'DMSerifDisplay_400Regular', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },
  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radii.lg, borderWidth: 1 },
  input:       { flex: 1, fontSize: 15 },
  filterBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.sm },
  filterBadge: { color: '#fff', fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold' },
  chips:       { maxHeight: 40, marginBottom: 4 },
  chip:        { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radii.full, borderWidth: 1 },
  chipTx:      { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold' },
  list:        { paddingHorizontal: 16, paddingBottom: 20 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },

  // Categories
  sectionTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 14 },
  catGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catCard:      { width: (344 - 12) / 2, aspectRatio: 1.6, borderRadius: radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  catEmoji:     { fontSize: 28 },
  catLabel:     { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' },
})
