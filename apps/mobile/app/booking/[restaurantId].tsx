import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useTheme } from '../../src/theme'
import { useLang } from '../../src/i18n'
import { useAppStore } from '../../src/store/useAppStore'
import { getSlots } from '../../src/api/restaurants'
import { createBooking } from '../../src/api/bookings'
import { buildDates, normalizeRestaurant, type NormalizedRestaurant } from '../../src/utils/restaurant'
import { MOCK_RESTAURANTS } from '../../src/data/mockRestaurants'
import { notifyBookingConfirmed, scheduleReminder } from '../../src/notifications'

export default function BookingScreen() {
  const { th }     = useTheme()
  const { t }      = useLang()
  const insets     = useSafeAreaInsets()
  const params     = useLocalSearchParams<{
    restaurantId: string
    date?:        string
    time?:        string
    guests?:      string
  }>()
  const { restaurants, setLastBooking, myBookings, setMyBookings } = useAppStore()

  const r  = restaurants.find(x => x.id === params.restaurantId)
          ?? MOCK_RESTAURANTS.find(m => m.id === params.restaurantId)
  const nr: NormalizedRestaurant | null = r ? normalizeRestaurant(r) : null

  const dates = buildDates(t.tonight, t.tomorrow)

  const [date,      setDate]      = useState<string>(params.date || dates[0].value)
  const [time,      setTime]      = useState<string | null>(params.time || null)
  const [guests,    setGuests]    = useState(parseInt(params.guests ?? '2', 10) || 2)
  const [name,      setName]      = useState('')
  const [phone,     setPhone]     = useState('')
  const [slots,     setSlots]     = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    if (!params.restaurantId || !date) return
    setLoadingSlots(true)
    setSlots([])
    setTime(null)
    const mockTimes = MOCK_RESTAURANTS.find(m => m.id === params.restaurantId)?.availableTimes ?? []
    getSlots(params.restaurantId, date, guests)
      .then(s => setSlots(s.length > 0 ? s : mockTimes))
      .catch(() => setSlots(mockTimes))
      .finally(() => setLoadingSlots(false))
  }, [params.restaurantId, date, guests])

  async function handleConfirm() {
    if (!params.restaurantId) return
    const selectedTime = time || slots[0]
    if (!selectedTime)   { setError(t.select_time as string); return }
    if (!name.trim())    { setError(t.name_placeholder as string); return }
    if (!phone.trim())   { setError(t.phone_placeholder as string); return }

    setLoading(true)
    setError('')
    try {
      const result  = await createBooking({
        restaurantId: params.restaurantId,
        date,
        time:         selectedTime,
        guestCount:   guests,
        guestName:    name.trim(),
        guestPhone:   phone.trim(),
        source:       'app',
      })
      const booking = { ...result.booking, restaurant: r }
      setLastBooking(booking)
      setMyBookings([booking, ...myBookings])

      // Fire local notifications (non-blocking)
      const restName = nr?.name ?? r?.name ?? 'restaurant'
      notifyBookingConfirmed({ restaurantName: restName, date, time: selectedTime })
      scheduleReminder({ bookingId: result.booking.id, restaurantName: restName, date, time: selectedTime })

      router.replace('/confirmed')
    } catch (e: any) {
      setError(e.message || t.booking_error as string)
    } finally {
      setLoading(false)
    }
  }

  const s = styles(th)

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: th.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}
            style={[s.backBtn, { backgroundColor: th.bgCard, borderColor: th.border }]}>
            <Feather name="chevron-left" size={20} color={th.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: th.text }]}>{t.book_table as string}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* Restaurant mini card */}
          {nr && (
            <View style={[s.miniCard, { backgroundColor: th.bgCard, borderColor: th.border }]}>
              <View style={[s.miniEmoji, { backgroundColor: nr.color + '28' }]}>
                <Text style={{ fontSize: 24 }}>{nr.emoji}</Text>
              </View>
              <View>
                <Text style={[s.miniName, { color: th.text }]}>{nr.name}</Text>
                <Text style={[s.miniMeta, { color: th.textSub }]}>
                  {[nr.district, nr.price].filter(Boolean).join('  ·  ')}
                </Text>
              </View>
            </View>
          )}

          {/* Date */}
          <Section icon="calendar" label={t.select_date as string} th={th}>
            <View style={s.chipGrid}>
              {dates.map(d => {
                const active = date === d.value
                return (
                  <TouchableOpacity key={d.value} onPress={() => setDate(d.value)} activeOpacity={0.8}
                    style={[s.chip, { backgroundColor: active ? th.accent : th.bgCard, borderColor: active ? 'transparent' : th.border, flexBasis: '47%' }]}>
                    <Text style={[s.chipText, { color: active ? '#fff' : th.textSub }]}>{d.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </Section>

          {/* Time */}
          <Section icon="clock" label={t.select_time as string} th={th}>
            {loadingSlots
              ? <ActivityIndicator color={th.accent} style={{ marginVertical: 10 }} />
              : slots.length === 0 && date
              ? <Text style={[s.hint, { color: th.textMuted }]}>{t.no_slots as string}</Text>
              : (
                <View style={s.timeGrid}>
                  {slots.map(ti => {
                    const active = time === ti
                    return (
                      <TouchableOpacity key={ti} onPress={() => setTime(ti)} activeOpacity={0.8}
                        style={[s.chip, s.timeChip, { backgroundColor: active ? th.accent : th.bgCard, borderColor: active ? 'transparent' : th.border }]}>
                        <Text style={[s.chipText, { color: active ? '#fff' : th.textSub }]}>{ti}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )
            }
          </Section>

          {/* Guests */}
          <Section icon="users" label={t.select_guests as string} th={th}>
            <View style={[s.guestCard, { backgroundColor: th.bgCard, borderColor: th.border }]}>
              <TouchableOpacity onPress={() => setGuests(g => Math.max(1, g - 1))}
                style={[s.guestBtn, { backgroundColor: th.bgCardAlt, borderColor: th.border }]}>
                <Feather name="minus" size={18} color={th.text} />
              </TouchableOpacity>
              <Text style={[s.guestNum, { color: th.text }]}>
                {guests}{' '}
                <Text style={[s.guestLabel, { color: th.textSub }]}>
                  {guests === 1 ? t.guest as string : t.guests as string}
                </Text>
              </Text>
              <TouchableOpacity onPress={() => setGuests(g => Math.min(12, g + 1))}
                style={[s.guestBtn, { backgroundColor: th.bgCardAlt, borderColor: th.border }]}>
                <Feather name="plus" size={18} color={th.text} />
              </TouchableOpacity>
            </View>
          </Section>

          {/* Contact */}
          <Section icon="user" label={t.contact_section as string} th={th}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t.name_placeholder as string}
              placeholderTextColor={th.textMuted}
              style={[s.input, { backgroundColor: th.bgCard, borderColor: th.inputBorder, color: th.text }]}
            />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder={t.phone_placeholder as string}
              placeholderTextColor={th.textMuted}
              keyboardType="phone-pad"
              style={[s.input, { backgroundColor: th.bgCard, borderColor: th.inputBorder, color: th.text, marginBottom: 0 }]}
            />
          </Section>

          {error ? (
            <View style={[s.errorBox, { backgroundColor: th.error + '18', borderColor: th.error + '40' }]}>
              <Feather name="alert-circle" size={14} color={th.error} />
              <Text style={[s.errorText, { color: th.error }]}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={handleConfirm}
            disabled={loading}
            activeOpacity={0.85}
            style={[s.confirmBtn, { backgroundColor: th.accent, opacity: loading ? 0.7 : 1 }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.confirmBtnText}>{t.confirm_booking as string}</Text>
            }
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

function Section({ icon, label, children, th }: {
  icon: React.ComponentProps<typeof Feather>['name']
  label: string
  children: React.ReactNode
  th: any
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Feather name={icon} size={14} color={th.textMuted} />
        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: th.textMuted }}>
          {label.toUpperCase()}
        </Text>
      </View>
      {children}
    </View>
  )
}

function styles(th: any) {
  return StyleSheet.create({
    root:          { flex: 1 },
    header:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
    backBtn:       { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    headerTitle:   { fontSize: 18, fontWeight: '700' },
    scroll:        { paddingHorizontal: 16, paddingTop: 16 },
    miniCard:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 24 },
    miniEmoji:     { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    miniName:      { fontSize: 15, fontWeight: '600', marginBottom: 3 },
    miniMeta:      { fontSize: 13 },
    chipGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    timeGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip:          { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
    timeChip:      { flexBasis: '23%', flexGrow: 0 },
    chipText:      { fontSize: 13, fontWeight: '500' },
    hint:          { fontSize: 13, paddingVertical: 8 },
    guestCard:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 14, padding: 16, borderWidth: 1 },
    guestBtn:      { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    guestNum:      { fontSize: 22, fontWeight: '700' },
    guestLabel:    { fontSize: 15, fontWeight: '400' },
    input:         { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 12 },
    errorBox:      { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 16 },
    errorText:     { fontSize: 13, flex: 1 },
    confirmBtn:    { paddingVertical: 17, borderRadius: 14, alignItems: 'center' },
    confirmBtnText:{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  })
}
