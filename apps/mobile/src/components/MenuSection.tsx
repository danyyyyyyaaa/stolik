import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, SectionList, ScrollView,
  TouchableOpacity, Modal, Pressable, Animated, ActivityIndicator,
} from 'react-native'
import { Image } from 'expo-image'
import * as Haptics from 'expo-haptics'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../theme'
import { useLang } from '../i18n'
import { router } from 'expo-router'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MenuItem = {
  id: string
  name: string
  description: string | null
  price: number
  currency: string
  imageUrl: string | null
  weight: string | null
  calories: number | null
  allergens: string[]
  tags: string[]
  isAvailable: boolean
  specialPrice: number | null
  specialPriceLabel: string | null
}

export type MenuCategory = {
  id: string
  name: string
  position: number
  items: MenuItem[]
}

// ─── TAG config ───────────────────────────────────────────────────────────────

const TAG_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  vegetarian: { label: 'Veg',     emoji: '🌿', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  vegan:      { label: 'Vegan',   emoji: '🌱', color: '#15803d', bg: 'rgba(21,128,61,0.12)' },
  spicy:      { label: 'Spicy',   emoji: '🌶',  color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
  new:        { label: 'New',     emoji: '⭐',  color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
  popular:    { label: 'Popular', emoji: '🔥',  color: '#ea580c', bg: 'rgba(234,88,12,0.12)' },
  glutenfree: { label: 'GF',      emoji: '🌾',  color: '#b45309', bg: 'rgba(180,83,9,0.12)' },
}

const ALLERGEN_ICONS: Record<string, string> = {
  gluten: '🌾', dairy: '🥛', nuts: '🥜', eggs: '🥚',
  fish: '🐟', shellfish: '🦐', soy: '🫘', sesame: '🫙',
}

// ─── MenuItemDetailSheet ─────────────────────────────────────────────────────

function MenuItemDetailSheet({
  item, visible, onClose, restaurantId,
}: {
  item: MenuItem | null
  visible: boolean
  onClose: () => void
  restaurantId: string
}) {
  const { th } = useTheme()
  const { t } = useLang()
  const slideAnim = useRef(new Animated.Value(600)).current

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 600,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start()
  }, [visible])

  if (!item) return null

  const displayPrice = item.specialPrice ?? item.price
  const currency = item.currency === 'PLN' ? 'zł' : item.currency

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Animated.View
          style={[styles.sheet, { backgroundColor: th.bgCard, transform: [{ translateY: slideAnim }] }]}
        >
          <Pressable onPress={() => {}}>
            {/* Handle */}
            <View style={[styles.sheetHandle, { backgroundColor: th.border }]} />

            {/* Photo */}
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.sheetPhoto}
                contentFit="cover"
                transition={300}
              />
            ) : null}

            <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
              {/* Name + price */}
              <View style={styles.sheetNameRow}>
                <Text style={[styles.sheetName, { color: th.text }]}>{item.name}</Text>
                <View style={styles.sheetPriceCol}>
                  {item.specialPrice != null && (
                    <Text style={[styles.sheetOldPrice, { color: th.textMuted }]}>
                      {item.price.toFixed(2)} {currency}
                    </Text>
                  )}
                  <Text style={[styles.sheetPrice, { color: th.accent }]}>
                    {displayPrice.toFixed(2)} {currency}
                  </Text>
                  {item.specialPriceLabel ? (
                    <Text style={[styles.sheetPriceLabel, { color: '#16a34a' }]}>{item.specialPriceLabel}</Text>
                  ) : null}
                </View>
              </View>

              {/* Description */}
              {item.description ? (
                <Text style={[styles.sheetDesc, { color: th.textSub }]}>{item.description}</Text>
              ) : null}

              {/* Meta row */}
              <View style={styles.sheetMeta}>
                {item.weight ? (
                  <View style={[styles.metaBadge, { backgroundColor: th.accentBg }]}>
                    <Text style={[styles.metaText, { color: th.textSub }]}>{item.weight}</Text>
                  </View>
                ) : null}
                {item.calories ? (
                  <View style={[styles.metaBadge, { backgroundColor: th.accentBg }]}>
                    <Text style={[styles.metaText, { color: th.textSub }]}>{item.calories} kcal</Text>
                  </View>
                ) : null}
              </View>

              {/* Allergens */}
              {item.allergens.length > 0 && (
                <View style={styles.sheetSection}>
                  <Text style={[styles.sheetSectionLabel, { color: th.textMuted }]}>
                    {t.allergens_label ?? 'Allergens'}
                  </Text>
                  <View style={styles.allergenRow}>
                    {item.allergens.map(a => (
                      <View key={a} style={[styles.allergenChip, { borderColor: th.border, backgroundColor: th.bgCardAlt }]}>
                        <Text style={styles.allergenEmoji}>{ALLERGEN_ICONS[a] ?? '⚠️'}</Text>
                        <Text style={[styles.allergenLabel, { color: th.textSub }]}>{a}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Tags */}
              {item.tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {item.tags.map(tag => {
                    const cfg = TAG_CONFIG[tag]
                    if (!cfg) return null
                    return (
                      <View key={tag} style={[styles.tagChip, { backgroundColor: cfg.bg }]}>
                        <Text style={styles.tagEmoji}>{cfg.emoji}</Text>
                        <Text style={[styles.tagText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    )
                  })}
                </View>
              )}

              {/* Unavailable notice */}
              {!item.isAvailable && (
                <View style={[styles.unavailableBanner, { backgroundColor: 'rgba(220,38,38,0.08)' }]}>
                  <Text style={[styles.unavailableText, { color: '#dc2626' }]}>
                    {t.menu_unavailable ?? 'Not available today'}
                  </Text>
                </View>
              )}

              {/* CTA */}
              <TouchableOpacity
                style={[styles.sheetCta, { backgroundColor: th.accent }]}
                activeOpacity={0.85}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                  onClose()
                  router.push(`/booking/${restaurantId}`)
                }}
              >
                <Text style={[styles.sheetCtaText, { color: th.accentText }]}>
                  {t.book_table ?? 'Book a table'}
                </Text>
              </TouchableOpacity>

              <View style={{ height: 32 }} />
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

// ─── MenuItemCard ─────────────────────────────────────────────────────────────

function MenuItemCard({
  item, onPress, fadeAnim,
}: {
  item: MenuItem
  onPress: () => void
  fadeAnim: Animated.Value
}) {
  const { th } = useTheme()
  const currency = item.currency === 'PLN' ? 'zł' : item.currency
  const displayPrice = item.specialPrice ?? item.price

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        style={[styles.card, { borderBottomColor: th.border, opacity: item.isAvailable ? 1 : 0.5 }]}
        activeOpacity={0.75}
        onPress={onPress}
      >
        {/* Left: text */}
        <View style={styles.cardLeft}>
          <Text style={[styles.cardName, { color: th.text }]} numberOfLines={1}>{item.name}</Text>
          {item.description ? (
            <Text style={[styles.cardDesc, { color: th.textMuted }]} numberOfLines={2}>{item.description}</Text>
          ) : null}

          {/* Price row */}
          <View style={styles.cardPriceRow}>
            {item.specialPrice != null ? (
              <>
                <Text style={[styles.cardOldPrice, { color: th.textMuted }]}>
                  {item.price.toFixed(2)} {currency}
                </Text>
                <Text style={[styles.cardPrice, { color: '#16a34a' }]}>
                  {displayPrice.toFixed(2)} {currency}
                </Text>
              </>
            ) : (
              <Text style={[styles.cardPrice, { color: th.accent }]}>
                {displayPrice.toFixed(2)} {currency}
              </Text>
            )}
            {item.weight ? (
              <View style={[styles.weightBadge, { backgroundColor: th.bgCardAlt }]}>
                <Text style={[styles.weightText, { color: th.textMuted }]}>{item.weight}</Text>
              </View>
            ) : null}
          </View>

          {/* Tags */}
          {item.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {item.tags.slice(0, 3).map(tag => {
                const cfg = TAG_CONFIG[tag]
                if (!cfg) return null
                return (
                  <View key={tag} style={[styles.tagChip, { backgroundColor: cfg.bg }]}>
                    <Text style={styles.tagEmoji}>{cfg.emoji}</Text>
                    <Text style={[styles.tagText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                )
              })}
              {!item.isAvailable && (
                <View style={[styles.tagChip, { backgroundColor: 'rgba(220,38,38,0.10)' }]}>
                  <Text style={[styles.tagText, { color: '#dc2626' }]}>
                    {'\u2205'} N/A
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Right: thumbnail */}
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={[styles.cardThumb, { borderColor: th.border }]}
            contentFit="cover"
            transition={300}
          />
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  )
}

// ─── MenuSkeleton ─────────────────────────────────────────────────────────────

function MenuSkeleton() {
  const { th } = useTheme()
  const pulse = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  const Bone = ({ style }: { style: any }) => (
    <Animated.View style={[{ backgroundColor: th.bgCardAlt, borderRadius: 6 }, style, { opacity: pulse }]} />
  )

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      {/* Tab skeletons */}
      <View style={styles.skelTabRow}>
        {[80, 64, 72].map((w, i) => <Bone key={i} style={{ width: w, height: 28, marginRight: 8, borderRadius: 14 }} />)}
      </View>
      {/* Card skeletons */}
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={[styles.skelCard, { borderBottomColor: th.border }]}>
          <View style={styles.skelCardLeft}>
            <Bone style={{ width: '70%', height: 16, marginBottom: 8 }} />
            <Bone style={{ width: '90%', height: 12, marginBottom: 4 }} />
            <Bone style={{ width: '60%', height: 12 }} />
          </View>
          <Bone style={{ width: 80, height: 80, borderRadius: 12 }} />
        </View>
      ))}
    </View>
  )
}

// ─── MenuEmptyState ───────────────────────────────────────────────────────────

function MenuEmptyState() {
  const { th } = useTheme()
  const { t } = useLang()
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>🍽️</Text>
      <Text style={[styles.emptyTitle, { color: th.text }]}>
        {t.menu_empty_title ?? 'No menu yet'}
      </Text>
      <Text style={[styles.emptyDesc, { color: th.textMuted }]}>
        {t.menu_empty_desc ?? "The restaurant hasn't added their menu yet"}
      </Text>
    </View>
  )
}

// ─── MenuSection (main export) ────────────────────────────────────────────────

const API = process.env.EXPO_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

export default function MenuSection({ restaurantId }: { restaurantId: string }) {
  const { th } = useTheme()
  const { lang } = useLang()

  const [categories, setCategories]   = useState<MenuCategory[]>([])
  const [loading, setLoading]         = useState(true)
  const [activeCat, setActiveCat]     = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [sheetVisible, setSheetVisible] = useState(false)

  const listRef    = useRef<SectionList>(null)
  const tabScrollRef = useRef<ScrollView>(null)
  const fadeAnims  = useRef<Record<string, Animated.Value>>({})

  // Fetch menu
  useEffect(() => {
    setLoading(true)
    fetch(`${API}/api/public/restaurants/${restaurantId}/menu?lang=${lang}`)
      .then(r => r.json())
      .then(data => {
        const cats: MenuCategory[] = data.categories ?? []
        setCategories(cats)
        if (cats.length > 0) setActiveCat(cats[0].id)
        // Pre-create fade anims
        cats.forEach(cat => {
          cat.items.forEach(item => {
            if (!fadeAnims.current[item.id]) {
              fadeAnims.current[item.id] = new Animated.Value(0)
            }
          })
        })
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false))
  }, [restaurantId, lang])

  // Animate cards in after load
  useEffect(() => {
    if (loading || categories.length === 0) return
    const allItems = categories.flatMap(c => c.items)
    allItems.forEach((item, idx) => {
      const anim = fadeAnims.current[item.id]
      if (anim) {
        setTimeout(() => {
          Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }).start()
        }, idx * 30)
      }
    })
  }, [loading, categories])

  const handleTabPress = useCallback((catId: string, index: number) => {
    setActiveCat(catId)
    listRef.current?.scrollToLocation({ sectionIndex: index, itemIndex: 0, animated: true, viewOffset: 0 })
    tabScrollRef.current?.scrollTo({ x: Math.max(0, index * 88 - 40), animated: true })
  }, [])

  const handleItemPress = useCallback((item: MenuItem) => {
    Haptics.selectionAsync()
    setSelectedItem(item)
    setSheetVisible(true)
  }, [])

  if (loading) return <MenuSkeleton />
  if (categories.length === 0) return <MenuEmptyState />

  const sections = categories.map(cat => ({
    key: cat.id,
    title: cat.name,
    catId: cat.id,
    data: cat.items,
  }))

  return (
    <View style={styles.container}>
      {/* ─── Sticky category tabs ─────────────────────────────────────── */}
      <View style={[styles.tabsWrapper, { backgroundColor: th.bg, borderBottomColor: th.border }]}>
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {categories.map((cat, idx) => {
            const isActive = cat.id === activeCat
            return (
              <TouchableOpacity
                key={cat.id}
                style={styles.tabBtn}
                activeOpacity={0.7}
                onPress={() => handleTabPress(cat.id, idx)}
              >
                <Text style={[
                  styles.tabText,
                  { color: isActive ? th.accent : th.textSub },
                  isActive && styles.tabTextActive,
                ]}>
                  {cat.name}
                </Text>
                {isActive && <View style={[styles.tabUnderline, { backgroundColor: th.accent }]} />}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* ─── Items list ───────────────────────────────────────────────── */}
      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={item => item.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={({ viewableItems }) => {
          const firstSection = viewableItems.find(vi => vi.section != null)
          if (firstSection?.section?.catId) {
            setActiveCat(firstSection.section.catId)
          }
        }}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: th.bg }]}>
            <Text style={[styles.sectionTitle, { color: th.text }]}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <MenuItemCard
            item={item}
            onPress={() => handleItemPress(item)}
            fadeAnim={fadeAnims.current[item.id] ?? new Animated.Value(1)}
          />
        )}
        contentContainerStyle={{ paddingBottom: 32 }}
      />

      {/* ─── Detail bottom sheet ──────────────────────────────────────── */}
      <MenuItemDetailSheet
        item={selectedItem}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        restaurantId={restaurantId}
      />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Tabs
  tabsWrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  tabsScroll: { paddingHorizontal: 12, paddingVertical: 4 },
  tabBtn: { paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', position: 'relative' },
  tabText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular' },
  tabTextActive: { fontFamily: 'PlusJakartaSans_600SemiBold' },
  tabUnderline: { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, borderRadius: 1 },

  // Section header
  sectionHeader: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  sectionTitle: { fontSize: 18, fontFamily: 'DMSerifDisplay_400Regular' },

  // Card
  card: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
    gap: 12,
  },
  cardLeft: { flex: 1 },
  cardName: { fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 4 },
  cardDesc: { fontSize: 13, lineHeight: 19, marginBottom: 6 },
  cardPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardPrice: { fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold' },
  cardOldPrice: { fontSize: 13, textDecorationLine: 'line-through' },
  cardThumb: { width: 80, height: 80, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  weightBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  weightText: { fontSize: 11 },

  // Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 100,
  },
  tagEmoji: { fontSize: 11 },
  tagText: { fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium' },

  // Bottom sheet
  sheetBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '90%', overflow: 'hidden',
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  sheetPhoto: { width: '100%', aspectRatio: 16 / 9 },
  sheetBody: { padding: 20 },
  sheetNameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  sheetName: { fontSize: 22, fontFamily: 'DMSerifDisplay_400Regular', flex: 1, marginRight: 12 },
  sheetPriceCol: { alignItems: 'flex-end' },
  sheetPrice: { fontSize: 20, fontFamily: 'PlusJakartaSans_600SemiBold' },
  sheetOldPrice: { fontSize: 14, textDecorationLine: 'line-through' },
  sheetPriceLabel: { fontSize: 11, marginTop: 2 },
  sheetDesc: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  sheetMeta: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  metaBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  metaText: { fontSize: 13 },
  sheetSection: { marginBottom: 16 },
  sheetSectionLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  allergenRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allergenChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  allergenEmoji: { fontSize: 16 },
  allergenLabel: { fontSize: 13, textTransform: 'capitalize' },
  unavailableBanner: { padding: 12, borderRadius: 10, marginBottom: 16, alignItems: 'center' },
  unavailableText: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium' },
  sheetCta: {
    height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  sheetCtaText: { fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold' },

  // Skeleton
  skelTabRow: { flexDirection: 'row', marginBottom: 12 },
  skelCard: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  skelCardLeft: { flex: 1 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontFamily: 'DMSerifDisplay_400Regular', marginBottom: 8, textAlign: 'center' },
  emptyDesc: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
})
