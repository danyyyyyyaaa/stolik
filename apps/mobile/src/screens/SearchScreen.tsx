import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '../theme'
import { useLang } from '../i18n'
import { useAppStore } from '../store/useAppStore'
import type { Restaurant } from '../store/useAppStore'
import type { RootStackParamList } from '../navigation/AppNavigator'

export default function SearchScreen() {
  const { th }         = useTheme()
  const { t }          = useLang()
  const nav            = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const restaurants    = useAppStore(s => s.restaurants)
  const [query, setQuery] = useState('')

  const filtered = restaurants.filter(r =>
    query === '' ||
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    (r.district ?? '').toLowerCase().includes(query.toLowerCase()) ||
    (r.cuisine ?? '').toLowerCase().includes(query.toLowerCase())
  )

  const s = styles(th)

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.container}>

        {/* Title */}
        <Text style={[s.title, { color: th.text }]}>{t.search_label}</Text>

        {/* Search input */}
        <View style={[s.searchBar, { backgroundColor: th.bgCard, borderColor: th.border }]}>
          <Feather name="search" size={16} color={th.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.search_placeholder}
            placeholderTextColor={th.textMuted}
            autoFocus={false}
            style={[s.input, { color: th.text }]}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Feather name="x" size={16} color={th.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Results */}
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ gap: 10 }}>
            {filtered.map(r => (
              <SearchCard
                key={r.id}
                r={r}
                th={th}
                onPress={() => nav.navigate('Restaurant', { restaurantId: r.id })}
              />
            ))}
            {filtered.length === 0 && query.length > 0 && (
              <View style={s.empty}>
                <Text style={s.emptyEmoji}>🔍</Text>
                <Text style={[s.emptyText, { color: th.textMuted }]}>
                  {query} — no results
                </Text>
              </View>
            )}
          </View>
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

function SearchCard({
  r, th, onPress,
}: {
  r: Restaurant
  th: ReturnType<typeof useTheme>['th']
  onPress: () => void
}) {
  const color = (r as any).color ?? '#2D6A35'
  const emoji = (r as any).emoji ?? '🍽️'
  const s = styles(th)

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[s.card, { backgroundColor: th.bgCard, borderColor: th.border }]}
    >
      <View style={[s.cardEmoji, { backgroundColor: color + '33' }]}>
        <Text style={{ fontSize: 24 }}>{emoji}</Text>
      </View>
      <View style={s.cardInfo}>
        <Text style={[s.cardName, { color: th.text }]}>{r.name}</Text>
        <Text style={[s.cardMeta, { color: th.textSub }]}>
          {r.district}
          {r.district && r.priceRange ? '  ·  ' : ''}
          {r.priceRange}
        </Text>
      </View>
      <View style={s.ratingBox}>
        <Feather name="star" size={12} color={th.accentText} />
        <Text style={[s.ratingText, { color: th.accentText }]}>
          {(r.rating ?? 4.5).toFixed(1)}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

function styles(th: ReturnType<typeof useTheme>['th']) {
  return StyleSheet.create({
    safe:       { flex: 1, backgroundColor: th.bg },
    container:  { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
    title:      { fontSize: 22, fontWeight: '700', marginBottom: 16 },
    searchBar:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
    input:      { flex: 1, fontSize: 14, padding: 0 },
    card:       { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, borderWidth: 1 },
    cardEmoji:  { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    cardInfo:   { flex: 1 },
    cardName:   { fontSize: 14, fontWeight: '600', marginBottom: 3 },
    cardMeta:   { fontSize: 12 },
    ratingBox:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
    ratingText: { fontSize: 13, fontWeight: '600' },
    empty:      { alignItems: 'center', paddingVertical: 60 },
    emptyEmoji: { fontSize: 36, marginBottom: 12 },
    emptyText:  { fontSize: 15, fontWeight: '500' },
  })
}
