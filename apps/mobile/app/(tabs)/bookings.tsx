import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTheme } from '../../src/theme'
import { useLang } from '../../src/i18n'
import { useAppStore, type Booking } from '../../src/store/useAppStore'
import { getMyBookings, cancelBooking } from '../../src/api/bookings'
import { normalizeRestaurant } from '../../src/utils/restaurant'
import { notifyBookingCancelled, cancelReminder } from '../../src/notifications'

const STATUS_COLOR: Record<string, string> = {
  confirmed:  '#238636',
  pending:    '#F0A500',
  cancelled:  '#F85149',
  completed:  '#8B949E',
}

function fmtDate(s: string): string {
  if (!s) return '—'
  try {
    return new Date(s).toISOString().slice(0, 10)
  } catch { return s }
}

function BookingCard({ b, th, t, onCancelled }: {
  b:           Booking
  th:          any
  t:           any
  onCancelled: (id: string) => void
}) {
  const rest       = normalizeRestaurant((b as any).restaurant ?? { id: b.restaurantId })
  const status     = b.status ?? 'pending'
  const color      = STATUS_COLOR[status] ?? STATUS_COLOR.pending
  const label      = t[`status_${status}`] ?? status
  const isUpcoming = status === 'confirmed' || status === 'pending'
  const [cancelling, setCancelling] = useState(false)

  async function handleCancel() {
    setCancelling(true)
    try {
      await cancelBooking(b.id)
      onCancelled(b.id)
    } catch {}
    finally { setCancelling(false) }
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => (b as any).restaurant && router.push(`/restaurant/${b.restaurantId}`)}
      style={[styles.card, { backgroundColor: th.bgCard, borderColor: th.border }]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.emojiBox, { backgroundColor: (rest.color ?? '#238636') + '28' }]}>
          <Text style={{ fontSize: 22 }}>{rest.emoji ?? '🍽️'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: th.text }]} numberOfLines={1}>
            {rest.name || t.restaurant}
          </Text>
          <Text style={[styles.cardDistrict, { color: th.textSub }]}>
            {rest.district}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.statusText, { color }]}>{label}</Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Feather name="calendar" size={12} color={th.textMuted} />
          <Text style={[styles.metaText, { color: th.textSub }]}>{fmtDate(b.date)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="clock" size={12} color={th.textMuted} />
          <Text style={[styles.metaText, { color: th.textSub }]}>{b.time ?? '—'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="users" size={12} color={th.textMuted} />
          <Text style={[styles.metaText, { color: th.textSub }]}>{b.guestCount}</Text>
        </View>
      </View>
      {b.bookingRef && (
        <Text style={[styles.ref, { color: th.textMuted }]}>#{b.bookingRef}</Text>
      )}
      {isUpcoming && (
        <TouchableOpacity
          onPress={handleCancel}
          disabled={cancelling}
          activeOpacity={0.7}
          style={[styles.cancelRow, { borderTopColor: th.border }]}
        >
          {cancelling
            ? <ActivityIndicator size="small" color={th.textMuted} />
            : <Text style={styles.cancelRowText}>{t.cancel}</Text>
          }
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
}

export default function BookingsScreen() {
  const { th }       = useTheme()
  const { t, lang }  = useLang()
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

      // Detect bookings that were newly cancelled since last fetch
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

  if (!token) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: th.bg }]} edges={['top']}>
        <View style={styles.empty}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
          <Text style={[styles.emptyTitle, { color: th.text }]}>
            {t.sign_in_required}
          </Text>
          <TouchableOpacity
            onPress={() => router.navigate('/(tabs)/profile')}
            style={[styles.signInBtn, { backgroundColor: th.accent }]}
          >
            <Text style={styles.signInBtnText}>{t.sign_in}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  type Section = { title: string; data: Booking[] }
  const sections: Section[] = [
    ...(upcoming.length > 0 ? [{ title: t.upcoming, data: upcoming }] : []),
    ...(past.length > 0     ? [{ title: t.past,     data: past     }] : []),
  ]

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: th.bg }]} edges={['top']}>
      <FlatList
        data={sections}
        keyExtractor={s => s.title}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={th.accent} colors={[th.accent]} />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={[styles.pageTitle, { color: th.text }]}>{t.my_bookings}</Text>
        }
        renderItem={({ item: section }) => (
          <View>
            <Text style={[styles.sectionLabel, { color: th.textMuted }]}>
              {section.title.toUpperCase()}
            </Text>
            {section.data.map(b => (
              <BookingCard key={b.id} b={b} th={th} t={t} onCancelled={handleCancelled} />
            ))}
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptySmall}>
              <Text style={{ fontSize: 44, marginBottom: 12 }}>📅</Text>
              <Text style={[styles.emptyTitle, { color: th.text }]}>{t.no_bookings}</Text>
              <TouchableOpacity
                onPress={() => router.navigate('/(tabs)/')}
                style={[styles.findBtn, { backgroundColor: th.accent }]}
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
  list:         { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24 },
  pageTitle:    { fontSize: 24, fontWeight: '800', marginBottom: 20, paddingHorizontal: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10, marginTop: 8, paddingHorizontal: 4 },
  card:         { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10 },
  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  emojiBox:     { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardInfo:     { flex: 1 },
  cardName:     { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  cardDistrict: { fontSize: 12 },
  statusBadge:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:   { fontSize: 11, fontWeight: '600' },
  cardMeta:     { flexDirection: 'row', gap: 16 },
  metaItem:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:     { fontSize: 12 },
  ref:          { fontSize: 11, marginTop: 8 },
  cancelRow:    { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  cancelRowText:{ fontSize: 13, color: '#F85149', fontWeight: '500' },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptySmall:   { alignItems: 'center', paddingTop: 60 },
  emptyTitle:   { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 20 },
  findBtn:      { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  findBtnText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
  signInBtn:    { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  signInBtnText:{ color: '#fff', fontSize: 15, fontWeight: '700' },
})
