import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Animated, Image, Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTheme } from '../../src/theme'
import { useLang } from '../../src/i18n'
import { useAppStore } from '../../src/store/useAppStore'
import { getRestaurants } from '../../src/api/restaurants'
import { MOCK_RESTAURANTS } from '../../src/data/mockRestaurants'
import { normalizeRestaurant, type NormalizedRestaurant } from '../../src/utils/restaurant'
import FilterModal from '../../src/components/FilterModal'
import { type FilterState, DEFAULT_FILTERS, countActiveFilters, applyFilters } from '../../src/utils/filters'

// ─── Cuisine chip data ────────────────────────────────────────────────────────

const CUISINE_CHIPS = [
  { id: 'polish',   emoji: '🥘' },
  { id: 'italiana', emoji: '🍝' },
  { id: 'japanese', emoji: '🍱' },
  { id: 'french',   emoji: '🥂' },
] as const

// ─── Helpers for fields that only mock data has ───────────────────────────────

function getImage(r: NormalizedRestaurant): string {
  return (r as any).image ?? `https://picsum.photos/seed/stolik-${r.id}/400/300`
}

function getPriceDisplay(r: NormalizedRestaurant): string {
  const pl = (r as any).priceLevel
  if (typeof pl === 'number') return '€'.repeat(Math.min(pl, 3))
  return (r.price ?? '$$').replace(/\$/g, '€')
}

function getIsOpen(r: NormalizedRestaurant): boolean | undefined {
  return (r as any).isOpen
}

// ─── Animated search card ─────────────────────────────────────────────────────

function SearchCard({ r, index, th }: { r: NormalizedRestaurant; index: number; th: any }) {
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(anim, {
      toValue:  1,
      duration: 260,
      delay:    Math.min(index, 8) * 55,
      useNativeDriver: true,
    }).start()
  }, [])

  const opacity    = anim
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] })

  const imageUrl  = getImage(r)
  const isOpen    = getIsOpen(r)

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable
        onPress={() => router.push(`/restaurant/${r.id}`)}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: th.bgCard, borderColor: th.border, opacity: pressed ? 0.88 : 1 },
        ]}
      >
        {/* Thumbnail */}
        <View style={styles.thumbWrap}>
          <Image source={{ uri: imageUrl }} style={styles.thumb} resizeMode="cover" />
          {isOpen !== undefined && (
            <View style={[styles.openDot, { backgroundColor: isOpen ? '#238636' : '#8B949E' }]} />
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={[styles.name, { color: th.text }]} numberOfLines={1}>{r.name}</Text>
          <Text style={[styles.meta, { color: th.textSub }]} numberOfLines={1}>
            {r.emoji}  {r.district}  ·  {getPriceDisplay(r)}
          </Text>
          <View style={styles.ratingRow}>
            <Feather name="star" size={11} color="#F0A500" />
            <Text style={[styles.ratingText, { color: th.textSub }]}>
              {(r.rating ?? 4.5).toFixed(1)}
            </Text>
            {(r as any).reviewCount !== undefined && (
              <Text style={[styles.reviewCount, { color: th.textMuted }]}>
                ({(r as any).reviewCount})
              </Text>
            )}
          </View>
        </View>

        <Feather name="chevron-right" size={16} color={th.textMuted} />
      </Pressable>
    </Animated.View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const { th }        = useTheme()
  const { t, lang }   = useLang()
  const storeRests    = useAppStore(s => s.restaurants)
  const { setRestaurants } = useAppStore()

  const inputRef = useRef<TextInput>(null)
  const [query,           setQuery]           = useState('')
  const [cuisineFilter,   setCuisine]         = useState<string | null>(null)
  const [filters,         setFilters]         = useState<FilterState>(DEFAULT_FILTERS)
  const [filterModalOpen, setFilterModalOpen] = useState(false)

  const activeFilterCount = countActiveFilters(filters)

  // If the home screen hasn't loaded restaurants yet, load them here
  useEffect(() => {
    if (storeRests.length === 0) {
      getRestaurants()
        .then(raw => {
          setRestaurants(
            raw.length > 0
              ? raw.map(r => normalizeRestaurant(r))
              : (MOCK_RESTAURANTS as any[])
          )
        })
        .catch(() => setRestaurants(MOCK_RESTAURANTS as any[]))
    }
  }, [])

  // Use live store data when available; fall back to mock for offline/first-load
  const allRests: NormalizedRestaurant[] =
    storeRests.length > 0
      ? (storeRests as NormalizedRestaurant[])
      : (MOCK_RESTAURANTS as unknown as NormalizedRestaurant[])

  // Text + cuisine chip filter
  const textAndChipFiltered = allRests.filter(r => {
    const matchText = query === '' ||
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      (r.district ?? '').toLowerCase().includes(query.toLowerCase()) ||
      (r.cuisine ?? '').toLowerCase().includes(query.toLowerCase())
    const matchCuisine = !cuisineFilter || r.cuisine === cuisineFilter
    return matchText && matchCuisine
  })

  // Then apply advanced filters (price, rating, available now, modal cuisine)
  const filtered = applyFilters(textAndChipFiltered, filters)

  const isEmpty = query === '' && !cuisineFilter

  const handleChip = useCallback((id: string) => {
    setCuisine(prev => prev === id ? null : id)
    setQuery('')
  }, [])

  const handleClear = useCallback(() => {
    setQuery('')
    setCuisine(null)
    setFilters(DEFAULT_FILTERS)
  }, [])

  const cuisineLabel: Record<string, Record<string, string>> = {
    polish:   { pl: 'Polska',    en: 'Polish',   ru: 'Польская',    uk: 'Польська'   },
    italiana: { pl: 'Włoska',   en: 'Italian',  ru: 'Итальянская', uk: 'Італійська' },
    japanese: { pl: 'Japońska', en: 'Japanese', ru: 'Японская',    uk: 'Японська'   },
    french:   { pl: 'Francuska',en: 'French',   ru: 'Французская', uk: 'Французька' },
  }

  const hasInput = query.length > 0 || !!cuisineFilter || activeFilterCount > 0

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: th.bg }]} edges={['top']}>
      <View style={styles.container}>

        {/* Title */}
        <Text style={[styles.title, { color: th.text }]}>{t.search_label}</Text>

        {/* Search bar + Filter button */}
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { backgroundColor: th.bgCard, borderColor: th.border }]}>
            <Feather name="search" size={16} color={th.textMuted} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={text => { setQuery(text) }}
              placeholder={t.search_placeholder}
              placeholderTextColor={th.textMuted}
              returnKeyType="search"
              autoCapitalize="none"
              style={[styles.input, { color: th.text }]}
            />
            {hasInput && (
              <TouchableOpacity onPress={handleClear} hitSlop={8}>
                <Feather name="x" size={16} color={th.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setFilterModalOpen(true)}
            activeOpacity={0.8}
            style={[
              styles.filterBtn,
              {
                backgroundColor: activeFilterCount > 0 ? th.accent : th.bgCard,
                borderColor:     activeFilterCount > 0 ? th.accent : th.border,
              },
            ]}
          >
            <Feather name="sliders" size={14} color={activeFilterCount > 0 ? '#fff' : th.textSub} />
            <Text style={[styles.filterBtnTxt, { color: activeFilterCount > 0 ? '#fff' : th.textSub }]}>
              {activeFilterCount > 0 ? `${t.filters} • ${activeFilterCount}` : t.filters}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cuisine chips */}
        <View style={styles.chips}>
          {CUISINE_CHIPS.map(c => {
            const active = cuisineFilter === c.id
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => handleChip(c.id)}
                activeOpacity={0.75}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? th.accent   : th.bgCard,
                    borderColor:     active ? th.accent   : th.border,
                  },
                ]}
              >
                <Text style={styles.chipEmoji}>{c.emoji}</Text>
                <Text style={[styles.chipLabel, { color: active ? '#fff' : th.textSub }]}>
                  {cuisineLabel[c.id]?.[lang] ?? c.id}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Popular label when nothing typed */}
        {isEmpty && (
          <Text style={[styles.sectionLabel, { color: th.textMuted }]}>
            {t.popular.toUpperCase()}
          </Text>
        )}

        {/* Filter modal */}
        <FilterModal
          visible={filterModalOpen}
          initialFilters={filters}
          onClose={() => setFilterModalOpen(false)}
          onApply={setFilters}
        />

        {/* Results */}
        <FlatList
          data={filtered}
          keyExtractor={r => r.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            hasInput ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={[styles.emptyTitle, { color: th.text }]}>{t.no_restaurants}</Text>
                <Text style={[styles.emptyDesc, { color: th.textMuted }]}>
                  {query
                    ? `«${query}»`
                    : (cuisineLabel[cuisineFilter!]?.[lang] ?? '')}
                </Text>
                <TouchableOpacity
                  onPress={handleClear}
                  style={[styles.clearBtn, { backgroundColor: th.accent }]}
                >
                  <Text style={styles.clearBtnText}>{t.clear_filters}</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          renderItem={({ item: r, index }) => (
            <SearchCard r={r} index={index} th={th} />
          )}
        />
      </View>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  container:    { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  title:        { fontSize: 24, fontWeight: '800', marginBottom: 16, paddingHorizontal: 4 },

  searchRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  searchBar:    {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1,
  },
  input:        { flex: 1, fontSize: 15, padding: 0 },
  filterBtn:    {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, flexShrink: 0,
  },
  filterBtnTxt: { fontSize: 13, fontWeight: '600' },

  chips:        { flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' },
  chip:         {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  chipEmoji:    { fontSize: 14 },
  chipLabel:    { fontSize: 13, fontWeight: '600' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
    marginBottom: 12, paddingHorizontal: 4,
  },

  card:         {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 10, borderRadius: 14, borderWidth: 1,
  },
  thumbWrap:    { position: 'relative' },
  thumb:        { width: 62, height: 62, borderRadius: 10 },
  openDot:      {
    position: 'absolute', bottom: 4, right: 4,
    width: 9, height: 9, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#fff',
  },
  info:         { flex: 1 },
  name:         { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  meta:         { fontSize: 12, marginBottom: 4 },
  ratingRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText:   { fontSize: 12, fontWeight: '600' },
  reviewCount:  { fontSize: 11 },

  empty:        { alignItems: 'center', paddingTop: 80 },
  emptyEmoji:   { fontSize: 44, marginBottom: 12 },
  emptyTitle:   { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptyDesc:    { fontSize: 14, marginBottom: 20 },
  clearBtn:     { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  clearBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
