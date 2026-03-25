import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated, Dimensions, FlatList, Image, Pressable,
  RefreshControl, StyleSheet, Text, TouchableOpacity, View,
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
import LanguagePickerModal from '../../src/components/LanguagePickerModal'

const { width: W } = Dimensions.get('window')

const CUISINES = [
  { id: 'all',      labelKey: 'all'      },
  { id: 'polish',   labelKey: 'polish'   },
  { id: 'italiana', labelKey: 'italian'  },
  { id: 'japanese', labelKey: 'japanese' },
  { id: 'french',   labelKey: 'french'   },
] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────
function priceEuros(r: NormalizedRestaurant): string {
  const pl = (r as any).priceLevel
  if (typeof pl === 'number') return '€'.repeat(Math.min(pl, 3))
  return (r.price ?? '$$').replace(/\$/g, '€')
}

function cuisineLabel(cuisine: string, t: any): string {
  const c = cuisine?.toLowerCase()
  if (c === 'polish')   return t.polish
  if (c === 'italiana') return t.italian
  if (c === 'japanese') return t.japanese
  if (c === 'french')   return t.french
  return cuisine
}

function rImage(r: NormalizedRestaurant): string {
  return (r as any).image ?? `https://picsum.photos/seed/${r.id}/400/300`
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function SkeletonCard({ th }: { th: any }) {
  const pulse = useRef(new Animated.Value(0.45)).current
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,    duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 800, useNativeDriver: true }),
      ])
    ).start()
    return () => pulse.stopAnimation()
  }, [])
  return (
    <Animated.View style={[sk.wrap, { opacity: pulse }]}>
      <View style={[sk.card, { backgroundColor: th.bgCard, borderColor: th.border }]}>
        <View style={[sk.img, { backgroundColor: th.bgCardAlt }]} />
        <View style={sk.body}>
          <View style={[sk.pill, { backgroundColor: th.bgCardAlt }]} />
          <View style={[sk.line, { width: '52%', backgroundColor: th.bgCardAlt }]} />
          <View style={[sk.line, { width: '38%', height: 10, backgroundColor: th.bgCardAlt }]} />
          <View style={[sk.btn, { backgroundColor: th.bgCardAlt }]} />
        </View>
      </View>
    </Animated.View>
  )
}
const sk = StyleSheet.create({
  wrap: { marginBottom: 16 },
  card: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  img:  { height: 200 },
  body: { padding: 16, gap: 10 },
  pill: { height: 26, width: 96, borderRadius: 13 },
  line: { height: 13, borderRadius: 7 },
  btn:  { height: 48, borderRadius: 12, marginTop: 4 },
})

// ─── Featured Card (horizontal scroll) ───────────────────────────────────────
function FeaturedCard({
  r, th, onPress,
}: { r: NormalizedRestaurant; th: any; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [fc.card, pressed && { opacity: 0.88 }]}
    >
      <Image
        source={{ uri: rImage(r) }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      {/* subtle overall darkening */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.14)' }]} />
      {/* bottom gradient simulation */}
      <View style={fc.gradient} />

      {/* Rating badge — top right */}
      <View style={fc.topRow}>
        <View style={fc.ratingPill}>
          <Feather name="star" size={10} color="#F0A500" />
          <Text style={fc.ratingTxt}>{r.rating.toFixed(1)}</Text>
        </View>
      </View>

      {/* Name area — bottom */}
      <View style={fc.bottom}>
        <Text style={fc.emoji}>{r.emoji}</Text>
        <Text style={fc.name} numberOfLines={1}>{r.name}</Text>
        <Text style={fc.district} numberOfLines={1}>{r.district}</Text>
      </View>
    </Pressable>
  )
}
const fc = StyleSheet.create({
  card:      { width: 190, height: 150, borderRadius: 16, overflow: 'hidden', marginRight: 12 },
  gradient:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 95, backgroundColor: 'rgba(0,0,0,0.64)' },
  topRow:    { position: 'absolute', top: 10, right: 10 },
  ratingPill:{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.52)', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8 },
  ratingTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  bottom:    { position: 'absolute', bottom: 10, left: 12, right: 12 },
  emoji:     { fontSize: 18, marginBottom: 3 },
  name:      { color: '#fff', fontSize: 14, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  district:  { color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 1 },
})

// ─── Restaurant Card ──────────────────────────────────────────────────────────
function RestaurantCard({
  r, th, t, onPress, index,
}: {
  r: NormalizedRestaurant; th: any; t: any; onPress: () => void; index: number
}) {
  const fade  = useRef(new Animated.Value(0)).current
  const slide = useRef(new Animated.Value(22)).current

  useEffect(() => {
    const delay = Math.min(index, 6) * 72
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 320, delay, useNativeDriver: true }),
    ]).start()
    return () => { fade.stopAnimation(); slide.stopAnimation() }
  }, [])

  const isOpen     = (r as any).isOpen !== false
  const reviewCount = (r as any).reviewCount as number | undefined
  const isDark     = th.bg === '#0D1117'

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
      {/* Shadow wrapper — must NOT have overflow:hidden for shadow to show on iOS */}
      <View style={[
        s.shadow,
        {
          shadowColor:   '#000',
          shadowOffset:  { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.38 : 0.10,
          shadowRadius:  14,
          elevation:     6,
        },
      ]}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            s.card,
            { backgroundColor: th.bgCard, borderColor: th.border, opacity: pressed ? 0.96 : 1 },
          ]}
        >
          {/* ── Image area ── */}
          <View style={s.imgWrap}>
            <Image
              source={{ uri: rImage(r) }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
            {/* subtle overall tint */}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.10)' }]} />
            {/* gradient strip over bottom 55% */}
            <View style={s.imgGradient} />

            {/* Name overlaid on image */}
            <View style={s.imgNameArea}>
              <Text style={s.imgName} numberOfLines={1}>{r.name}</Text>
            </View>

            {/* "Open now" badge — top right */}
            {isOpen && (
              <View style={s.openBadge}>
                <View style={s.openDot} />
                <Text style={s.openTxt}>{t.available_now}</Text>
              </View>
            )}
          </View>

          {/* ── Info section ── */}
          <View style={s.info}>

            {/* Row 1: cuisine pill + price */}
            <View style={s.rowSplit}>
              <View style={[s.cuisinePill, { backgroundColor: r.color + '1E', borderColor: r.color + '40' }]}>
                <Text style={s.cuisineEmoji}>{r.emoji}</Text>
                <Text style={[s.cuisineTxt, { color: r.color }]}>{cuisineLabel(r.cuisine, t)}</Text>
              </View>
              <Text style={[s.priceText, { color: th.textSub }]}>{priceEuros(r)}</Text>
            </View>

            {/* Row 2: stars + rating + review count */}
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map(i => (
                <Feather
                  key={i}
                  name="star"
                  size={13}
                  color={i <= Math.round(r.rating) ? '#F0A500' : th.border}
                />
              ))}
              <Text style={[s.ratingNum, { color: th.text }]}>{r.rating.toFixed(1)}</Text>
              {reviewCount !== undefined && (
                <Text style={[s.reviewCount, { color: th.textMuted }]}>({reviewCount})</Text>
              )}
            </View>

            {/* Row 3: location */}
            <View style={s.locRow}>
              <Feather name="map-pin" size={12} color={th.textMuted} />
              <Text style={[s.locTxt, { color: th.textSub }]} numberOfLines={1}>
                {[r.district, r.city].filter(Boolean).join(', ')}
              </Text>
            </View>

            {/* Reserve button */}
            <TouchableOpacity
              onPress={onPress}
              activeOpacity={0.8}
              style={[s.reserveBtn, { backgroundColor: th.accent }]}
            >
              <Text style={s.reserveTxt}>{t.reserve}</Text>
              <Feather name="arrow-right" size={15} color="#fff" />
            </TouchableOpacity>
          </View>
        </Pressable>
      </View>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  shadow:      { borderRadius: 16 },
  card:        { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  imgWrap:     { height: 200 },
  imgGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 115, backgroundColor: 'rgba(0,0,0,0.65)' },
  imgNameArea: { position: 'absolute', bottom: 13, left: 14, right: 14 },
  imgName:     {
    color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  openBadge:   { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(26,127,55,0.92)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  openDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7ee787' },
  openTxt:     { color: '#fff', fontSize: 11, fontWeight: '600' },
  info:        { padding: 14, gap: 10 },
  rowSplit:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cuisinePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  cuisineEmoji:{ fontSize: 13 },
  cuisineTxt:  { fontSize: 12, fontWeight: '600' },
  priceText:   { fontSize: 14, fontWeight: '700' },
  starsRow:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingNum:   { fontSize: 13, fontWeight: '700', marginLeft: 5 },
  reviewCount: { fontSize: 12, marginLeft: 2 },
  locRow:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locTxt:      { fontSize: 13, flex: 1 },
  reserveBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, borderRadius: 12, marginTop: 2 },
  reserveTxt:  { color: '#fff', fontSize: 15, fontWeight: '700' },
})

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { th, themeKey, toggle } = useTheme()
  const { t }                    = useLang()
  const { restaurants, setRestaurants, user } = useAppStore()
  const [langPickerOpen, setLangPickerOpen]   = useState(false)

  const [loading,       setLoading]       = useState(true)
  const [refreshing,    setRefreshing]    = useState(false)
  const [cuisineFilter, setCuisineFilter] = useState('all')

  // Screen mount fade-in
  const screenFade = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(screenFade, { toValue: 1, duration: 360, useNativeDriver: true }).start()
  }, [])

  async function load() {
    try {
      const raw = await getRestaurants()
      setRestaurants(raw.length > 0 ? raw.map(normalizeRestaurant) : MOCK_RESTAURANTS)
    } catch {
      setRestaurants(MOCK_RESTAURANTS)
    }
  }

  useEffect(() => {
    if (restaurants.length === 0) setRestaurants(MOCK_RESTAURANTS)
    setLoading(false)
    load()
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [])

  const filtered = (restaurants as NormalizedRestaurant[]).filter(r =>
    cuisineFilter === 'all' || r.cuisine === cuisineFilter
  )

  // Top-5 by rating for featured strip
  const featured = [...(restaurants as NormalizedRestaurant[])]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5)

  return (
    <SafeAreaView style={[hs.safe, { backgroundColor: th.bg }]} edges={['top']}>
      <Animated.View style={[hs.screen, { opacity: screenFade }]}>
        <FlatList
          data={loading ? [] : filtered}
          keyExtractor={r => r.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={th.accent}
              colors={[th.accent]}
            />
          }
          contentContainerStyle={hs.list}
          ListHeaderComponent={
            <View>
              {/* ── Hero ── */}
              <View style={hs.hero}>
                <View style={hs.heroLeft}>
                  <Text style={[hs.greeting, { color: th.textSub }]}>
                    {user?.firstName
                      ? `${t.good_morning}, ${user.firstName} 👋`
                      : `${t.good_morning} 👋`}
                  </Text>
                  <Text style={[hs.logo, { color: th.text }]}>
                    Stol<Text style={{ fontStyle: 'italic', color: th.accent }}>ik</Text>
                  </Text>
                  <Text style={[hs.heroSub, { color: th.textMuted }]}>{t.find_table}</Text>
                </View>
                <View style={hs.headerRight}>
                  <TouchableOpacity
                    onPress={toggle}
                    style={[hs.headerBtn, { backgroundColor: th.bgCard, borderColor: th.border }]}
                    hitSlop={8}
                  >
                    <Text style={{ fontSize: 15 }}>{themeKey === 'dark' ? '☀️' : '🌙'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setLangPickerOpen(true)}
                    style={[hs.headerBtn, { backgroundColor: th.bgCard, borderColor: th.border }]}
                    hitSlop={8}
                  >
                    <Text style={{ fontSize: 15 }}>🌐</Text>
                  </TouchableOpacity>
                  <Pressable
                    onPress={() => router.navigate('/(tabs)/profile')}
                    style={[hs.avatar, { backgroundColor: th.accent }]}
                  >
                    <Text style={hs.avatarTxt}>
                      {user
                        ? (user.firstName?.[0] ?? user.email?.[0] ?? 'U').toUpperCase()
                        : 'S'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* ── Search bar (tappable, navigates to search tab) ── */}
              <Pressable
                onPress={() => router.navigate('/(tabs)/search')}
                style={[hs.searchBar, { backgroundColor: th.bgCard, borderColor: th.border }]}
              >
                <Feather name="search" size={16} color={th.textMuted} />
                <Text style={[hs.searchHint, { color: th.textMuted }]}>{t.search_placeholder}</Text>
              </Pressable>

              {/* ── Cuisine filter pills ── */}
              <FlatList
                data={CUISINES}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={c => c.id}
                contentContainerStyle={hs.pillsRow}
                renderItem={({ item }) => {
                  const active = cuisineFilter === item.id
                  const label  = (t as any)[item.labelKey] ?? item.id
                  return (
                    <TouchableOpacity
                      onPress={() => setCuisineFilter(item.id)}
                      activeOpacity={0.8}
                      style={[hs.pill, {
                        backgroundColor: active ? th.pillActive : th.pill,
                        borderColor:     active ? 'transparent' : th.border,
                      }]}
                    >
                      <Text style={[hs.pillTxt, { color: active ? th.pillActiveText : th.textSub }]}>
                        {String(label)}
                      </Text>
                    </TouchableOpacity>
                  )
                }}
              />

              {/* ── Featured / Top Rated (horizontal, only on 'all' filter) ── */}
              {!loading && featured.length > 0 && cuisineFilter === 'all' && (
                <View style={hs.section}>
                  <View style={hs.sectionHead}>
                    <Text style={[hs.sectionTitle, { color: th.text }]}>{t.top_rated}</Text>
                    <Feather name="award" size={15} color={th.accent} />
                  </View>
                  <FlatList
                    data={featured}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={r => r.id + '_feat'}
                    contentContainerStyle={{ paddingRight: 16 }}
                    renderItem={({ item }) => (
                      <FeaturedCard
                        r={item}
                        th={th}
                        onPress={() => router.push(`/restaurant/${item.id}`)}
                      />
                    )}
                  />
                </View>
              )}

              {/* ── "Available now" section header ── */}
              <View style={[hs.sectionHead, { marginTop: 4 }]}>
                <Text style={[hs.sectionTitle, { color: th.text }]}>{t.available_now}</Text>
                {!loading && (
                  <View style={[hs.countBadge, { backgroundColor: th.accentBg }]}>
                    <Text style={[hs.countTxt, { color: th.accentText }]}>{filtered.length}</Text>
                  </View>
                )}
              </View>

              {/* Skeletons while loading */}
              {loading && [0, 1, 2].map(i => <SkeletonCard key={i} th={th} />)}
            </View>
          }
          renderItem={({ item, index }) => (
            <RestaurantCard
              r={item as NormalizedRestaurant}
              th={th}
              t={t}
              index={index}
              onPress={() => router.push(`/restaurant/${item.id}`)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListEmptyComponent={
            !loading ? (
              <View style={hs.empty}>
                <Text style={hs.emptyEmoji}>🍽️</Text>
                <Text style={[hs.emptyTitle, { color: th.text }]}>{t.no_restaurants}</Text>
                <Text style={[hs.emptyDesc, { color: th.textMuted }]}>{t.try_another_filter}</Text>
              </View>
            ) : null
          }
          ListFooterComponent={<View style={{ height: 36 }} />}
        />
      </Animated.View>
      <LanguagePickerModal visible={langPickerOpen} onClose={() => setLangPickerOpen(false)} />
    </SafeAreaView>
  )
}

const hs = StyleSheet.create({
  safe:        { flex: 1 },
  screen:      { flex: 1 },
  list:        { paddingHorizontal: 16 },

  // Hero
  hero:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 20, paddingBottom: 22, paddingHorizontal: 4 },
  heroLeft:    { flex: 1, marginRight: 14 },
  greeting:    { fontSize: 13, marginBottom: 3 },
  logo:        { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  heroSub:     { fontSize: 13 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  headerBtn:   { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatar:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarTxt:   { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Search bar
  searchBar:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginHorizontal: 4, marginBottom: 18 },
  searchHint:  { fontSize: 14, flex: 1 },

  // Pills
  pillsRow:    { paddingHorizontal: 4, paddingBottom: 22, gap: 8 },
  pill:        { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  pillTxt:     { fontSize: 13, fontWeight: '500' },

  // Section headers
  section:     { marginBottom: 24 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 4, marginBottom: 14 },
  sectionTitle:{ fontSize: 16, fontWeight: '700' },
  countBadge:  { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  countTxt:    { fontSize: 12, fontWeight: '700' },

  // Empty state
  empty:       { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyEmoji:  { fontSize: 52, marginBottom: 16 },
  emptyTitle:  { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptyDesc:   { fontSize: 14 },
})
