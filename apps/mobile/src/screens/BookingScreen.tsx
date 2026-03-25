import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack'
import { useTheme } from '../theme'
import { useLang } from '../i18n'
import { useAppStore } from '../store/useAppStore'
import { getSlots } from '../api/restaurants'
import { createBooking } from '../api/bookings'
import type { RootStackParamList } from '../navigation/AppNavigator'

type NavProp    = NativeStackNavigationProp<RootStackParamList, 'Booking'>
type RouteProp2 = RouteProp<RootStackParamList, 'Booking'>

function buildDates(tonight: string, tomorrow: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const iso   = d.toISOString().split('T')[0]
    const label = i === 0 ? tonight : i === 1 ? tomorrow : d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
    return { label, value: iso }
  })
}

export default function BookingScreen() {
  const { th }       = useTheme()
  const { t }        = useLang()
  const nav          = useNavigation<NavProp>()
  const route        = useRoute<RouteProp2>()
  const { restaurantId } = route.params
  const { restaurants, setLastBooking, myBookings, setMyBookings } = useAppStore()

  const r = restaurants.find(x => x.id === restaurantId)

  const [bookingDate,   setBookingDate]   = useState<string | null>(null)
  const [bookingTime,   setBookingTime]   = useState<string | null>(null)
  const [bookingGuests, setBookingGuests] = useState(2)
  const [guestName,     setGuestName]     = useState('')
  const [guestPhone,    setGuestPhone]    = useState('')
  const [slots,         setSlots]         = useState<string[]>([])
  const [loadingSlots,  setLoadingSlots]  = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')

  const dates = buildDates(t.tonight, t.tomorrow)

  useEffect(() => {
    if (!restaurantId || !bookingDate) return
    setLoadingSlots(true)
    setSlots([])
    setBookingTime(null)
    getSlots(restaurantId, bookingDate, bookingGuests)
      .then(s => setSlots(s))
      .catch(() => {})
      .finally(() => setLoadingSlots(false))
  }, [restaurantId, bookingDate, bookingGuests])

  async function handleConfirm() {
    if (!r) return
    const date = bookingDate || dates[0].value
    const time = bookingTime || slots[0]
    if (!time)              { setError(t.select_time); return }
    if (!guestName.trim())  { setError(t.name_placeholder); return }
    if (!guestPhone.trim()) { setError(t.phone_placeholder); return }
    setLoading(true)
    setError('')
    try {
      const result  = await createBooking({ restaurantId: r.id, date, time, guestCount: bookingGuests, guestName: guestName.trim(), guestPhone: guestPhone.trim(), source: 'app' })
      const booking = { ...result.booking, restaurant: r }
      setLastBooking(booking)
      setMyBookings([booking, ...myBookings])
      nav.navigate('Confirmed')
    } catch (err: any) {
      setError(err.message || t.booking_error)
    } finally {
      setLoading(false)
    }
  }

  const s    = styles(th)
  const color = (r as any)?.color ?? '#2D6A35'
  const emoji = (r as any)?.emoji ?? '🍽️'

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Back + title */}
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => nav.goBack()}
            style={[s.backBtn, { backgroundColor: th.bgCard, borderColor: th.border }]}>
            <Feather name="chevron-left" size={20} color={th.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: th.text }]}>{t.book_table}</Text>
        </View>

        {/* Restaurant mini card */}
        {r && (
          <View style={[s.miniCard, { backgroundColor: th.bgCard, borderColor: th.border }]}>
            <View style={[s.miniEmoji, { backgroundColor: color + '33' }]}>
              <Text style={{ fontSize: 22 }}>{emoji}</Text>
            </View>
            <View>
              <Text style={[s.miniName, { color: th.text }]}>{r.name}</Text>
              <Text style={[s.miniMeta, { color: th.textSub }]}>{r.district}  ·  {r.priceRange}</Text>
            </View>
          </View>
        )}

        {/* Date */}
        <View style={s.section}>
          <View style={s.sectionLabel}>
            <Feather name="calendar" size={13} color={th.textMuted} />
            <Text style={[s.sectionLabelText, { color: th.textMuted }]}>{t.select_date.toUpperCase()}</Text>
          </View>
          <View style={s.chipRow}>
            {dates.map(d => {
              const active = bookingDate === d.value
              return (
                <TouchableOpacity key={d.value} onPress={() => setBookingDate(d.value)}
                  style={[s.chip, { backgroundColor: active ? th.accent : th.bgCard, borderColor: active ? 'transparent' : th.border }]}>
                  <Text style={[s.chipText, { color: active ? '#fff' : th.textSub }]}>{d.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Time */}
        <View style={s.section}>
          <View style={s.sectionLabel}>
            <Feather name="clock" size={13} color={th.textMuted} />
            <Text style={[s.sectionLabelText, { color: th.textMuted }]}>{t.select_time.toUpperCase()}</Text>
          </View>
          {loadingSlots ? (
            <Text style={[s.hint, { color: th.textMuted }]}>{t.loading_slots}</Text>
          ) : slots.length === 0 && bookingDate ? (
            <Text style={[s.hint, { color: th.textMuted }]}>{t.no_slots}</Text>
          ) : (
            <View style={s.timeGrid}>
              {slots.map(ti => {
                const active = bookingTime === ti
                return (
                  <TouchableOpacity key={ti} onPress={() => setBookingTime(ti)}
                    style={[s.timeChip, { backgroundColor: active ? th.accent : th.bgCard, borderColor: active ? 'transparent' : th.border }]}>
                    <Text style={[s.chipText, { color: active ? '#fff' : th.textSub }]}>{ti}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </View>

        {/* Guests */}
        <View style={s.section}>
          <View style={s.sectionLabel}>
            <Feather name="users" size={13} color={th.textMuted} />
            <Text style={[s.sectionLabelText, { color: th.textMuted }]}>{t.select_guests.toUpperCase()}</Text>
          </View>
          <View style={[s.guestCard, { backgroundColor: th.bgCard, borderColor: th.border }]}>
            <TouchableOpacity onPress={() => setBookingGuests(g => Math.max(1, g - 1))}
              style={[s.guestBtn, { backgroundColor: th.bgCardAlt, borderColor: th.border }]}>
              <Feather name="minus" size={16} color={th.text} />
            </TouchableOpacity>
            <Text style={[s.guestNum, { color: th.text }]}>
              {bookingGuests}{'  '}
              <Text style={[s.guestLabel, { color: th.textSub }]}>
                {bookingGuests === 1 ? t.guest : t.guests}
              </Text>
            </Text>
            <TouchableOpacity onPress={() => setBookingGuests(g => Math.min(12, g + 1))}
              style={[s.guestBtn, { backgroundColor: th.bgCardAlt, borderColor: th.border }]}>
              <Feather name="plus" size={16} color={th.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact */}
        <View style={s.section}>
          <Text style={[s.sectionLabelText, { color: th.textMuted, marginBottom: 10 }]}>
            {t.contact_section.toUpperCase()}
          </Text>
          <TextInput
            value={guestName}
            onChangeText={setGuestName}
            placeholder={t.name_placeholder}
            placeholderTextColor={th.textMuted}
            style={[s.input, { backgroundColor: th.bgCard, borderColor: th.border, color: th.text, marginBottom: 10 }]}
          />
          <TextInput
            value={guestPhone}
            onChangeText={setGuestPhone}
            placeholder={t.phone_placeholder}
            placeholderTextColor={th.textMuted}
            keyboardType="phone-pad"
            style={[s.input, { backgroundColor: th.bgCard, borderColor: th.border, color: th.text }]}
          />
        </View>

        {error ? (
          <View style={[s.errorBox, { borderColor: 'rgba(224,92,92,0.2)' }]}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={handleConfirm}
          disabled={loading}
          activeOpacity={0.8}
          style={[s.confirmBtn, { backgroundColor: th.accent, opacity: loading ? 0.6 : 1 }]}
        >
          <Text style={s.confirmBtnText}>{loading ? t.loading : t.confirm_booking}</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

function styles(th: ReturnType<typeof useTheme>['th']) {
  return StyleSheet.create({
    safe:            { flex: 1, backgroundColor: th.bg },
    scroll:          { padding: 20 },
    headerRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    backBtn:         { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    headerTitle:     { fontSize: 18, fontWeight: '700' },
    miniCard:        { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 20 },
    miniEmoji:       { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    miniName:        { fontSize: 14, fontWeight: '600', marginBottom: 2 },
    miniMeta:        { fontSize: 12 },
    section:         { marginBottom: 20 },
    sectionLabel:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    sectionLabelText:{ fontSize: 12, fontWeight: '500', letterSpacing: 0.8 },
    chipRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip:            { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
    timeChip:        { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center', minWidth: '22%' },
    timeGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chipText:        { fontSize: 13, fontWeight: '500' },
    hint:            { fontSize: 13, paddingVertical: 10 },
    guestCard:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 16, padding: 14, borderWidth: 1 },
    guestBtn:        { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    guestNum:        { fontSize: 20, fontWeight: '700' },
    guestLabel:      { fontSize: 14, fontWeight: '400' },
    input:           { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 13, fontSize: 14 },
    errorBox:        { backgroundColor: 'rgba(224,92,92,0.1)', borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 14 },
    errorText:       { color: '#E05C5C', fontSize: 13 },
    confirmBtn:      { paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    confirmBtnText:  { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  })
}
