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
import type { RootStackParamList } from '../navigation/AppNavigator'

type NavProp   = NativeStackNavigationProp<RootStackParamList, 'Restaurant'>
type RouteProp2 = RouteProp<RootStackParamList, 'Restaurant'>

function buildDates(tonight: string, tomorrow: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const iso   = d.toISOString().split('T')[0]
    const label = i === 0 ? tonight : i === 1 ? tomorrow : d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
    return { label, value: iso }
  })
}

const TABS = ['about', 'menu', 'reviews'] as const

export default function RestaurantScreen() {
  const { th }       = useTheme()
  const { t }        = useLang()
  const nav          = useNavigation<NavProp>()
  const route        = useRoute<RouteProp2>()
  const { restaurantId } = route.params
  const restaurants  = useAppStore(s => s.restaurants)

  const r = restaurants.find(x => x.id === restaurantId)

  const [activeTab,     setActiveTab]     = useState<typeof TABS[number]>('about')
  const [bookingDate,   setBookingDate]   = useState<string | null>(null)
  const [bookingTime,   setBookingTime]   = useState<string | null>(null)
  const [bookingGuests, setBookingGuests] = useState(2)
  const [guestName,     setGuestName]     = useState('')
  const [guestPhone,    setGuestPhone]    = useState('')
  const [slots,         setSlots]         = useState<string[]>([])
  const [loadingSlots,  setLoadingSlots]  = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError,  setBookingError]  = useState('')

  const { setLastBooking, setMyBookings, myBookings } = useAppStore()
  const { createBooking } = require('../api/bookings')

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

  async function confirmBooking() {
    if (!r) return
    const date = bookingDate || dates[0].value
    const time = bookingTime || slots[0]
    if (!time)             { setBookingError(t.select_time); return }
    if (!guestName.trim()) { setBookingError(t.name_placeholder); return }
    if (!guestPhone.trim()){ setBookingError(t.phone_placeholder); return }
    setBookingLoading(true)
    setBookingError('')
    try {
      const result  = await createBooking({ restaurantId: r.id, date, time, guestCount: bookingGuests, guestName: guestName.trim(), guestPhone: guestPhone.trim(), source: 'app' })
      const booking = { ...result.booking, restaurant: r }
      setLastBooking(booking)
      setMyBookings([booking, ...myBookings])
      nav.navigate('Confirmed')
    } catch (err: any) {
      setBookingError(err.message || t.booking_error)
    } finally {
      setBookingLoading(false)
    }
  }

  if (!r) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: th.bg }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: th.textMuted }}>Restaurant not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  const color = (r as any).color ?? '#2D6A35'
  const emoji = (r as any).emoji ?? '🍽️'
  const open  = (r as any).openUntil ?? (r as any).open ?? '22:00'
  const s     = styles(th)

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={[s.hero, { backgroundColor: color + '33' }]}>
          <Text style={s.heroEmoji}>{emoji}</Text>
          <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
            <Feather name="chevron-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={[s.heroGradient, { backgroundColor: th.bg + 'ee' }]}>
            <Text style={[s.heroName, { color: th.text }]}>{r.name}</Text>
            <View style={s.heroMeta}>
              <Feather name="star" size={12} color={th.accentText} />
              <Text style={[s.heroMetaText, { color: th.accentText, fontWeight: '600' }]}>
                {(r.rating ?? 4.5).toFixed(1)}
              </Text>
              <Text style={{ color: th.textSub }}>  ·  {r.district}  ·  {r.priceRange}</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={[s.tabsRow, { borderBottomColor: th.border }]}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[s.tab, activeTab === tab && { borderBottomColor: th.accent, borderBottomWidth: 2 }]}
            >
              <Text style={[s.tabText, { color: activeTab === tab ? th.accent : th.textSub, fontWeight: activeTab === tab ? '600' : '400' }]}>
                {t[tab]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.content}>
          {activeTab === 'about' && (
            <View>
              {!!(r as any).desc && (
                <Text style={[s.desc, { color: th.textSub }]}>{(r as any).desc}</Text>
              )}
              <View style={[s.infoCard, { backgroundColor: th.bgCard, borderColor: th.border }]}>
                <Text style={[s.infoLabel, { color: th.textMuted }]}>INFO</Text>
                <View style={[s.infoRow, { borderBottomColor: th.border }]}>
                  <Text style={[s.infoKey, { color: th.textSub }]}>{t.open_until}</Text>
                  <Text style={[s.infoVal, { color: th.text }]}>{open}</Text>
                </View>
                <View style={s.infoRow}>
                  <Text style={[s.infoKey, { color: th.textSub }]}>{t.district}</Text>
                  <Text style={[s.infoVal, { color: th.text }]}>{r.district}</Text>
                </View>
              </View>
            </View>
          )}
          {activeTab === 'menu' && (
            <View style={s.soon}><Text style={s.soonEmoji}>🍽️</Text><Text style={[s.soonText, { color: th.textSub }]}>{t.menu_soon}</Text></View>
          )}
          {activeTab === 'reviews' && (
            <View style={s.soon}><Text style={s.soonEmoji}>⭐</Text><Text style={[s.soonText, { color: th.textSub }]}>{t.reviews_soon}</Text></View>
          )}
        </View>

        {/* Quick booking panel */}
        <View style={s.bookingPanelWrap}>
          <View style={[s.bookingPanel, { backgroundColor: th.bgCard, borderColor: th.border }]}>
            <Text style={[s.bookingTitle, { color: th.text }]}>{t.book_table}</Text>

            {/* Dates */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10 }}>
              {dates.slice(0, 4).map(d => {
                const active = bookingDate === d.value
                return (
                  <TouchableOpacity key={d.value} onPress={() => setBookingDate(d.value)}
                    style={[s.datePill, { backgroundColor: active ? th.accent : th.bgCardAlt, borderColor: active ? 'transparent' : th.border }]}>
                    <Text style={[s.datePillText, { color: active ? '#fff' : th.textSub }]}>{d.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            {/* Time slots */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10, minHeight: 38 }}>
              {loadingSlots
                ? <Text style={[s.slotsHint, { color: th.textMuted }]}>{t.loading_slots}</Text>
                : slots.length === 0 && bookingDate
                ? <Text style={[s.slotsHint, { color: th.textMuted }]}>{t.no_slots}</Text>
                : slots.slice(0, 6).map(ti => {
                    const active = bookingTime === ti
                    return (
                      <TouchableOpacity key={ti} onPress={() => setBookingTime(ti)}
                        style={[s.datePill, { backgroundColor: active ? th.accent : th.bgCardAlt, borderColor: active ? 'transparent' : th.border }]}>
                        <Text style={[s.datePillText, { color: active ? '#fff' : th.textSub }]}>{ti}</Text>
                      </TouchableOpacity>
                    )
                  })
              }
            </ScrollView>

            {/* Guests */}
            <View style={s.guestsRow}>
              <Text style={[s.guestsLabel, { color: th.textSub }]}>{t.select_guests}</Text>
              <View style={s.guestControls}>
                <TouchableOpacity onPress={() => setBookingGuests(g => Math.max(1, g - 1))}
                  style={[s.guestBtn, { backgroundColor: th.bgCardAlt, borderColor: th.border }]}>
                  <Feather name="minus" size={14} color={th.text} />
                </TouchableOpacity>
                <Text style={[s.guestCount, { color: th.text }]}>{bookingGuests}</Text>
                <TouchableOpacity onPress={() => setBookingGuests(g => Math.min(12, g + 1))}
                  style={[s.guestBtn, { backgroundColor: th.bgCardAlt, borderColor: th.border }]}>
                  <Feather name="plus" size={14} color={th.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Contact */}
            <TextInput value={guestName} onChangeText={setGuestName} placeholder={t.name_placeholder}
              placeholderTextColor={th.textMuted}
              style={[s.input, { backgroundColor: th.bgCardAlt, borderColor: th.border, color: th.text, marginBottom: 8 }]} />
            <TextInput value={guestPhone} onChangeText={setGuestPhone} placeholder={t.phone_placeholder}
              placeholderTextColor={th.textMuted} keyboardType="phone-pad"
              style={[s.input, { backgroundColor: th.bgCardAlt, borderColor: th.border, color: th.text, marginBottom: 10 }]} />

            {bookingError ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{bookingError}</Text>
              </View>
            ) : null}

            <TouchableOpacity onPress={confirmBooking} disabled={bookingLoading} activeOpacity={0.8}
              style={[s.confirmBtn, { backgroundColor: th.accent, opacity: bookingLoading ? 0.6 : 1 }]}>
              <Text style={s.confirmBtnText}>{bookingLoading ? t.loading : t.confirm_booking}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

function styles(th: ReturnType<typeof useTheme>['th']) {
  return StyleSheet.create({
    safe:           { flex: 1, backgroundColor: th.bg },
    hero:           { height: 220, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    heroEmoji:      { fontSize: 80 },
    backBtn:        { position: 'absolute', top: 20, left: 20, width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
    heroGradient:   { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingTop: 40 },
    heroName:       { fontSize: 22, fontWeight: '700', marginBottom: 4 },
    heroMeta:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
    heroMetaText:   { fontSize: 13 },
    tabsRow:        { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, marginBottom: 16 },
    tab:            { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabText:        { fontSize: 13, textTransform: 'capitalize' },
    content:        { paddingHorizontal: 20 },
    desc:           { fontSize: 14, lineHeight: 23, marginBottom: 20 },
    infoCard:       { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 16 },
    infoLabel:      { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '500', marginBottom: 8 },
    infoRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
    infoKey:        { fontSize: 13 },
    infoVal:        { fontSize: 13, fontWeight: '500' },
    soon:           { alignItems: 'center', paddingVertical: 40 },
    soonEmoji:      { fontSize: 32, marginBottom: 8 },
    soonText:       { fontSize: 14 },
    bookingPanelWrap: { padding: 20 },
    bookingPanel:   { borderRadius: 20, padding: 16, borderWidth: 1 },
    bookingTitle:   { fontSize: 13, fontWeight: '600', marginBottom: 12 },
    datePill:       { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
    datePillText:   { fontSize: 12, fontWeight: '500' },
    slotsHint:      { fontSize: 12, alignSelf: 'center' },
    guestsRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    guestsLabel:    { fontSize: 13 },
    guestControls:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
    guestBtn:       { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    guestCount:     { fontSize: 15, fontWeight: '600', minWidth: 20, textAlign: 'center' },
    input:          { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 },
    errorBox:       { backgroundColor: 'rgba(224,92,92,0.1)', borderRadius: 8, padding: 8, marginBottom: 8 },
    errorText:      { color: '#E05C5C', fontSize: 12 },
    confirmBtn:     { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
    confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  })
}
