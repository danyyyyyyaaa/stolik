import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native'
import { Image } from 'expo-image'
import * as Haptics from 'expo-haptics'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Heart, Star, MapPin } from 'lucide-react-native'
import { router } from 'expo-router'
import { useTheme, colors, shadows, radii } from '../../src/theme'
import { useLang } from '../../src/i18n'
import { useAppStore } from '../../src/store/useAppStore'
import { getFavorites, toggleFavorite } from '../../src/api/favorites'
import type { Restaurant } from '../../src/store/useAppStore'

// ─── Favorite Card ─────────────────────────────────────────────────────────────
function FavCard({
  item, th, t, onUnfavorite,
}: {
  item: Restaurant
  th: any
  t: any
  onUnfavorite: (id: string) => void
}) {
  const [removing, setRemoving] = useState(false)
  const imageUrl = `https://picsum.photos/seed/dinto-${item.id}/400/200`

  async function handleUnfavorite() {
    setRemoving(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      await toggleFavorite(item.id)
      onUnfavorite(item.id)
    } catch {}
    finally { setRemoving(false) }
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/restaurant/${item.id}`)}
      style={[styles.card, { backgroundColor: th.bgCard, borderColor: th.border }]}
    >
      <Image source={{ uri: imageUrl }} style={styles.cardImage} contentFit="cover" transition={300} />
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={[styles.cardName, { color: th.text }]} numberOfLines={1}>{item.name}</Text>
          <TouchableOpacity onPress={handleUnfavorite} disabled={removing} hitSlop={8}>
            <Heart
              size={18}
              color="#FF6B6B"
              fill="#FF6B6B"
              strokeWidth={1.5}
              style={{ opacity: removing ? 0.4 : 1 }}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.metaRow}>
          <MapPin size={11} color={th.textMuted} strokeWidth={1.75} />
          <Text style={[styles.metaText, { color: th.textMuted }]}>{item.district}</Text>
          {item.rating != null && item.rating > 0 && (
            <>
              <Star size={11} color="#F0A500" fill="#F0A500" strokeWidth={1.75} />
              <Text style={[styles.metaText, { color: th.textMuted }]}>{item.rating.toFixed(1)}</Text>
            </>
          )}
          <Text style={[styles.metaText, { color: th.textMuted }]}>{item.priceRange}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function FavoritesScreen() {
  const { th }    = useTheme()
  const { t }     = useLang()
  const { token, favoriteIds, setFavoriteIds } = useAppStore()

  const [favorites,  setFavorites]  = useState<Restaurant[]>([])
  const [loading,    setLoading]    = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    if (!token) return
    setLoading(true)
    try {
      const data = await getFavorites()
      setFavorites(data)
      setFavoriteIds(data.map(r => r.id))
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [token])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [token])

  function handleUnfavorite(id: string) {
    setFavorites(prev => prev.filter(r => r.id !== id))
    setFavoriteIds(favoriteIds.filter(f => f !== id))
  }

  if (!token) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: th.bg }]} edges={['top']}>
        <Text style={[styles.pageTitle, { color: th.text }]}>{t.favorites_label}</Text>
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🔒</Text>
          <Text style={[styles.emptyTitle, { color: th.text }]}>{t.sign_in_required}</Text>
          <TouchableOpacity
            onPress={() => router.navigate('/(tabs)/profile')}
            style={[styles.cta, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.ctaText}>{t.sign_in}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: th.bg }]} edges={['top']}>
      <FlatList
        data={favorites}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListHeaderComponent={
          <Text style={[styles.pageTitle, { color: th.text }]}>{t.favorites_label}</Text>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <Heart size={52} color={th.textMuted} strokeWidth={1.25} />
              <Text style={[styles.emptyTitle, { color: th.text }]}>{t.favorites_empty}</Text>
              <Text style={[styles.emptySub, { color: th.textMuted }]}>{t.favorites_empty_sub}</Text>
              <TouchableOpacity
                onPress={() => router.navigate('/(tabs)/')}
                style={[styles.cta, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.ctaText}>{t.find_restaurant_btn}</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <FavCard item={item} th={th} t={t} onUnfavorite={handleUnfavorite} />
        )}
        ListFooterComponent={<View style={{ height: 24 }} />}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:       { flex: 1 },
  list:       { paddingHorizontal: 16, paddingBottom: 24 },
  pageTitle:  { fontSize: 28, fontFamily: 'DMSerifDisplay_400Regular', paddingTop: 20, marginBottom: 20, paddingHorizontal: 4 },

  card:       { borderRadius: radii.md, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  cardImage:  { width: '100%', height: 140 },
  cardBody:   { padding: 14 },
  cardRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardName:   { fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold', flex: 1, marginRight: 8 },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText:   { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular' },

  emptyWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans_600SemiBold', textAlign: 'center', marginTop: 8 },
  emptySub:   { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center', opacity: 0.7, lineHeight: 20 },
  cta:        { paddingHorizontal: 32, paddingVertical: 14, borderRadius: radii.md, marginTop: 8 },
  ctaText:    { color: '#fff', fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold' },
})
