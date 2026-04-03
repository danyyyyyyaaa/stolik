import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, ScrollView, Modal, Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTheme } from '../../src/theme'
import { useLang } from '../../src/i18n'

const API = process.env.EXPO_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'
const CUISINES = ['Italian', 'Polish', 'Japanese', 'French', 'Georgian', 'American']
const PRICES = ['$', '$$', '$$$', '$$$$']
const RATINGS = [{ label: '4.0+', v: 4.0 }, { label: '4.5+', v: 4.5 }]

interface Filters { search: string; cuisine: string; priceRange: string; minRating: number | null }

function FilterModal({ visible, filters, onApply, onClose, th, t }: { visible: boolean; filters: Filters; onApply: (f: Filters) => void; onClose: () => void; th: any; t: any }) {
  const [lf, setLf] = useState<Filters>(filters)
  useEffect(() => { if (visible) setLf(filters) }, [visible])
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={fm.overlay}>
        <View style={[fm.sheet, { backgroundColor: th.bgCard }]}>
          <View style={fm.hdr}>
            <Text style={[fm.title, { color: th.text }]}>{t.filter_by ?? 'Filters'}</Text>
            <TouchableOpacity onPress={onClose}><Feather name="x" size={22} color={th.textMuted} /></TouchableOpacity>
          </View>
          <Text style={[fm.lbl, { color: th.textMuted }]}>Cuisine</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 8 }}>
              {CUISINES.map(c => (
                <TouchableOpacity key={c} onPress={() => setLf(f => ({ ...f, cuisine: f.cuisine === c.toLowerCase() ? '' : c.toLowerCase() }))}
                  style={[fm.chip, { backgroundColor: lf.cuisine === c.toLowerCase() ? th.accent : th.bgCardAlt, borderColor: lf.cuisine === c.toLowerCase() ? th.accent : th.border }]}>
                  <Text style={[fm.chipTx, { color: lf.cuisine === c.toLowerCase() ? '#fff' : th.textSub }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Text style={[fm.lbl, { color: th.textMuted }]}>Price range</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            {PRICES.map(p => (
              <TouchableOpacity key={p} onPress={() => setLf(f => ({ ...f, priceRange: f.priceRange === p ? '' : p }))}
                style={[fm.chip, { backgroundColor: lf.priceRange === p ? th.accent : th.bgCardAlt, borderColor: lf.priceRange === p ? th.accent : th.border }]}>
                <Text style={[fm.chipTx, { color: lf.priceRange === p ? '#fff' : th.textSub }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[fm.lbl, { color: th.textMuted }]}>Min rating</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
            {RATINGS.map(r => (
              <TouchableOpacity key={r.label} onPress={() => setLf(f => ({ ...f, minRating: f.minRating === r.v ? null : r.v }))}
                style={[fm.chip, { backgroundColor: lf.minRating === r.v ? th.accent : th.bgCardAlt, borderColor: lf.minRating === r.v ? th.accent : th.border }]}>
                <Text style={[fm.chipTx, { color: lf.minRating === r.v ? '#fff' : th.textSub }]}>⭐ {r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={fm.btns}>
            <TouchableOpacity onPress={() => setLf(f => ({ ...f, cuisine: '', priceRange: '', minRating: null }))} style={[fm.resetBtn, { borderColor: th.border }]}>
              <Text style={[fm.resetTx, { color: th.textSub }]}>{t.reset ?? 'Reset'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onApply(lf)} style={[fm.applyBtn, { backgroundColor: th.accent }]}>
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
  sheet:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  hdr:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:    { fontSize: 18, fontWeight: '700' },
  lbl:      { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, marginTop: 14 },
  chip:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipTx:   { fontSize: 13, fontWeight: '500' },
  btns:     { flexDirection: 'row', gap: 12, marginTop: 20 },
  resetBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  resetTx:  { fontSize: 14, fontWeight: '600' },
  applyBtn: { flex: 2, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  applyTx:  { color: '#fff', fontSize: 14, fontWeight: '700' },
})

export default function SearchScreen() {
  const { th } = useTheme()
  const { t } = useLang()
  const [filters, setFilters] = useState<Filters>({ search: '', cuisine: '', priceRange: '', minRating: null })
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeCnt = [filters.cuisine, filters.priceRange, filters.minRating != null ? '1' : ''].filter(Boolean).length

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
      {/* Search + filter row */}
      <View style={[s.row, { backgroundColor: th.bgCard, borderColor: th.border }]}>
        <Feather name="search" size={16} color={th.textMuted} />
        <TextInput value={filters.search} onChangeText={v => setFilters(f => ({ ...f, search: v }))}
          placeholder={t.search_placeholder} placeholderTextColor={th.textMuted}
          style={[s.input, { color: th.text }]} autoCapitalize="none" />
        {filters.search ? <TouchableOpacity onPress={() => setFilters(f => ({ ...f, search: '' }))}>
          <Feather name="x-circle" size={16} color={th.textMuted} />
        </TouchableOpacity> : null}
        <TouchableOpacity onPress={() => setShowModal(true)}
          style={[s.fBtn, activeCnt > 0 && { backgroundColor: th.accent }]}>
          <Feather name="sliders" size={15} color={activeCnt > 0 ? '#fff' : th.textSub} />
          {activeCnt > 0 ? <Text style={s.fBadge}>{activeCnt}</Text> : null}
        </TouchableOpacity>
      </View>

      {/* Active chips */}
      {activeCnt > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingRight: 16 }}>
          {filters.cuisine ? <TouchableOpacity onPress={() => setFilters(f => ({ ...f, cuisine: '' }))} style={[s.chip, { backgroundColor: th.accent + '20', borderColor: th.accent + '40' }]}><Text style={[s.chipTx, { color: th.accent }]}>{filters.cuisine} ×</Text></TouchableOpacity> : null}
          {filters.priceRange ? <TouchableOpacity onPress={() => setFilters(f => ({ ...f, priceRange: '' }))} style={[s.chip, { backgroundColor: th.accent + '20', borderColor: th.accent + '40' }]}><Text style={[s.chipTx, { color: th.accent }]}>{filters.priceRange} ×</Text></TouchableOpacity> : null}
          {filters.minRating != null ? <TouchableOpacity onPress={() => setFilters(f => ({ ...f, minRating: null }))} style={[s.chip, { backgroundColor: th.accent + '20', borderColor: th.accent + '40' }]}><Text style={[s.chipTx, { color: th.accent }]}>⭐{filters.minRating}+ ×</Text></TouchableOpacity> : null}
        </ScrollView>
      )}

      {loading ? <View style={s.center}><ActivityIndicator color={th.accent} /></View> : (
        <FlatList data={results} keyExtractor={i => i.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: item.id } })}
              style={[s.card, { backgroundColor: th.bgCard, borderColor: th.border }]} activeOpacity={0.75}>
              <View style={[s.emoji, { backgroundColor: (item.color ?? th.accent) + '30' }]}>
                <Text style={{ fontSize: 22 }}>{item.emoji ?? '🍽️'}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.name, { color: th.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[s.sub, { color: th.textSub }]} numberOfLines={1}>{item.district} · {item.priceRange}</Text>
              </View>
              {item.rating > 0 ? <Text style={[s.rating, { color: th.textSub }]}>⭐{item.rating?.toFixed(1)}</Text> : null}
              <Feather name="chevron-right" size={16} color={th.textMuted} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={<View style={s.center}><Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text><Text style={[{ color: th.textSub, fontSize: 14 }]}>{t.no_restaurants}</Text></View>}
        />
      )}
      <FilterModal visible={showModal} filters={filters} onApply={f => { setFilters(f); setShowModal(false) }} onClose={() => setShowModal(false)} th={th} t={t} />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1 },
  row:    { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, borderWidth: 1 },
  input:  { flex: 1, fontSize: 15 },
  fBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  fBadge: { color: '#fff', fontSize: 10, fontWeight: '700' },
  chips:  { maxHeight: 40, marginBottom: 4 },
  chip:   { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipTx: { fontSize: 12, fontWeight: '600' },
  list:   { paddingHorizontal: 16, paddingBottom: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  card:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  emoji:  { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name:   { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  sub:    { fontSize: 12 },
  rating: { fontSize: 12 },
})
