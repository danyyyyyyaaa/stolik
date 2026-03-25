import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTheme } from '../../src/theme'
import { useLang } from '../../src/i18n'
import { useAppStore, type Booking } from '../../src/store/useAppStore'
import { getMyBookings } from '../../src/api/bookings'
import { normalizeRestaurant } from '../../src/utils/restaurant'

const STATUS_COLOR: Record<string, string> = {
  confirmed:  '#238636',
  pending:    '#F0A500',
  cancelled:  '#F85149',
  completed:  '#8B949E',
}
const STATUS_LABEL: Record<string, Record<string, string>> = {
  confirmed:  { pl: 'Potwierdzona', en: 'Confirmed', ru: 'Подтверждена', uk: 'Підтверджена' },
  pending:    { pl: 'Oczekująca',   en: 'Pending',   ru: 'Ожидает',      uk: 'Очікує'       },
  cancelled:  { pl: 'Anulowana',    en: 'Cancelled',  ru: 'Отменена',     uk: 'Скасована'    },
  completed:  { pl: 'Zakończona',   en: 'Completed',  ru: 'Завершена',    uk: 'Завершена'    },
}

function BookingCard({ b, th, lang }: { b: Booking; th: any; lang: string }) {
  const rest    = normalizeRestaurant((b as any).restaurant ?? { id: b.restaurantId })
  const status  = b.status ?? 'pending'
  const color   = STATUS_COLOR[status] ?? STATUS_COLOR.pending
  const label   = STATUS_LABEL[status]?.[lang] ?? status

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
            {rest.name || 'Restauracja'}
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
          <Text style={[styles.metaText, { color: th.textSub }]}>{b.date ?? '—'}</Text>
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
    </TouchableOpacity>
  )
}

export default function BookingsScreen() {
  const { th }       = useTheme()
  const { t, lang }  = useLang()
  const { token, myBookings, setMyBookings } = useAppStore()

  const [loading,    setLoading]    = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    if (!token) return
    setLoading(true)
    try {
      const data = await getMyBookings()
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
              <BookingCard key={b.id} b={b} th={th} lang={lang} />
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
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptySmall:   { alignItems: 'center', paddingTop: 60 },
  emptyTitle:   { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 20 },
  findBtn:      { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  findBtnText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
  signInBtn:    { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  signInBtnText:{ color: '#fff', fontSize: 15, fontWeight: '700' },
})
