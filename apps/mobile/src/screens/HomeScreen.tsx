import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '../theme'
import { useLang } from '../i18n'
import { useAppStore } from '../store/useAppStore'
import { getRestaurants } from '../api/restaurants'
import type { Restaurant } from '../store/useAppStore'
import type { RootStackParamList } from '../navigation/AppNavigator'
import LanguagePickerModal from '../components/LanguagePickerModal'

const CUISINE_EMOJI: Record<string, string> = {
  polska: '🥘', polish: '🥘', włoska: '🍝', italiana: '🍝', italian: '🍝',
  japońska: '🍱', japanese: '🍱', francuska: '🥂', french: '🥂', inne: '🍽️',
}
const CUISINE_COLOR: Record<string, string> = {
  polska: '#2D6A35', polish: '#2D6A35', włoska: '#C84B31', italiana: '#C84B31', italian: '#C84B31',
  japońska: '#C0392B', japanese: '#C0392B', francuska: '#8B5A2B', french: '#8B5A2B', inne: '#555555',
}

export function normalizeRestaurant(r: Partial<Restaurant> & { id: string }): Restaurant {
  return {
    id:         String(r.id),
    name:       r.name ?? '',
    slug:       r.slug ?? String(r.id),
    cuisine:    r.cuisine ?? '',
    district:   r.district ?? '',
    city:       r.city ?? '',
    address:    r.address ?? '',
    phone:      r.phone ?? '',
    priceRange: r.priceRange ?? r.price ?? '$$',
    rating:     r.rating ?? 4.5,
    openUntil:  r.openUntil ?? r.open ?? '22:00',
    emoji:      r.emoji || CUISINE_EMOJI[(r.cuisine ?? '').toLowerCase()] || '🍽️',
    color:      r.color || CUISINE_COLOR[(r.cuisine ?? '').toLowerCase()] || '#2D6A35',
    desc:       r.desc ?? r.description ?? '',
  } as Restaurant & { open?: string; price?: string; description?: string }
}

const CUISINES = ['all', 'polish', 'italiana', 'french', 'japanese'] as const

export default function HomeScreen() {
  const { th, themeKey, toggle } = useTheme()
  const { t }                    = useLang()
  const nav                      = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { restaurants, setRestaurants } = useAppStore()

  const [loading,        setLoading]        = useState(true)
  const [refreshing,     setRefreshing]     = useState(false)
  const [cuisineFilter,  setCuisineFilter]  = useState<string>('all')
  const [searchQuery,    setSearchQuery]    = useState('')
  const [langPickerOpen, setLangPickerOpen] = useState(false)

  const cuisineLabels: Record<string, string> = {
    all: t.all, polish: t.polish, italiana: t.italian, french: t.french, japanese: t.japanese,
  }

  async function loadRestaurants() {
    try {
      const data = await getRestaurants()
      setRestaurants(data.map(r => normalizeRestaurant(r)))
    } catch (e) {
      console.error('[HomeScreen] loadRestaurants:', e)
    }
  }

  useEffect(() => {
    loadRestaurants().finally(() => setLoading(false))
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadRestaurants()
    setRefreshing(false)
  }, [])

  const filtered = restaurants.filter(r =>
    (cuisineFilter === 'all' || r.cuisine === cuisineFilter) &&
    (searchQuery === '' ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.district ?? '').toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const s = styles(th)

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={th.accent} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{t.good_morning} 👋</Text>
            <Text style={s.logo}>
              Stol<Text style={[s.logoAccent, { color: th.accent }]}>ik</Text>
            </Text>
          </View>
          <View style={s.headerActions}>
            {/* Theme toggle */}
            <TouchableOpacity
              onPress={toggle}
              style={[s.headerBtn, { backgroundColor: th.bgCard, borderColor: th.border }]}
              hitSlop={8}
            >
              <Text style={{ fontSize: 16 }}>{themeKey === 'dark' ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
            {/* Language picker */}
            <TouchableOpacity
              onPress={() => setLangPickerOpen(true)}
              style={[s.headerBtn, { backgroundColor: th.bgCard, borderColor: th.border }]}
              hitSlop={8}
            >
              <Text style={{ fontSize: 16 }}>🌐</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        <View style={[s.searchBar, { backgroundColor: th.bgCard, borderColor: th.border }]}>
          <Feather name="search" size={16} color={th.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t.search_placeholder}
            placeholderTextColor={th.textMuted}
            style={[s.searchInput, { color: th.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={16} color={th.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Cuisine filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pillsRow}
        >
          {CUISINES.map(c => {
            const active = cuisineFilter === c
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setCuisineFilter(c)}
                style={[
                  s.pill,
                  {
                    backgroundColor: active ? th.pillActive : th.pill,
                    borderColor:     active ? 'transparent' : th.border,
                  },
                ]}
              >
                <Text style={[s.pillText, { color: active ? th.pillActiveText : th.textSub }]}>
                  {cuisineLabels[c] ?? c}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Section title */}
        <View style={s.sectionRow}>
          <Text style={[s.sectionTitle, { color: th.text }]}>{t.available_now}</Text>
          {!loading && (
            <Text style={[s.sectionCount, { color: th.accent }]}>{filtered.length}</Text>
          )}
        </View>

        {/* Cards */}
        <View style={s.cardsContainer}>
          {loading
            ? [1, 2, 3].map(i => (
                <View key={i} style={[s.skeletonCard, { backgroundColor: th.bgCard, borderColor: th.border }]} />
              ))
            : filtered.length === 0
            ? (
                <View style={s.emptyState}>
                  <Text style={s.emptyEmoji}>🍽️</Text>
                  <Text style={[s.emptyTitle, { color: th.text }]}>{t.no_restaurants}</Text>
                  <Text style={[s.emptyDesc, { color: th.textMuted }]}>{t.try_another_filter}</Text>
                </View>
              )
            : filtered.map(r => (
                <RestaurantCard
                  key={r.id}
                  r={r}
                  th={th}
                  reserveLabel={t.reserve}
                  openUntilLabel={t.open_until}
                  onPress={() => nav.navigate('Restaurant', { restaurantId: r.id })}
                />
              ))
          }
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>

      <LanguagePickerModal visible={langPickerOpen} onClose={() => setLangPickerOpen(false)} />
    </SafeAreaView>
  )
}

function RestaurantCard({
  r, th, reserveLabel, openUntilLabel, onPress,
}: {
  r: Restaurant
  th: ReturnType<typeof useTheme>['th']
  reserveLabel: string
  openUntilLabel: string
  onPress: () => void
}) {
  const s = styles(th)
  const color = (r as any).color ?? '#2D6A35'
  const open  = (r as any).openUntil ?? (r as any).open ?? '22:00'

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[s.card, { backgroundColor: th.bgCard, borderColor: th.border }]}
    >
      {/* Hero area */}
      <View style={[s.cardHero, { backgroundColor: color + '33' }]}>
        <Text style={s.cardEmoji}>{(r as any).emoji ?? '🍽️'}</Text>
        <View style={[s.ratingBadge, { backgroundColor: th.accentBg }]}>
          <Feather name="star" size={11} color={th.accentText} />
          <Text style={[s.ratingText, { color: th.accentText }]}>
            {(r.rating ?? 4.5).toFixed(1)}
          </Text>
        </View>
        <View style={s.openBadge}>
          <Text style={s.openText}>{openUntilLabel} {open}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={s.cardInfo}>
        <View style={s.cardRow}>
          <Text style={[s.cardName, { color: th.text }]}>{r.name}</Text>
          <Text style={[s.cardPrice, { color: th.textMuted }]}>{r.priceRange}</Text>
        </View>
        <View style={[s.cardMeta, { marginBottom: 14 }]}>
          <Feather name="map-pin" size={11} color={th.textMuted} />
          <Text style={[s.cardMetaText, { color: th.textSub }]}>
            {r.district}
            {r.district && r.cuisine ? '  ·  ' : ''}
            <Text style={{ textTransform: 'capitalize' }}>{r.cuisine}</Text>
          </Text>
        </View>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.8}
          style={[s.reserveBtn, { backgroundColor: th.accent }]}
        >
          <Text style={s.reserveBtnText}>{reserveLabel}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

function styles(th: ReturnType<typeof useTheme>['th']) {
  return StyleSheet.create({
    safe:           { flex: 1, backgroundColor: th.bg },
    scroll:         { flex: 1 },
    header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
    greeting:       { fontSize: 13, color: th.textSub, marginBottom: 2 },
    logo:           { fontSize: 26, fontWeight: '700', color: th.text, letterSpacing: -0.5 },
    logoAccent:     { fontStyle: 'italic' },
    headerActions:  { flexDirection: 'row', gap: 8 },
    headerBtn:      { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    searchBar:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginBottom: 20, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1 },
    searchInput:    { flex: 1, fontSize: 14, padding: 0 },
    pillsRow:       { paddingHorizontal: 20, paddingBottom: 20, gap: 8 },
    pill:           { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
    pillText:       { fontSize: 13, fontWeight: '500' },
    sectionRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
    sectionTitle:   { fontSize: 15, fontWeight: '600' },
    sectionCount:   { fontSize: 12 },
    cardsContainer: { paddingHorizontal: 20, gap: 12 },
    skeletonCard:   { height: 200, borderRadius: 20, borderWidth: 1, opacity: 0.5 },
    emptyState:     { alignItems: 'center', paddingTop: 48, paddingBottom: 24 },
    emptyEmoji:     { fontSize: 40, marginBottom: 12 },
    emptyTitle:     { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    emptyDesc:      { fontSize: 13 },
    card:           { borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
    cardHero:       { height: 120, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    cardEmoji:      { fontSize: 52 },
    ratingBadge:    { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    ratingText:     { fontSize: 12, fontWeight: '600' },
    openBadge:      { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    openText:       { fontSize: 11, color: '#fff', fontWeight: '500' },
    cardInfo:       { padding: 16 },
    cardRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
    cardName:       { fontSize: 16, fontWeight: '600' },
    cardPrice:      { fontSize: 13, fontWeight: '500' },
    cardMeta:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
    cardMetaText:   { fontSize: 12 },
    reserveBtn:     { paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
    reserveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 0.2 },
  })
}
