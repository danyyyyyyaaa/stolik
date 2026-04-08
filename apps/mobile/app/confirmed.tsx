import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Share } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '../src/theme'
import { useLang } from '../src/i18n'
import { useAppStore, type Booking } from '../src/store/useAppStore'
import { normalizeRestaurant } from '../src/utils/restaurant'

const { width } = Dimensions.get('window')
const NUM_DOTS  = 12
const COLORS    = ['#238636', '#3FB950', '#58A6FF', '#F0A500', '#F78166', '#D2A8FF', '#79C0FF', '#FF9A3C']

function ConfettiDot({ index, accent }: { index: number; accent: string }) {
  const pos   = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
  const scale = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current

  const angle    = (index / NUM_DOTS) * Math.PI * 2
  const distance = 70 + (index % 4) * 22
  const color    = COLORS[index % COLORS.length]
  const size     = 8 + (index % 3) * 4

  useEffect(() => {
    const delay = index * 20
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 80,  useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
        ]),
        Animated.spring(pos, {
          toValue: { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance },
          tension:  60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue:  1,
          tension:  100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start()
  }, [])

  return (
    <Animated.View
      style={{
        position:  'absolute',
        width:     size,
        height:    size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [
          { translateX: pos.x },
          { translateY: pos.y },
          { scale },
        ],
        opacity,
      }}
    />
  )
}

function CheckCircle({ accent }: { accent: string }) {
  const scale   = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(scale, {
        toValue:  1,
        tension:  180,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  return (
    <Animated.View style={[styles.checkCircle, { borderColor: accent, opacity, transform: [{ scale }] }]}>
      <Text style={{ fontSize: 40 }}>✓</Text>
    </Animated.View>
  )
}

export default function ConfirmedScreen() {
  const { th }       = useTheme()
  const { t }        = useLang()
  const lastBooking  = useAppStore(s => s.lastBooking)

  const b = lastBooking
  const rest = b?.restaurant ? normalizeRestaurant((b as any).restaurant) : null

  function fmtDate(s: string): string {
    if (!s) return '—'
    try { return new Date(s).toISOString().slice(0, 10) } catch { return s }
  }

  const infoRows = b ? [
    { label: t.date as string,      value: fmtDate(b.date) },
    { label: t.time as string,      value: b.time    ?? '—' },
    { label: t.table_for as string, value: `${b.guestCount} ${b.guestCount === 1 ? t.guest : t.guests}` },
    { label: t.booking_id as string,value: b.bookingRef ?? b.id },
  ] : []

  async function handleShare() {
    if (!b) return
    const restName = rest?.name ?? 'the restaurant'
    const shortCode = (b as any).shortCode
    const link = shortCode ? `https://stolik.pl/b/${shortCode}` : ''
    await Share.share({
      message: `${t.share_booking as string}: ${restName}, ${fmtDate(b.date)} at ${b.time ?? ''}${link ? `\n${link}` : ''}`,
    })
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: th.bg }]} edges={['top', 'bottom']}>
      <View style={styles.container}>

        {/* Confetti + check circle */}
        <View style={styles.animationArea}>
          {Array.from({ length: NUM_DOTS }, (_, i) => (
            <ConfettiDot key={i} index={i} accent={th.accent} />
          ))}
          <CheckCircle accent={th.accent} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: th.text }]}>{t.booking_confirmed as string}</Text>
        <Text style={[styles.subtitle, { color: th.textSub }]}>{t.booking_sub as string}</Text>

        {/* Booking summary card */}
        {b && rest && (
          <View style={[styles.card, { backgroundColor: th.bgCard, borderColor: th.border }]}>
            {/* Restaurant header */}
            <View style={[styles.cardRestaurant, { borderBottomColor: th.border }]}>
              <View style={[styles.cardEmoji, { backgroundColor: (rest.color ?? '#238636') + '28' }]}>
                <Text style={{ fontSize: 26 }}>{rest.emoji}</Text>
              </View>
              <View>
                <Text style={[styles.cardRestName, { color: th.text }]}>{rest.name}</Text>
                <Text style={[styles.cardRestDistrict, { color: th.textSub }]}>{rest.district}</Text>
              </View>
            </View>

            {/* Details */}
            {infoRows.map(({ label, value }) => (
              <View key={label} style={[styles.infoRow, { borderBottomColor: th.border }]}>
                <Text style={[styles.infoKey, { color: th.textSub }]}>{label}</Text>
                <Text style={[styles.infoVal, { color: th.text }]}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => router.navigate('/(tabs)/bookings')}
            activeOpacity={0.85}
            style={[styles.primaryBtn, { backgroundColor: th.accent }]}
          >
            <Text style={styles.primaryBtnText}>{t.view_booking as string}</Text>
          </TouchableOpacity>
          {b && (
            <TouchableOpacity
              onPress={handleShare}
              activeOpacity={0.85}
              style={[styles.secondaryBtn, { backgroundColor: th.bgCard, borderColor: th.border }]}
            >
              <Text style={[styles.secondaryBtnText, { color: th.textSub }]}>{t.share_booking as string}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => router.navigate('/(tabs)/')}
            activeOpacity={0.85}
            style={[styles.secondaryBtn, { backgroundColor: th.bgCard, borderColor: th.border }]}
          >
            <Text style={[styles.secondaryBtnText, { color: th.textSub }]}>{t.back_home as string}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:              { flex: 1 },
  container:         { flex: 1, paddingHorizontal: 24, paddingTop: 32, alignItems: 'center' },
  animationArea:     { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  checkCircle:       { width: 90, height: 90, borderRadius: 45, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  title:             { fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  subtitle:          { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 28, paddingHorizontal: 16 },
  card:              { width: '100%', borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 28 },
  cardRestaurant:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1 },
  cardEmoji:         { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardRestName:      { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardRestDistrict:  { fontSize: 13 },
  infoRow:           { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1 },
  infoKey:           { fontSize: 14 },
  infoVal:           { fontSize: 14, fontWeight: '600' },
  actions:           { width: '100%', gap: 10 },
  primaryBtn:        { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  primaryBtnText:    { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn:      { paddingVertical: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  secondaryBtnText:  { fontSize: 15, fontWeight: '500' },
})
