/**
 * FeaturedPromotionsBanner
 *
 * Horizontal auto-scrolling carousel of highlighted promotions
 * from all restaurants. Fetches /api/public/promotions/featured.
 * Tapping a card opens a detail sheet; CTA routes to the restaurant.
 */
import React, { useEffect, useRef, useState } from 'react'
import {
  Animated, Clipboard, Dimensions, FlatList, Modal,
  Pressable, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import { Image } from 'expo-image'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { useTheme, colors, radii } from '../theme'
import { useLang } from '../i18n'

const { width: W } = Dimensions.get('window')
const CARD_W = W * 0.72
const CARD_H = 160

// ─── Types ────────────────────────────────────────────────────────────────────

type PromotionType = 'DISCOUNT' | 'SPECIAL_OFFER' | 'HAPPY_HOUR' | 'EVENT' | 'BOOKING_BONUS'

interface FeaturedPromotion {
  id:              string
  restaurantId:    string
  title:           string
  titleEn?:        string | null
  titlePl?:        string | null
  titleUk?:        string | null
  description:     string
  descriptionEn?:  string | null
  descriptionPl?:  string | null
  descriptionUk?:  string | null
  type:            PromotionType
  discountPercent?: number | null
  discountAmount?:  number | null
  endDate?:        string | null
  timeStart?:      string | null
  timeEnd?:        string | null
  conditions?:     string | null
  promoCode?:      string | null
  imageUrl?:       string | null
  restaurant?: {
    id:   string
    name: string
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_EMOJI: Record<PromotionType, string> = {
  DISCOUNT:      '🏷',
  SPECIAL_OFFER: '🎁',
  HAPPY_HOUR:    '🍹',
  EVENT:         '🎉',
  BOOKING_BONUS: '⚡',
}

const TYPE_COLOR: Record<PromotionType, string> = {
  DISCOUNT:      '#3B82F6',
  SPECIAL_OFFER: '#A855F7',
  HAPPY_HOUR:    '#EAB308',
  EVENT:         '#EC4899',
  BOOKING_BONUS: '#22C55E',
}

const TYPE_LABEL: Record<PromotionType, string> = {
  DISCOUNT:      'Discount',
  SPECIAL_OFFER: 'Special offer',
  HAPPY_HOUR:    'Happy hour',
  EVENT:         'Event',
  BOOKING_BONUS: 'Booking bonus',
}

function pickLang(lang: string, base: string, en?: string | null, pl?: string | null, uk?: string | null) {
  if (lang === 'en' && en) return en
  if (lang === 'pl' && pl) return pl
  if (lang === 'uk' && uk) return uk
  return base
}

function daysLeft(endDate?: string | null): number | null {
  if (!endDate) return null
  const d = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000)
  return d > 0 ? d : 0
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function BannerSkeleton({ th }: { th: any }) {
  const pulse = useRef(new Animated.Value(0.4)).current
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
    ]))
    anim.start()
    return () => anim.stop()
  }, [])
  return (
    <View style={{ paddingLeft: 16 }}>
      <Animated.View style={{ opacity: pulse, flexDirection: 'row', gap: 12 }}>
        {[0, 1].map(i => (
          <View
            key={i}
            style={[bsk.card, { backgroundColor: th.bgCard, borderColor: th.border, width: CARD_W, height: CARD_H }]}
          />
        ))}
      </Animated.View>
    </View>
  )
}
const bsk = StyleSheet.create({
  card: { borderRadius: radii.lg, borderWidth: 1 },
})

// ─── Detail Sheet ─────────────────────────────────────────────────────────────

function PromoDetailSheet({
  promo, lang, th, t, onClose,
}: {
  promo:   FeaturedPromotion
  lang:    string
  th:      any
  t:       any
  onClose: () => void
}) {
  const translateY = useRef(new Animated.Value(700)).current
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0, tension: 60, friction: 11, useNativeDriver: true,
    }).start()
  }, [])

  function dismiss() {
    Animated.timing(translateY, { toValue: 700, duration: 220, useNativeDriver: true }).start(onClose)
  }

  function copyCode() {
    if (!promo.promoCode) return
    Clipboard.setString(promo.promoCode)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function goToRestaurant() {
    dismiss()
    setTimeout(() => router.push(`/restaurant/${promo.restaurantId}` as any), 240)
  }

  const title = pickLang(lang, promo.title, promo.titleEn, promo.titlePl, promo.titleUk)
  const desc  = pickLang(lang, promo.description, promo.descriptionEn, promo.descriptionPl, promo.descriptionUk)
  const color = TYPE_COLOR[promo.type]
  const days  = daysLeft(promo.endDate)

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={ds.backdrop} onPress={dismiss}>
        <Animated.View
          style={[ds.sheet, { backgroundColor: th.bgCard, transform: [{ translateY }] }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Photo / placeholder */}
          {promo.imageUrl ? (
            <Image source={{ uri: promo.imageUrl }} style={ds.photo} contentFit="cover" />
          ) : (
            <View style={[ds.photoPlaceholder, { backgroundColor: color + '20' }]}>
              <Text style={{ fontSize: 52 }}>{TYPE_EMOJI[promo.type]}</Text>
            </View>
          )}

          {/* Type badge */}
          <View style={[ds.badge, { backgroundColor: color + '22', borderColor: color + '44' }]}>
            <Text style={[ds.badgeTxt, { color }]}>{TYPE_EMOJI[promo.type]} {TYPE_LABEL[promo.type]}</Text>
          </View>

          <View style={ds.body}>
            {/* Restaurant name */}
            {promo.restaurant?.name && (
              <Text style={[ds.restName, { color: th.textMuted }]}>
                {promo.restaurant.name}
              </Text>
            )}

            <Text style={[ds.title, { color: th.text }]}>{title}</Text>
            <Text style={[ds.desc,  { color: th.textSub }]}>{desc}</Text>

            {/* Discount highlight */}
            {(promo.discountPercent || promo.discountAmount) && (
              <View style={[ds.discountBox, { backgroundColor: color + '15', borderColor: color + '30' }]}>
                {promo.discountPercent ? (
                  <Text style={[ds.discountTxt, { color }]}>{promo.discountPercent}% off</Text>
                ) : (
                  <Text style={[ds.discountTxt, { color }]}>{promo.discountAmount} PLN off</Text>
                )}
              </View>
            )}

            {/* Promo code */}
            {promo.promoCode && (
              <TouchableOpacity
                onPress={copyCode}
                activeOpacity={0.75}
                style={[ds.codeRow, { borderColor: th.border, backgroundColor: th.bg }]}
              >
                <Text style={[ds.codeTxt, { color: th.text }]}>{promo.promoCode}</Text>
                <Text style={[ds.copyTxt, { color: th.accent }]}>
                  {copied ? t.promo_code_copied : t.promo_copy_code}
                </Text>
              </TouchableOpacity>
            )}

            {/* Meta row */}
            <View style={ds.metaRow}>
              {promo.endDate ? (
                <Text style={[ds.metaTxt, { color: th.textMuted }]}>
                  {days !== null && days > 0
                    ? `${t.promo_ends_in} ${days}d`
                    : t.promo_active_now}
                </Text>
              ) : (
                <Text style={[ds.metaTxt, { color: th.textMuted }]}>{t.promo_permanent}</Text>
              )}
              {promo.timeStart && promo.timeEnd && (
                <Text style={[ds.metaTxt, { color: th.textMuted }]}>
                  {'  ·  '}{promo.timeStart} – {promo.timeEnd}
                </Text>
              )}
            </View>

            {/* Conditions */}
            {promo.conditions && (
              <Text style={[ds.conditions, { color: th.textMuted }]}>* {promo.conditions}</Text>
            )}

            {/* CTA */}
            <TouchableOpacity
              onPress={goToRestaurant}
              activeOpacity={0.85}
              style={[ds.bookBtn, { backgroundColor: th.accent }]}
            >
              <Text style={ds.bookBtnTxt}>{t.promo_book_btn}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

const ds = StyleSheet.create({
  backdrop:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet:           { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', maxHeight: '90%' },
  photo:           { width: '100%', aspectRatio: 16/9 },
  photoPlaceholder:{ width: '100%', aspectRatio: 16/9, alignItems: 'center', justifyContent: 'center' },
  badge:           { position: 'absolute', top: 16, left: 16, paddingHorizontal: 10, paddingVertical: 5,
                     borderRadius: 20, borderWidth: 1 },
  badgeTxt:        { fontSize: 12, fontWeight: '700' },
  body:            { padding: 20 },
  restName:        { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  title:           { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  desc:            { fontSize: 14, lineHeight: 21, marginBottom: 16 },
  discountBox:     { flexDirection: 'row', borderWidth: 1, borderRadius: 10,
                     paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
  discountTxt:     { fontSize: 18, fontWeight: '800' },
  codeRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                     borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
                     marginBottom: 14 },
  codeTxt:         { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  copyTxt:         { fontSize: 13, fontWeight: '600' },
  metaRow:         { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  metaTxt:         { fontSize: 12 },
  conditions:      { fontSize: 12, lineHeight: 17, marginBottom: 18 },
  bookBtn:         { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  bookBtnTxt:      { color: '#fff', fontSize: 15, fontWeight: '700' },
})

// ─── Banner Card ──────────────────────────────────────────────────────────────

function BannerCard({
  promo, lang, th, onPress,
}: {
  promo:   FeaturedPromotion
  lang:    string
  th:      any
  onPress: () => void
}) {
  const scale = useRef(new Animated.Value(1)).current
  const color = TYPE_COLOR[promo.type]
  const title = pickLang(lang, promo.title, promo.titleEn, promo.titlePl, promo.titleUk)
  const days  = daysLeft(promo.endDate)

  function onPressIn()  { Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 60, bounciness: 2 }).start() }
  function onPressOut() { Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 60 }).start() }

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }, { marginRight: 12 }]}>
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[bc.card, { width: CARD_W, height: CARD_H }]}
      >
        {/* Background image or color */}
        {promo.imageUrl ? (
          <Image
            source={{ uri: promo.imageUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: color + '30' }]} />
        )}

        {/* Dim overlay */}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.38)' }]} />

        {/* Bottom gradient */}
        <View style={bc.gradient} />

        {/* Type badge — top left */}
        <View style={[bc.typeBadge, { backgroundColor: color }]}>
          <Text style={bc.typeTxt}>{TYPE_EMOJI[promo.type]} {TYPE_LABEL[promo.type]}</Text>
        </View>

        {/* Content — bottom */}
        <View style={bc.content}>
          {promo.restaurant?.name && (
            <Text style={bc.restName} numberOfLines={1}>{promo.restaurant.name}</Text>
          )}
          <Text style={bc.title} numberOfLines={2}>{title}</Text>

          <View style={bc.footerRow}>
            {promo.discountPercent ? (
              <View style={bc.discountBadge}>
                <Text style={bc.discountTxt}>{promo.discountPercent}% off</Text>
              </View>
            ) : promo.discountAmount ? (
              <View style={bc.discountBadge}>
                <Text style={bc.discountTxt}>{promo.discountAmount} PLN</Text>
              </View>
            ) : promo.promoCode ? (
              <View style={bc.discountBadge}>
                <Text style={bc.discountTxt}>{promo.promoCode}</Text>
              </View>
            ) : null}

            {days !== null ? (
              <Text style={bc.expiresTxt}>{days}d left</Text>
            ) : (
              <Text style={bc.expiresTxt}>Permanent</Text>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
}

const bc = StyleSheet.create({
  card:         { borderRadius: radii.lg, overflow: 'hidden' },
  gradient:     { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
                  backgroundColor: 'rgba(0,0,0,0.72)' },
  typeBadge:    { position: 'absolute', top: 12, left: 12, paddingHorizontal: 8,
                  paddingVertical: 4, borderRadius: 20 },
  typeTxt:      { color: '#fff', fontSize: 11, fontWeight: '700' },
  content:      { position: 'absolute', bottom: 12, left: 12, right: 12 },
  restName:     { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '500', marginBottom: 2 },
  title:        { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 19, marginBottom: 6 },
  footerRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  discountBadge:{ backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 8,
                  paddingVertical: 3, borderRadius: 20 },
  discountTxt:  { color: '#fff', fontSize: 12, fontWeight: '800' },
  expiresTxt:   { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
})

// ─── Dot Indicator ────────────────────────────────────────────────────────────

function DotIndicator({ count, active, color }: { count: number; active: number; color: string }) {
  return (
    <View style={di.row}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            di.dot,
            { backgroundColor: i === active ? color : 'rgba(255,255,255,0.3)',
              width: i === active ? 16 : 6 },
          ]}
        />
      ))}
    </View>
  )
}
const di = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center', marginTop: 8 },
  dot: { height: 6, borderRadius: 3 },
})

// ─── Main Component ───────────────────────────────────────────────────────────

interface FeaturedPromotionsBannerProps {
  /** Called on section "See all" press — optional, navigates to search by default */
  onSeeAll?: () => void
}

export default function FeaturedPromotionsBanner({ onSeeAll }: FeaturedPromotionsBannerProps) {
  const { th, themeKey }  = useTheme()
  const { t, lang }       = useLang()

  const [promos,  setPromos]  = useState<FeaturedPromotion[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FeaturedPromotion | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const listRef = useRef<FlatList>(null)
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const API = process.env.EXPO_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

  useEffect(() => {
    fetch(`${API}/api/public/promotions/featured?lang=${lang}`)
      .then(r => r.json())
      .then(d => setPromos(Array.isArray(d.promotions) ? d.promotions : []))
      .catch(() => setPromos([]))
      .finally(() => setLoading(false))
  }, [lang])

  // Auto-scroll every 4 seconds
  useEffect(() => {
    if (promos.length < 2) return
    autoTimer.current = setInterval(() => {
      setActiveIndex(i => {
        const next = (i + 1) % promos.length
        listRef.current?.scrollToIndex({ index: next, animated: true })
        return next
      })
    }, 4000)
    return () => { if (autoTimer.current) clearInterval(autoTimer.current) }
  }, [promos.length])

  // Don't render if no promos
  if (!loading && promos.length === 0) return null

  const accentColor = themeKey === 'dark' ? colors.primaryAccent : colors.primary

  return (
    <View style={fb.section}>
      {/* Section header */}
      <View style={fb.header}>
        <Text style={[fb.sectionTitle, { color: th.text }]}>🎁 {t.promotions_label}</Text>
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={[fb.seeAll, { color: accentColor }]}>Все →</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <BannerSkeleton th={th} />
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={promos}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={p => p.id}
            contentContainerStyle={{ paddingLeft: 16, paddingRight: 4 }}
            snapToInterval={CARD_W + 12}
            decelerationRate="fast"
            onMomentumScrollEnd={e => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + 12))
              setActiveIndex(idx)
              // reset auto-scroll timer on manual swipe
              if (autoTimer.current) clearInterval(autoTimer.current)
            }}
            renderItem={({ item }) => (
              <BannerCard
                promo={item}
                lang={lang}
                th={th}
                onPress={() => {
                  if (autoTimer.current) clearInterval(autoTimer.current)
                  setSelected(item)
                }}
              />
            )}
          />

          {promos.length > 1 && (
            <DotIndicator count={promos.length} active={activeIndex} color={accentColor} />
          )}
        </>
      )}

      {selected && (
        <PromoDetailSheet
          promo={selected}
          lang={lang}
          th={th}
          t={t}
          onClose={() => setSelected(null)}
        />
      )}
    </View>
  )
}

const fb = StyleSheet.create({
  section:      { marginBottom: 8 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  seeAll:       { fontSize: 13, fontWeight: '600' },
})
