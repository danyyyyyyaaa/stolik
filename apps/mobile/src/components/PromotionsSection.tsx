import React, { useEffect, useState, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Clipboard, Modal, Pressable,
} from 'react-native'
import { Image } from 'expo-image'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { useTheme } from '../theme'
import { useLang } from '../i18n'

// ─── Types ────────────────────────────────────────────────────────────────────

type PromotionType   = 'DISCOUNT' | 'SPECIAL_OFFER' | 'HAPPY_HOUR' | 'EVENT' | 'BOOKING_BONUS'
type PromotionStatus = 'ACTIVE'

interface Promotion {
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
  startDate:       string
  endDate?:        string | null
  recurringDays:   number[]
  timeStart?:      string | null
  timeEnd?:        string | null
  conditions?:     string | null
  promoCode?:      string | null
  imageUrl?:       string | null
  isHighlighted:   boolean
  status:          PromotionStatus
  viewCount:       number
  clickCount:      number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function daysUntilEnd(endDate?: string | null): number | null {
  if (!endDate) return null
  const diff = new Date(endDate).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function pickLang(lang: string, base: string, en?: string | null, pl?: string | null, uk?: string | null) {
  if (lang === 'en' && en) return en
  if (lang === 'pl' && pl) return pl
  if (lang === 'uk' && uk) return uk
  return base
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PromotionSkeleton({ th }: { th: any }) {
  const pulse = useRef(new Animated.Value(0.4)).current
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
    ])).start()
  }, [])
  return (
    <Animated.View style={{ opacity: pulse }}>
      <View style={[sk.card, { backgroundColor: th.bgCard, borderColor: th.border }]}>
        <View style={[sk.img, { backgroundColor: th.border }]} />
        <View style={sk.body}>
          <View style={[sk.line, { backgroundColor: th.border, width: '40%' }]} />
          <View style={[sk.line, { backgroundColor: th.border, width: '80%', marginTop: 8 }]} />
          <View style={[sk.line, { backgroundColor: th.border, width: '60%', marginTop: 6 }]} />
        </View>
      </View>
    </Animated.View>
  )
}

const sk = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 12, height: 100 },
  img:  { width: 100, height: '100%' },
  body: { flex: 1, padding: 14, justifyContent: 'center' },
  line: { height: 12, borderRadius: 6 },
})

// ─── PromotionDetailSheet ─────────────────────────────────────────────────────

function PromotionDetailSheet({
  promo, lang, th, t, onClose, onBook,
}: {
  promo:   Promotion
  lang:    string
  th:      any
  t:       any
  onClose: () => void
  onBook:  () => void
}) {
  const translateY = useRef(new Animated.Value(600)).current
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Animated.spring(translateY, {
      toValue:         0,
      tension:         60,
      friction:        11,
      useNativeDriver: true,
    }).start()
  }, [])

  function close() {
    Animated.timing(translateY, { toValue: 600, duration: 220, useNativeDriver: true }).start(onClose)
  }

  function copyCode() {
    if (!promo.promoCode) return
    Clipboard.setString(promo.promoCode)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const title = pickLang(lang, promo.title, promo.titleEn, promo.titlePl, promo.titleUk)
  const desc  = pickLang(lang, promo.description, promo.descriptionEn, promo.descriptionPl, promo.descriptionUk)
  const daysLeft = daysUntilEnd(promo.endDate)
  const color    = TYPE_COLOR[promo.type]

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <Pressable style={ds.backdrop} onPress={close}>
        <Animated.View
          style={[ds.sheet, { backgroundColor: th.bgCard, transform: [{ translateY }] }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Photo */}
          {promo.imageUrl ? (
            <Image source={{ uri: promo.imageUrl }} style={ds.photo} contentFit="cover" />
          ) : (
            <View style={[ds.photoPlaceholder, { backgroundColor: color + '22' }]}>
              <Text style={{ fontSize: 48 }}>{TYPE_EMOJI[promo.type]}</Text>
            </View>
          )}

          {/* Badge */}
          <View style={[ds.typeBadge, { backgroundColor: color + '22', borderColor: color + '44' }]}>
            <Text style={[ds.typeBadgeText, { color }]}>{TYPE_EMOJI[promo.type]} {TYPE_LABEL[promo.type]}</Text>
          </View>

          <View style={ds.body}>
            <Text style={[ds.title, { color: th.text }]}>{title}</Text>
            <Text style={[ds.desc, { color: th.textSub }]}>{desc}</Text>

            {/* Discount */}
            {(promo.discountPercent || promo.discountAmount) && (
              <View style={[ds.discountRow, { backgroundColor: color + '15', borderColor: color + '30' }]}>
                {promo.discountPercent && (
                  <Text style={[ds.discountText, { color }]}>{promo.discountPercent}% off</Text>
                )}
                {promo.discountAmount && (
                  <Text style={[ds.discountText, { color }]}>{promo.discountAmount} PLN off</Text>
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
                <Text style={[ds.codeText, { color: th.text }]}>{promo.promoCode}</Text>
                <Text style={[ds.copyText, { color: th.accent }]}>
                  {copied ? t.promo_code_copied : t.promo_copy_code}
                </Text>
              </TouchableOpacity>
            )}

            {/* Time/dates */}
            <View style={ds.metaRow}>
              {promo.endDate ? (
                <Text style={[ds.metaText, { color: th.textMuted }]}>
                  {daysLeft && daysLeft > 0 ? `${t.promo_ends_in} ${daysLeft}d` : t.promo_active_now}
                </Text>
              ) : (
                <Text style={[ds.metaText, { color: th.textMuted }]}>{t.promo_permanent}</Text>
              )}
              {promo.timeStart && promo.timeEnd && (
                <Text style={[ds.metaText, { color: th.textMuted }]}>
                  {'  ·  '}{promo.timeStart} – {promo.timeEnd}
                </Text>
              )}
              {promo.recurringDays.length > 0 && (
                <Text style={[ds.metaText, { color: th.textMuted }]}>
                  {'  ·  '}{promo.recurringDays.map(d => DAY_ABBR[d]).join(', ')}
                </Text>
              )}
            </View>

            {/* Conditions */}
            {promo.conditions && (
              <Text style={[ds.conditions, { color: th.textMuted }]}>* {promo.conditions}</Text>
            )}

            {/* Book button */}
            <TouchableOpacity
              onPress={() => { close(); onBook() }}
              activeOpacity={0.85}
              style={[ds.bookBtn, { backgroundColor: th.accent }]}
            >
              <Text style={ds.bookBtnText}>{t.promo_book_btn}</Text>
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
  typeBadge:       { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center',
                     paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  typeBadgeText:   { fontSize: 12, fontWeight: '700' },
  body:            { padding: 20 },
  title:           { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  desc:            { fontSize: 14, lineHeight: 21, marginBottom: 16 },
  discountRow:     { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 10,
                     paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
  discountText:    { fontSize: 16, fontWeight: '800' },
  codeRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                     borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
                     marginBottom: 14 },
  codeText:        { fontSize: 18, fontWeight: '900', letterSpacing: 2, fontVariant: ['tabular-nums'] },
  copyText:        { fontSize: 13, fontWeight: '600' },
  metaRow:         { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  metaText:        { fontSize: 12 },
  conditions:      { fontSize: 12, lineHeight: 17, marginBottom: 18 },
  bookBtn:         { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  bookBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
})

// ─── PromotionCard ────────────────────────────────────────────────────────────

function PromotionCard({
  promo, lang, th, t, onPress,
}: {
  promo:   Promotion
  lang:    string
  th:      any
  t:       any
  onPress: () => void
}) {
  const color     = TYPE_COLOR[promo.type]
  const title     = pickLang(lang, promo.title, promo.titleEn, promo.titlePl, promo.titleUk)
  const desc      = pickLang(lang, promo.description, promo.descriptionEn, promo.descriptionPl, promo.descriptionUk)
  const daysLeft  = daysUntilEnd(promo.endDate)

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.82}
      style={[pc.card, { backgroundColor: th.bgCard, borderColor: th.border }]}
    >
      {/* Left color stripe */}
      <View style={[pc.stripe, { backgroundColor: color }]} />

      {/* Image or emoji placeholder */}
      {promo.imageUrl ? (
        <Image source={{ uri: promo.imageUrl }} style={pc.img} contentFit="cover" />
      ) : (
        <View style={[pc.imgPlaceholder, { backgroundColor: color + '1A' }]}>
          <Text style={{ fontSize: 28 }}>{TYPE_EMOJI[promo.type]}</Text>
        </View>
      )}

      {/* Content */}
      <View style={pc.content}>
        {/* Type badge */}
        <View style={[pc.badge, { backgroundColor: color + '1A' }]}>
          <Text style={[pc.badgeText, { color }]}>{TYPE_LABEL[promo.type]}</Text>
        </View>

        <Text style={[pc.title, { color: th.text }]} numberOfLines={1}>{title}</Text>
        <Text style={[pc.desc, { color: th.textSub }]} numberOfLines={2}>{desc}</Text>

        {/* Footer row */}
        <View style={pc.footer}>
          {promo.discountPercent ? (
            <Text style={[pc.discount, { color }]}>{promo.discountPercent}% off</Text>
          ) : promo.discountAmount ? (
            <Text style={[pc.discount, { color }]}>{promo.discountAmount} PLN off</Text>
          ) : null}

          {promo.endDate && daysLeft !== null && daysLeft > 0 ? (
            <Text style={[pc.expires, { color: th.textMuted }]}>{t.promo_ends_in} {daysLeft}d</Text>
          ) : !promo.endDate ? (
            <Text style={[pc.expires, { color: th.textMuted }]}>{t.promo_permanent}</Text>
          ) : (
            <Text style={[pc.expires, { color: '#22C55E' }]}>{t.promo_active_now}</Text>
          )}

          {promo.isHighlighted && (
            <Text style={pc.star}>⭐</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const pc = StyleSheet.create({
  card:          { flexDirection: 'row', borderRadius: 14, borderWidth: 1, overflow: 'hidden',
                   marginBottom: 12 },
  stripe:        { width: 4 },
  img:           { width: 90, height: 90 },
  imgPlaceholder:{ width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
  content:       { flex: 1, padding: 12, justifyContent: 'space-between' },
  badge:         { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
                   borderRadius: 20, marginBottom: 4 },
  badgeText:     { fontSize: 11, fontWeight: '600' },
  title:         { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  desc:          { fontSize: 12, lineHeight: 17 },
  footer:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  discount:      { fontSize: 13, fontWeight: '800' },
  expires:       { fontSize: 11 },
  star:          { marginLeft: 'auto', fontSize: 12 },
})

// ─── PromotionsSection ────────────────────────────────────────────────────────

interface PromotionsSectionProps {
  restaurantId: string
}

export default function PromotionsSection({ restaurantId }: PromotionsSectionProps) {
  const { th }       = useTheme()
  const { t, lang }  = useLang()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<Promotion | null>(null)

  const API = process.env.EXPO_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/api/public/restaurants/${restaurantId}/promotions?lang=${lang}`)
      .then(r => r.json())
      .then(d => setPromotions(Array.isArray(d.promotions) ? d.promotions : []))
      .catch(() => setPromotions([]))
      .finally(() => setLoading(false))
  }, [restaurantId, lang])

  if (loading) {
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        {[1, 2, 3].map(i => <PromotionSkeleton key={i} th={th} />)}
      </View>
    )
  }

  if (promotions.length === 0) {
    return (
      <View style={[ps.empty, { backgroundColor: th.bgCard, borderColor: th.border }]}>
        <Text style={{ fontSize: 36, marginBottom: 12 }}>🎁</Text>
        <Text style={[ps.emptyTitle, { color: th.text }]}>{t.promotions_label}</Text>
        <Text style={[ps.emptyDesc, { color: th.textSub }]}>No active promotions right now</Text>
      </View>
    )
  }

  // Highlighted promos first
  const sorted = [...promotions].sort((a, b) =>
    (b.isHighlighted ? 1 : 0) - (a.isHighlighted ? 1 : 0)
  )

  return (
    <View style={ps.root}>
      {sorted.map(promo => (
        <PromotionCard
          key={promo.id}
          promo={promo}
          lang={lang}
          th={th}
          t={t}
          onPress={() => setSelected(promo)}
        />
      ))}

      {selected && (
        <PromotionDetailSheet
          promo={selected}
          lang={lang}
          th={th}
          t={t}
          onClose={() => setSelected(null)}
          onBook={() => router.push(`/booking/${restaurantId}` as any)}
        />
      )}
    </View>
  )
}

const ps = StyleSheet.create({
  root:       { paddingHorizontal: 16, paddingTop: 8 },
  empty:      { margin: 16, borderRadius: 16, borderWidth: 1, padding: 32,
                alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptyDesc:  { fontSize: 14, textAlign: 'center' },
})
