import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated, Dimensions, FlatList, Image, Modal, Pressable,
  RefreshControl, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Bell, ChevronDown, MapPin, Search, Star } from 'lucide-react-native'
import { router } from 'expo-router'
import { useTheme, colors, shadows, radii } from '../../src/theme'
import { useLang } from '../../src/i18n'
import { useAppStore } from '../../src/store/useAppStore'
import { getRestaurants } from '../../src/api/restaurants'
import { MOCK_RESTAURANTS } from '../../src/data/mockRestaurants'
import { normalizeRestaurant, type NormalizedRestaurant } from '../../src/utils/restaurant'
import LanguagePickerModal from '../../src/components/LanguagePickerModal'
import FilterModal from '../../src/components/FilterModal'
import { type FilterState, DEFAULT_FILTERS, countActiveFilters, applyFilters } from '../../src/utils/filters'

const { width: W } = Dimensions.get('window')

const CITY_KEY = 'dinto_selected_city'
const AVAILABLE_CITIES = [
  { name: 'Warszawa', flag: '🇵🇱', active: true },
  { name: 'București', flag: '🇷🇴', active: false },
]

const CUISINES = [
  { id: 'all',      labelKey: 'all',     emoji: '🍽️' },
  { id: 'polish',   labelKey: 'polish',  emoji: '🇵🇱' },
  { id: 'italiana', labelKey: 'italian', emoji: '🇮🇹' },
  { id: 'japanese', labelKey: 'japanese',emoji: '🇯🇵' },
  { id: 'french',   labelKey: 'french',  emoji: '🥐' },
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
    <Animated.View style={[sk.wrap, { opacity: pulse }]}>
      <View style={[sk.card, { backgroundColor: th.bgCard, borderColor: th.border }]}>
        <View style={[sk.img, { backgroundColor: th.bgCardAlt }]} />
        <View style={sk.body}>
          <View style={[sk.pill, { backgroundColor: th.bgCardAlt }]} />
          <View style={[sk.line, { width: '60%', backgroundColor: th.bgCardAlt }]} />
          <View style={[sk.line, { width: '40%', height: 10, backgroundColor: th.bgCardAlt }]} />
          <View style={[sk.btn, { backgroundColor: th.bgCardAlt }]} />
        </View>
      </View>
    </Animated.View>
  )
}
const sk = StyleSheet.create({
  wrap: { marginBottom: 16 },
  card: { borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1 },
  img:  { height: 200 },
  body: { padding: 16, gap: 10 },
  pill: { height: 26, width: 96, borderRadius: radii.full },
  line: { height: 13, borderRadius: 7 },
  btn:  { height: 48, borderRadius: radii.md, marginTop: 4 },
})

// ─── Popular Card (horizontal 160×200) ────────────────────────────────────────
function PopularCard({ r, onPress }: { r: NormalizedRestaurant; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current
  function onPressIn() {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 60, bounciness: 2 }).start()
  }
  function onPressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 60 }).start()
  }
  return (
    <Animated.View style={{ transform: [{ scale }], marginRight: 12 }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={pc.card}
      >
        <Image source={{ uri: rImage(r) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.12)' }]} />
        <View style={pc.gradient} />

        {/* Rating badge — top right */}
        <View style={pc.ratingBadge}>
          <Star size={9} color="#F0A500" fill="#F0A500" />
          <Text style={pc.ratingTxt}>{(r.rating ?? 0).toFixed(1)}</Text>
        </View>

        {/* Bottom info */}
        <View style={pc.bottom}>
          <Text style={pc.name} numberOfLines={1}>{r.name}</Text>
          <View style={pc.distRow}>
            <MapPin size={10} color="rgba(255,255,255,0.8)" />
            <Text style={pc.district} numberOfLines={1}>{r.district}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
}
const pc = StyleSheet.create({
  card:       { width: 160, height: 200, borderRadius: radii.lg, overflow: 'hidden' },
  gradient:   { position: 'absolute', bottom: 0, left: 0, right: 0, height: 110, backgroundColor: 'rgba(0,0,0,0.68)' },
  ratingBadge:{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 7, paddingVertical: 4, borderRadius: radii.sm },
  ratingTxt:  { color: '#fff', fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' },
  bottom:     { position: 'absolute', bottom: 12, left: 12, right: 12 },
  name:       { color: '#fff', fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 4 },
  distRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  district:   { color: 'rgba(255,255,255,0.78)', fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular' },
})

// ─── Available Now Card (horizontal compact) ──────────────────────────────────
function AvailableNowCard({
  r, th, t, onPress,
}: { r: NormalizedRestaurant; th: any; t: any; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current
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
        style={[an.card, { backgroundColor: th.bgCard, borderColor: th.border }]}
      >
        {/* Photo */}
        <Image source={{ uri: rImage(r) }} style={an.photo} resizeMode="cover" />

        {/* Info */}
        <View style={an.info}>
          <Text style={[an.name, { color: th.text }]} numberOfLines={1}>{r.name}</Text>
          <Text style={[an.sub, { color: th.textSub }]} numberOfLines={1}>
            {cuisineLabel(r.cuisine, t)} · {r.district} · {priceEuros(r)}
          </Text>
          <View style={an.statusRow}>
            <View style={an.dot} />
            <Text style={an.statusTxt}>Столик свободен</Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.8}
          style={[an.btn, { backgroundColor: colors.primaryAccent }]}
        >
          <Text style={an.btnTxt}>{t.reserve?.replace(' →', '') ?? 'Book'}</Text>
        </TouchableOpacity>
      </Pressable>
    </Animated.View>
  )
}
const an = StyleSheet.create({
  card:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radii.md, borderWidth: 1 },
  photo:     { width: 80, height: 80, borderRadius: radii.sm, flexShrink: 0 },
  info:      { flex: 1, gap: 4 },
  name:      { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold' },
  sub:       { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot:       { width: 7, height: 7, borderRadius: radii.full, backgroundColor: colors.success },
  statusTxt: { fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium', color: colors.success },
  btn:       { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.sm, flexShrink: 0 },
  btnTxt:    { color: '#fff', fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
})

// ─── Restaurant Card ──────────────────────────────────────────────────────────
function RestaurantCard({
  r, th, t, onPress, index,
}: { r: NormalizedRestaurant; th: any; t: any; onPress: () => void; index: number }) {
  const fade  = useRef(new Animated.Value(0)).current
  const slide = useRef(new Animated.Value(20)).current
  const scale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const delay = Math.min(index, 5) * 70
    const anim = Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 360, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 300, delay, useNativeDriver: true }),
    ])
    anim.start()
    return () => anim.stop()
  }, [])

  function onPressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 60, bounciness: 2 }).start()
  }
  function onPressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 60 }).start()
  }

  const isOpen     = (r as any).isOpen !== false
  const reviewCount = (r as any).reviewCount as number | undefined

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }, { scale }] }}>
      <View style={[s.shadow, shadows.md]}>
        <Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={[s.card, { backgroundColor: th.bgCard, borderColor: th.border }]}
        >
          {/* Image */}
          <View style={s.imgWrap}>
            <Image source={{ uri: rImage(r) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.08)' }]} />
            <View style={s.imgGradient} />
            <View style={s.imgNameArea}>
              <Text style={s.imgName} numberOfLines={1}>{r.name}</Text>
            </View>
            {isOpen && (
              <View style={s.openBadge}>
                <View style={s.openDot} />
                <Text style={s.openTxt}>{t.available_now}</Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={s.info}>
            <View style={s.rowSplit}>
              <View style={[s.cuisinePill, { backgroundColor: r.color + '1E', borderColor: r.color + '40' }]}>
                <Text style={s.cuisineEmoji}>{r.emoji}</Text>
                <Text style={[s.cuisineTxt, { color: r.color }]}>{cuisineLabel(r.cuisine, t)}</Text>
              </View>
              <Text style={[s.priceText, { color: th.textSub }]}>{priceEuros(r)}</Text>
            </View>

            <View style={s.starsRow}>
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={12} color={i <= Math.round(r.rating ?? 0) ? '#F0A500' : th.border} fill={i <= Math.round(r.rating ?? 0) ? '#F0A500' : 'transparent'} />
              ))}
              <Text style={[s.ratingNum, { color: th.text }]}>{(r.rating ?? 0).toFixed(1)}</Text>
              {reviewCount !== undefined && (
                <Text style={[s.reviewCount, { color: th.textMuted }]}>({reviewCount})</Text>
              )}
            </View>

            <View style={s.locRow}>
              <MapPin size={12} color={th.textMuted} />
              <Text style={[s.locTxt, { color: th.textSub }]} numberOfLines={1}>
                {[r.district, r.city].filter(Boolean).join(', ')}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onPress}
              activeOpacity={0.8}
              style={[s.reserveBtn, { backgroundColor: th.accent }]}
            >
              <Text style={s.reserveTxt}>{t.reserve}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </View>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  shadow:      { borderRadius: radii.lg },
  card:        { borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1 },
  imgWrap:     { height: 200 },
  imgGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 115, backgroundColor: 'rgba(0,0,0,0.65)' },
  imgNameArea: { position: 'absolute', bottom: 13, left: 14, right: 14 },
  imgName:     { color: '#fff', fontSize: 20, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: -0.3 },
  openBadge:   { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(5,150,105,0.9)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.full },
  openDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6EE7B7' },
  openTxt:     { color: '#fff', fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold' },
  info:        { padding: 14, gap: 10 },
  rowSplit:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cuisinePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.full, borderWidth: 1 },
  cuisineEmoji:{ fontSize: 13 },
  cuisineTxt:  { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold' },
  priceText:   { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
  starsRow:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingNum:   { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', marginLeft: 5 },
  reviewCount: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', marginLeft: 2 },
  locRow:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locTxt:      { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', flex: 1 },
  reserveBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: radii.md, marginTop: 2 },
  reserveTxt:  { color: '#fff', fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold' },
})

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { th, themeKey } = useTheme()
  const { t }            = useLang()
  const { restaurants, setRestaurants, user } = useAppStore()
  const [langPickerOpen,  setLangPickerOpen]  = useState(false)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [cityPickerOpen,  setCityPickerOpen]  = useState(false)
  const [selectedCity,    setSelectedCity]    = useState('Warszawa')
  const [filters,         setFilters]         = useState<FilterState>(DEFAULT_FILTERS)
  const [loading,         setLoading]         = useState(true)
  const [refreshing,      setRefreshing]      = useState(false)

  const activeFilterCount = countActiveFilters(filters)

  const screenFade = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(screenFade, { toValue: 1, duration: 340, useNativeDriver: true }).start()
    AsyncStorage.getItem(CITY_KEY).then(v => { if (v) setSelectedCity(v) }).catch(() => {})
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

  const filtered = applyFilters(restaurants as NormalizedRestaurant[], filters)
  const featured = [...(restaurants as NormalizedRestaurant[])]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 8)

  // "Available now" = first 3 from filtered list
  const availableNow = filtered.slice(0, 3)

  const avatarInitial = user
    ? (user.firstName?.[0] ?? user.email?.[0] ?? 'U').toUpperCase()
    : 'D'

  const accentColor = themeKey === 'dark' ? colors.primaryAccent : colors.primary

  return (
    <SafeAreaView style={[hs.safe, { backgroundColor: th.bg }]} edges={['top']}>
      <Animated.View style={[hs.screen, { opacity: screenFade }]}>
        <FlatList
          data={loading ? [] : filtered}
          keyExtractor={r => r.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} colors={[accentColor]} />
          }
          contentContainerStyle={hs.list}
          ListHeaderComponent={
            <View>
              {/* ── Header bar ── */}
              <View style={hs.header}>
                {/* Left: avatar + location */}
                <View style={hs.headerLeft}>
                  <Pressable
                    onPress={() => router.navigate('/(tabs)/profile')}
                    style={[hs.avatar, { backgroundColor: accentColor }]}
                  >
                    <Text style={hs.avatarTxt}>{avatarInitial}</Text>
                  </Pressable>
                  <Pressable onPress={() => setCityPickerOpen(true)} style={hs.locationBtn}>
                    <Text style={[hs.locationTxt, { color: th.text }]}>{selectedCity}</Text>
                    <ChevronDown size={14} color={th.textSub} />
                  </Pressable>
                </View>
                {/* Right: notifications */}
                <TouchableOpacity
                  style={[hs.iconBtn, { backgroundColor: th.bgCard, borderColor: th.border }]}
                  activeOpacity={0.7}
                >
                  <Bell size={18} color={th.textSub} strokeWidth={1.75} />
                </TouchableOpacity>
              </View>

              {/* ── Greeting ── */}
              <View style={hs.greetingBlock}>
                <Text style={[hs.greeting, { color: th.text }]}>
                  {user?.firstName
                    ? `${t.good_morning}, ${user.firstName}`
                    : t.good_morning}
                </Text>
                <Text style={[hs.greetingSub, { color: th.textSub }]}>{t.find_table}</Text>
              </View>

              {/* ── Search bar ── */}
              <View style={hs.searchRow}>
                <Pressable
                  onPress={() => router.navigate('/(tabs)/search')}
                  style={[hs.searchBar, { backgroundColor: th.bgCard, borderColor: th.border }, shadows.sm]}
                >
                  <Search size={16} color={th.textMuted} strokeWidth={1.75} />
                  <Text style={[hs.searchHint, { color: th.textMuted }]}>{t.search_placeholder}</Text>
                </Pressable>
                <TouchableOpacity
                  onPress={() => setFilterModalOpen(true)}
                  activeOpacity={0.8}
                  style={[
                    hs.filterBtn,
                    {
                      backgroundColor: activeFilterCount > 0 ? accentColor : th.bgCard,
                      borderColor:     activeFilterCount > 0 ? accentColor : th.border,
                    },
                  ]}
                >
                  <Text style={[hs.filterBtnTxt, { color: activeFilterCount > 0 ? '#fff' : th.textSub }]}>
                    {activeFilterCount > 0 ? `${t.filters} • ${activeFilterCount}` : t.filters}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ── Cuisine filter pills ── */}
              <FlatList
                data={CUISINES}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={c => c.id}
                contentContainerStyle={hs.pillsRow}
                renderItem={({ item }) => {
                  const active = filters.cuisine === item.id
                  const label  = (t as any)[item.labelKey] ?? item.id
                  return (
                    <TouchableOpacity
                      onPress={() => setFilters(f => ({ ...f, cuisine: item.id }))}
                      activeOpacity={0.8}
                      style={[hs.pill, {
                        backgroundColor: active ? accentColor : th.pill,
                        borderColor:     active ? 'transparent' : th.border,
                      }]}
                    >
                      <Text style={hs.pillEmoji}>{item.emoji}</Text>
                      <Text style={[hs.pillTxt, { color: active ? '#fff' : th.textSub }]}>
                        {String(label)}
                      </Text>
                    </TouchableOpacity>
                  )
                }}
              />

              {/* ── Popular / Top Rated ── */}
              {!loading && featured.length > 0 && filters.cuisine === 'all' && (
                <View style={hs.section}>
                  <View style={hs.sectionHead}>
                    <Text style={[hs.sectionTitle, { color: th.text }]}>🔥 {t.top_rated}</Text>
                    <TouchableOpacity onPress={() => router.navigate('/(tabs)/search')}>
                      <Text style={[hs.seeAll, { color: accentColor }]}>Все →</Text>
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={featured}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={r => r.id + '_feat'}
                    contentContainerStyle={{ paddingRight: 16 }}
                    renderItem={({ item }) => (
                      <PopularCard
                        r={item}
                        onPress={() => router.push(`/restaurant/${item.id}`)}
                      />
                    )}
                  />
                </View>
              )}

              {/* ── Available Now ── */}
              {!loading && availableNow.length > 0 && (
                <View style={hs.section}>
                  <View style={hs.sectionHead}>
                    <Text style={[hs.sectionTitle, { color: th.text }]}>⚡ {t.available_now}</Text>
                    <View style={[hs.countBadge, { backgroundColor: th.accentBg }]}>
                      <Text style={[hs.countTxt, { color: th.accentText }]}>{filtered.length}</Text>
                    </View>
                  </View>
                  {availableNow.map(r => (
                    <AvailableNowCard
                      key={r.id + '_av'}
                      r={r}
                      th={th}
                      t={t}
                      onPress={() => router.push(`/restaurant/${r.id}`)}
                    />
                  ))}
                </View>
              )}

              {/* Section header for full list */}
              <View style={[hs.sectionHead, { marginTop: 8, marginBottom: 14 }]}>
                <Text style={[hs.sectionTitle, { color: th.text }]}>📖 {t.all_restaurants}</Text>
              </View>

              {loading && [0,1,2].map(i => <SkeletonCard key={i} th={th} />)}
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
      <FilterModal
        visible={filterModalOpen}
        initialFilters={filters}
        onClose={() => setFilterModalOpen(false)}
        onApply={setFilters}
      />
      {/* City picker bottom sheet */}
      <Modal visible={cityPickerOpen} transparent animationType="slide">
        <Pressable style={hs.cityOverlay} onPress={() => setCityPickerOpen(false)}>
          <View style={[hs.citySheet, { backgroundColor: th.bgCard }]}>
            <View style={[hs.cityHandle, { backgroundColor: th.border }]} />
            <Text style={[hs.cityTitle, { color: th.text }]}>{t.select_city}</Text>
            {AVAILABLE_CITIES.map(c => (
              <TouchableOpacity
                key={c.name}
                disabled={!c.active}
                onPress={() => {
                  if (c.active) {
                    setSelectedCity(c.name)
                    AsyncStorage.setItem(CITY_KEY, c.name).catch(() => {})
                    setCityPickerOpen(false)
                  }
                }}
                style={[hs.cityOpt, { borderBottomColor: th.border, opacity: c.active ? 1 : 0.5 }]}
                activeOpacity={0.7}
              >
                <Text style={hs.cityFlag}>{c.flag}</Text>
                <Text style={[hs.cityName, { color: c.active ? th.text : th.textSub }]}>{c.name}</Text>
                {c.active && c.name === selectedCity && (
                  <View style={[hs.cityDot, { backgroundColor: accentColor }]} />
                )}
                {!c.active && (
                  <Text style={[hs.citySoon, { color: th.textMuted }]}>{t.coming_soon}</Text>
                )}
              </TouchableOpacity>
            ))}
            <View style={{ height: 24 }} />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const hs = StyleSheet.create({
  safe:    { flex: 1 },
  screen:  { flex: 1 },
  list:    { paddingHorizontal: 16 },

  // Header
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, paddingBottom: 12, paddingHorizontal: 4 },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:      { width: 36, height: 36, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:   { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
  locationBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationTxt: { fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold' },
  iconBtn:     { width: 36, height: 36, borderRadius: radii.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // Greeting
  greetingBlock: { paddingHorizontal: 4, paddingBottom: 20 },
  greeting:      { fontSize: 24, fontFamily: 'DMSerifDisplay_400Regular', marginBottom: 4 },
  greetingSub:   { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular' },

  // Search row
  searchRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, marginBottom: 16 },
  searchBar:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 13, borderRadius: radii.lg, borderWidth: 1 },
  searchHint:   { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', flex: 1 },
  filterBtn:    { paddingHorizontal: 14, paddingVertical: 13, borderRadius: radii.lg, borderWidth: 1 },
  filterBtnTxt: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' },

  // Pills
  pillsRow:  { paddingHorizontal: 4, paddingBottom: 20, gap: 8 },
  pill:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.full, borderWidth: 1 },
  pillEmoji: { fontSize: 13 },
  pillTxt:   { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium' },

  // Section headers
  section:     { marginBottom: 24 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 14 },
  sectionTitle:{ fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold' },
  seeAll:      { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' },
  countBadge:  { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radii.sm },
  countTxt:    { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },

  // Empty state
  empty:       { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyEmoji:  { fontSize: 52, marginBottom: 16 },
  emptyTitle:  { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 6 },
  emptyDesc:   { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular' },

  // City picker
  cityOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  citySheet:   { borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: 16, paddingTop: 12 },
  cityHandle:  { width: 40, height: 4, borderRadius: radii.full, alignSelf: 'center', marginBottom: 16 },
  cityTitle:   { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 8, paddingHorizontal: 4 },
  cityOpt:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderBottomWidth: 1, paddingHorizontal: 4 },
  cityFlag:    { fontSize: 22 },
  cityName:    { fontSize: 16, fontFamily: 'PlusJakartaSans_500Medium', flex: 1 },
  cityDot:     { width: 8, height: 8, borderRadius: radii.full },
  citySoon:    { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular' },
})
