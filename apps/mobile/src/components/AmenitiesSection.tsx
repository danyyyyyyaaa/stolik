/**
 * AmenitiesSection
 *
 * Renders amenity icons + parking badge + price range + payment methods
 * for the restaurant detail screen.
 *
 * Export also: `AmenitiesCompact` — 16×16 icon row for listing cards.
 */
import React, { useState } from 'react'
import {
  Modal, Pressable, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native'
import { useTheme } from '../theme'
import { useLang } from '../i18n'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RestaurantAmenities {
  hasParking?:          boolean
  parkingType?:         string | null
  parkingDetails?:      string | null
  hasWifi?:             boolean
  wifiDetails?:         string | null
  hasOutdoorSeating?:   boolean
  outdoorDetails?:      string | null
  hasChildMenu?:        boolean
  hasHighChairs?:       boolean
  hasLiveMusic?:        boolean
  liveMusicDetails?:    string | null
  isSmokingAllowed?:    boolean
  hasAirConditioning?:  boolean
  hasPrivateRooms?:     boolean
  privateRoomDetails?:  string | null
  wheelchairAccessible?:boolean
  petsAllowed?:         boolean
  paymentMethods?:      string[]
  priceRangeNum?:       number | null
  averageBill?:         number | null
  averageBillCurrency?: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

interface AmenityDef {
  key: keyof RestaurantAmenities
  emoji: string
  i18nKey: string
  detailKey?: keyof RestaurantAmenities
}

const AMENITY_DEFS: AmenityDef[] = [
  { key: 'hasWifi',             emoji: '📶', i18nKey: 'amenity_wifi',          detailKey: 'wifiDetails' },
  { key: 'hasOutdoorSeating',   emoji: '🌿', i18nKey: 'amenity_terrace',       detailKey: 'outdoorDetails' },
  { key: 'hasChildMenu',        emoji: '👶', i18nKey: 'amenity_kids_menu' },
  { key: 'hasHighChairs',       emoji: '🪑', i18nKey: 'amenity_highchairs' },
  { key: 'hasLiveMusic',        emoji: '🎵', i18nKey: 'amenity_live_music',    detailKey: 'liveMusicDetails' },
  { key: 'hasAirConditioning',  emoji: '❄️', i18nKey: 'amenity_ac' },
  { key: 'wheelchairAccessible',emoji: '♿', i18nKey: 'amenity_wheelchair' },
  { key: 'petsAllowed',         emoji: '🐾', i18nKey: 'amenity_pets' },
  { key: 'isSmokingAllowed',    emoji: '🚬', i18nKey: 'amenity_smoking' },
  { key: 'hasPrivateRooms',     emoji: '🔒', i18nKey: 'amenity_private_rooms', detailKey: 'privateRoomDetails' },
]

const PAYMENT_EMOJI: Record<string, string> = {
  cash:       '💵',
  card:       '💳',
  apple_pay:  '🍎',
  google_pay: '🔵',
}

const PAYMENT_LABEL: Record<string, string> = {
  cash:       'Cash',
  card:       'Card',
  apple_pay:  'Apple Pay',
  google_pay: 'Google Pay',
}

// ─── PriceRange ───────────────────────────────────────────────────────────────

export function PriceRange({ value, size = 14 }: { value?: number | null; size?: number }) {
  if (!value) return null
  const n = Math.min(Math.max(value, 1), 4)
  return (
    <Text style={{ fontSize: size }}>
      {'💲'.repeat(n)}
      <Text style={{ opacity: 0.25 }}>{'💲'.repeat(4 - n)}</Text>
    </Text>
  )
}

// ─── ParkingBadge ─────────────────────────────────────────────────────────────

export function ParkingBadge({
  parkingType, parkingDetails, th,
}: {
  parkingType?:    string | null
  parkingDetails?: string | null
  th:              any
}) {
  const [showDetail, setShowDetail] = useState(false)
  if (!parkingType) return null

  const isFree = parkingType === 'free'
  const label  = isFree ? '🅿️ Free parking'
                         : parkingType === 'valet' ? '🅿️ Valet'
                         : '🅿️ Paid parking'
  const bg     = isFree ? '#16A34A' : '#6B7280'

  return (
    <>
      <TouchableOpacity
        onPress={() => parkingDetails ? setShowDetail(true) : undefined}
        activeOpacity={parkingDetails ? 0.75 : 1}
        style={[pb.badge, { backgroundColor: bg + '22', borderColor: bg + '44' }]}
      >
        <Text style={[pb.text, { color: bg }]}>{label}</Text>
        {parkingDetails ? <Text style={[pb.chevron, { color: bg }]}>›</Text> : null}
      </TouchableOpacity>

      {showDetail && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowDetail(false)}>
          <Pressable style={pb.backdrop} onPress={() => setShowDetail(false)}>
            <View style={[pb.sheet, { backgroundColor: th.bgCard }]}>
              <Text style={[pb.sheetTitle, { color: th.text }]}>🅿️ Parking</Text>
              <Text style={[pb.sheetDesc, { color: th.textSub }]}>{parkingDetails}</Text>
            </View>
          </Pressable>
        </Modal>
      )}
    </>
  )
}

const pb = StyleSheet.create({
  badge:    { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
              paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
              gap: 4, marginBottom: 8 },
  text:     { fontSize: 12, fontWeight: '600' },
  chevron:  { fontSize: 14, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  sheet:    { width: '100%', borderRadius: 20, padding: 24 },
  sheetTitle:{ fontSize: 17, fontWeight: '700', marginBottom: 8 },
  sheetDesc: { fontSize: 14, lineHeight: 21 },
})

// ─── Amenity tooltip modal ────────────────────────────────────────────────────

function AmenityTooltip({
  emoji, label, detail, th, onClose,
}: {
  emoji: string; label: string; detail?: string | null; th: any; onClose: () => void
}) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={tt.backdrop} onPress={onClose}>
        <View style={[tt.box, { backgroundColor: th.bgCard }]}>
          <Text style={tt.emoji}>{emoji}</Text>
          <Text style={[tt.label, { color: th.text }]}>{label}</Text>
          {detail ? <Text style={[tt.detail, { color: th.textSub }]}>{detail}</Text> : null}
        </View>
      </Pressable>
    </Modal>
  )
}

const tt = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 40 },
  box:      { borderRadius: 18, padding: 24, alignItems: 'center', minWidth: 180 },
  emoji:    { fontSize: 36, marginBottom: 10 },
  label:    { fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  detail:   { fontSize: 13, textAlign: 'center', lineHeight: 19 },
})

// ─── AmenitiesRow ─────────────────────────────────────────────────────────────

export function AmenitiesRow({ amenities, th, t }: { amenities: RestaurantAmenities; th: any; t: any }) {
  const [tooltip, setTooltip] = useState<{ emoji: string; label: string; detail?: string | null } | null>(null)

  const visible = AMENITY_DEFS.filter(def => !!(amenities as any)[def.key])
  if (visible.length === 0) return null

  const shown = visible.slice(0, 5)
  const extra = visible.length - 5

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ar.row}
      >
        {shown.map(def => {
          const label = (t as any)[def.i18nKey] ?? def.i18nKey
          const detail = def.detailKey ? (amenities as any)[def.detailKey] as string | null : null
          return (
            <TouchableOpacity
              key={def.key as string}
              onPress={() => setTooltip({ emoji: def.emoji, label, detail })}
              activeOpacity={0.7}
              style={ar.item}
            >
              <Text style={ar.emoji}>{def.emoji}</Text>
              <Text style={[ar.label, { color: th.textMuted }]} numberOfLines={1}>{label}</Text>
            </TouchableOpacity>
          )
        })}
        {extra > 0 && (
          <View style={ar.item}>
            <Text style={[ar.moreText, { color: th.textMuted }]}>+{extra}</Text>
          </View>
        )}
      </ScrollView>

      {tooltip && (
        <AmenityTooltip
          emoji={tooltip.emoji}
          label={tooltip.label}
          detail={tooltip.detail}
          th={th}
          onClose={() => setTooltip(null)}
        />
      )}
    </>
  )
}

const ar = StyleSheet.create({
  row:      { flexDirection: 'row', gap: 8, paddingHorizontal: 0 },
  item:     { alignItems: 'center', gap: 4, minWidth: 56 },
  emoji:    { fontSize: 22 },
  label:    { fontSize: 10, textAlign: 'center' },
  moreText: { fontSize: 13, fontWeight: '600' },
})

// ─── PaymentMethodsRow ────────────────────────────────────────────────────────

export function PaymentMethodsRow({ methods, th }: { methods?: string[]; th: any }) {
  if (!methods || methods.length === 0) return null
  return (
    <View style={pm.row}>
      {methods.map(m => (
        <View key={m} style={[pm.chip, { backgroundColor: th.bgCard, borderColor: th.border }]}>
          <Text style={pm.emoji}>{PAYMENT_EMOJI[m] ?? '💳'}</Text>
          <Text style={[pm.label, { color: th.textSub }]}>{PAYMENT_LABEL[m] ?? m}</Text>
        </View>
      ))}
    </View>
  )
}

const pm = StyleSheet.create({
  row:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10,
           paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  emoji: { fontSize: 13 },
  label: { fontSize: 12, fontWeight: '500' },
})

// ─── AmenitiesCompact — for listing cards ─────────────────────────────────────

export function AmenitiesCompact({ amenities }: { amenities: RestaurantAmenities }) {
  const bits: string[] = []
  if (amenities.priceRangeNum) bits.push('💲'.repeat(Math.min(amenities.priceRangeNum, 4)))
  if (amenities.hasParking)    bits.push('🅿️')
  if (amenities.hasWifi)       bits.push('📶')
  if (amenities.hasOutdoorSeating) bits.push('🌿')
  if (amenities.petsAllowed)   bits.push('🐾')

  if (bits.length === 0) return null
  return (
    <Text style={ac.text}>{bits.join('  ')}</Text>
  )
}

const ac = StyleSheet.create({
  text: { fontSize: 12, marginTop: 2 },
})

// ─── AmenitiesSection (full, for restaurant detail screen) ────────────────────

interface AmenitiesSectionProps {
  amenities: RestaurantAmenities
}

export default function AmenitiesSection({ amenities }: AmenitiesSectionProps) {
  const { th } = useTheme()
  const { t }  = useLang()

  const hasAny = AMENITY_DEFS.some(d => !!(amenities as any)[d.key])
  const hasPayment = !!(amenities.paymentMethods?.length)
  const hasBill    = !!(amenities.averageBill)
  const hasPrice   = !!(amenities.priceRangeNum)
  const hasParking = !!(amenities.hasParking)

  if (!hasAny && !hasPayment && !hasBill && !hasPrice && !hasParking) return null

  const currencySymbol = amenities.averageBillCurrency === 'EUR' ? '€'
                       : amenities.averageBillCurrency === 'UAH' ? '₴'
                       : 'zł'

  return (
    <View style={[as.card, { backgroundColor: th.bgCard, borderColor: th.border }]}>
      <Text style={[as.title, { color: th.textMuted }]}>{(t as any).amenities_label ?? 'Amenities'}</Text>

      {/* Parking badge */}
      {hasParking && (
        <ParkingBadge
          parkingType={amenities.parkingType}
          parkingDetails={amenities.parkingDetails}
          th={th}
        />
      )}

      {/* Price range + average bill row */}
      {(hasPrice || hasBill) && (
        <View style={as.priceRow}>
          {hasPrice && <PriceRange value={amenities.priceRangeNum} size={16} />}
          {hasBill && (
            <Text style={[as.bill, { color: th.textSub }]}>
              {' · '}avg. {amenities.averageBill}{currencySymbol}/person
            </Text>
          )}
        </View>
      )}

      {/* Amenity icons */}
      {hasAny && <AmenitiesRow amenities={amenities} th={th} t={t} />}

      {/* Payment methods */}
      {hasPayment && (
        <View style={{ marginTop: 12 }}>
          <PaymentMethodsRow methods={amenities.paymentMethods} th={th} />
        </View>
      )}
    </View>
  )
}

const as = StyleSheet.create({
  card:     { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  title:    { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  bill:     { fontSize: 13 },
})
