import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Image, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Calendar, Clock, Users, UtensilsCrossed, Edit3, X } from 'lucide-react-native'
import { router } from 'expo-router'
import { useTheme, colors, shadows, radii } from '../../src/theme'
import { useLang } from '../../src/i18n'
import { useAppStore, type Booking } from '../../src/store/useAppStore'
import { getMyBookings, cancelBooking } from '../../src/api/bookings'
import { normalizeRestaurant } from '../../src/utils/restaurant'
import { notifyBookingCancelled, cancelReminder } from '../../src/notifications'

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  confirmed: { color: colors.success,  bg: colors.success  + '1A', label: 'Подтверждена' },
  pending:   { color: '#6B7280',       bg: '#6B728018',             label: 'Ожидает'      },
  cancelled: { color: colors.error,    bg: colors.error    + '1A', label: 'Отменена'     },
  completed: { color: '#6B7280',       bg: '#6B728018',             label: 'Завершена'    },
  no_show:   { color: colors.warning,  bg: colors.warning  + '1A', label: 'Вы не пришли' },
}

function getStatusCfg(status: string) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
}

// ─── Human-readable date ──────────────────────────────────────────────────────
const DAY_NAMES = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']
const MONTH_NAMES = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']

function fmtDate(s: string): string {
  if (!s) return '—'
  try {
    const d = new Date(s)
    if (isNaN(d.getTime())) return s
    return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
  } catch { return s }
}

// ─── Booking ref cleanup ──────────────────────────────────────────────────────
function fmtRef(ref: string): string {
  if (!ref) return ''
  const clean = ref.replace(/^#+/, '')
  return clean.replace(/^([A-Z]{2,3})(\d+)$/, '$1-$2')
}

// ─── Restaurant image ─────────────────────────────────────────────────────────
function rImage(restaurantId: string): string {
  return `https://picsum.photos/seed/${restaurantId}/100/100`
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
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
    <Animated.View style={[sk.card, { opacity: pulse, backgroundColor: th.bgCard, borderColor: th.border }]}>
      <View style={sk.top}>
        <View style={[sk.photo, { backgroundColor: th.bgCardAlt }]} />
        <View style={sk.info}>
          <View style={[sk.line, { width: '60%', backgroundColor: th.bgCardAlt }]} />
          <View style={[sk.line, { width: '40%', height: 10, backgroundColor: th.bgCardAlt }]} />
        </View>
        <View style={[sk.badge, { backgroundColor: th.bgCardAlt }]} />
      </View>
    </Animated.View>
  )
}
const sk = StyleSheet.create({
  card:  { borderRadius: radii.md, borderWidth: 1, padding: 14, marginBottom: 10 },
  top:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photo: { width: 48, height: 48, borderRadius: radii.sm },
  info:  { flex: 1, gap: 8 },
  line:  { height: 13, borderRadius: 6 },
  badge: { width: 64, height: 22, borderRadius: radii.xs },
})

// ─── Booking Card ─────────────────────────────────────────────────────────────
function BookingCard({ b, th, t, onCancelled }: {
  b:           Booking
  th:          any
  t:           any
  onCancelled: (id: string) => void
}) {
  const rest       = normalizeRestaurant((b as any).restaurant ?? { id: b.restaurantId })
  const status     = (b.status as string) ?? 'pending'
  const cfg        = getStatusCfg(status)
  const isUpcoming = status === 'confirmed' || status === 'pending'
  const [cancelling, setCancelling] = useState(false)

  const scale = useRef(new Animated.Value(1)).current
  function onPressIn() {
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 60, bounciness: 2 }).start()
  }
  function onPressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 60 }).start()
  }

  async function handleCancel() {
    setCancelling(true)
    try {
      await cancelBooking(b.id)
      onCancelled(b.id)
    } catch {}
    finally { setCancelling(false) }
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }, shadows.sm, { borderRadius: radii.md, marginBottom: 10 }]}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => (b as any).restaurant && router.push(`/restaurant/${b.restaurantId}`)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.card, { backgroundColor: th.bgCard, borderColor: th.border }]}
      >
        {/* Top row: photo + info + status */}
        <View style={styles.cardTop}>
          <Image
            source={{ uri: rImage(b.restaurantId) }}
            style={styles.photo}
            resizeMode="cover"
          />
          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, { color: th.text }]} numberOfLines={1}>
              {rest.name || t.restaurant}
            </Text>
            <Text style={[styles.cardDistrict, { color: th.textSub }]}>{rest.district}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Meta row */}
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Calendar size={12} color={th.textMuted} strokeWidth={1.75} />
            <Text style={[styles.metaText, { color: th.textSub }]}>{fmtDate(b.date)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={12} color={th.textMuted} strokeWidth={1.75} />
            <Text style={[styles.metaText, { color: th.textSub }]}>{b.time ?? '—'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Users size={12} color={th.textMuted} strokeWidth={1.75} />
            <Text style={[styles.metaText, { color: th.textSub }]}>{b.guestCount}</Text>
          </View>
        </View>

        {/* Booking ref */}
        {b.bookingRef && (
          <Text style={[styles.ref, { color: th.textMuted }]}>
            {fmtRef(b.bookingRef)}
          </Text>
        )}

        {/* Action buttons for upcoming */}
        {isUpcoming && (
          <View style={[styles.actionsRow, { borderTopColor: th.border }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.actionBtn, { borderColor: th.border }]}
            >
              <Edit3 size={13} color={th.textSub} strokeWidth={1.75} />
              <Text style={[styles.actionBtnTxt, { color: th.textSub }]}>Изменить</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCancel}
              disabled={cancelling}
              activeOpacity={0.7}
              style={[styles.actionBtn, { borderColor: colors.error + '40', backgroundColor: colors.error + '08' }]}
            >
              {cancelling
                ? <ActivityIndicator size="small" color={colors.error} />
                : <>
                    <X size={13} color={colors.error} strokeWidth={2} />
                    <Text style={[styles.actionBtnTxt, { color: colors.error }]}>{t.cancel}</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function BookingsScreen() {
  const { th }      = useTheme()
  const { t, lang } = useLang()
  const { token, myBookings, setMyBookings } = useAppStore()

  function handleCancelled(id: string) {
    setMyBookings(myBookings.map(b => b.id === id ? { ...b, status: 'cancelled' as const } : b))
  }
  const prevBookingsRef = useRef<Booking[]>([])

  const [loading,    setLoading]    = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    if (!token) return
    setLoading(true)
    try {
      const data = await getMyBookings()
      const prev = prevBookingsRef.current
      if (prev.length > 0) {
        for (const updated of data) {
          if (updated.status !== 'cancelled') continue
          const old = prev.find(b => b.id === updated.id)
          if (old && old.status !== 'cancelled') {
            const rest = normalizeRestaurant((updated as any).restaurant ?? { id: updated.restaurantId })
            notifyBookingCancelled({ restaurantName: rest.name ?? 'restaurant', date: updated.date })
            cancelReminder(updated.id)
          }
        }
      }
      prevBookingsRef.current = data
      setMyBookings(data)
    } catch (e) {
      console.warn('[Bookings] load:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (token) load() }, [token])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [token])

  const upcoming = myBookings.filter(b => b.status !== 'cancelled' && b.status !== 'completed')
  const past     = myBookings.filter(b => b.status === 'cancelled' || b.status === 'completed')

  // Not logged in
  if (!token) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: th.bg }]} edges={['top']}>
        <Text style={[styles.pageTitle, { color: th.text }]}>{t.my_bookings}</Text>
        <View style={styles.empty}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
          <Text style={[styles.emptyTitle, { color: th.text }]}>{t.sign_in_required}</Text>
          <TouchableOpacity
            onPress={() => router.navigate('/(tabs)/profile')}
            style={[styles.findBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.findBtnText}>{t.sign_in}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  type Section = { title: string; data: Booking[]; isHistory?: boolean }
  const sections: Section[] = [
    ...(upcoming.length > 0 ? [{ title: t.upcoming,  data: upcoming }] : []),
    ...(past.length > 0     ? [{ title: t.past,      data: past,     isHistory: true }] : []),
  ]

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: th.bg }]} edges={['top']}>
      <FlatList
        data={sections}
        keyExtractor={section => section.title}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={[styles.pageTitle, { color: th.text }]}>{t.my_bookings}</Text>
        }
        renderItem={({ item: section }) => (
          <View style={{ marginBottom: 8 }}>
            <Text style={[styles.sectionLabel, { color: th.textMuted }]}>
              {section.title.toUpperCase()}
            </Text>
            {loading && !refreshing
              ? [0,1].map(i => <SkeletonCard key={i} th={th} />)
              : section.data.map(b => (
                  <BookingCard key={b.id} b={b} th={th} t={t} onCancelled={handleCancelled} />
                ))
            }
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyCenter}>
              <UtensilsCrossed size={48} color={th.textMuted} strokeWidth={1.5} />
              <Text style={[styles.emptyTitle, { color: th.text }]}>{t.no_bookings}</Text>
              <Text style={[styles.emptyDesc, { color: th.textMuted }]}>
                Найдите ресторан и забронируйте столик
              </Text>
              <TouchableOpacity
                onPress={() => router.navigate('/(tabs)/')}
                style={[styles.findBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.findBtnText}>{t.find_restaurant_btn}</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListFooterComponent={<View style={{ height: 24 }} />}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  list:         { paddingHorizontal: 16, paddingBottom: 24 },
  pageTitle:    { fontSize: 28, fontFamily: 'DMSerifDisplay_400Regular', paddingTop: 20, marginBottom: 20, paddingHorizontal: 4 },
  sectionLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 0.8, marginBottom: 10, marginTop: 8, paddingHorizontal: 4, color: '#9CA3AF' },

  // Card
  card:       { borderRadius: radii.md, padding: 14, borderWidth: 1 },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  photo:      { width: 48, height: 48, borderRadius: radii.sm, flexShrink: 0 },
  cardInfo:   { flex: 1 },
  cardName:   { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 2 },
  cardDistrict:{ fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular' },
  statusBadge:{ borderRadius: radii.xs, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  statusText: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold' },

  // Meta
  cardMeta:   { flexDirection: 'row', gap: 16 },
  metaItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:   { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular' },

  // Ref
  ref: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 8, opacity: 0.6 },

  // Actions
  actionsRow:   { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  actionBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: radii.sm, borderWidth: 1 },
  actionBtnTxt: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' },

  // Empty states
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyCenter:  { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle:   { fontSize: 18, fontFamily: 'PlusJakartaSans_600SemiBold', textAlign: 'center', marginTop: 8 },
  emptyDesc:    { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center', opacity: 0.7 },
  findBtn:      { paddingHorizontal: 32, paddingVertical: 14, borderRadius: radii.md, marginTop: 8 },
  findBtnText:  { color: '#fff', fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold' },
})
