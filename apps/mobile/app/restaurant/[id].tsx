import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  Modal, Pressable, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useTheme } from '../../src/theme'
import { useLang } from '../../src/i18n'
import { useAppStore, type PendingBooking } from '../../src/store/useAppStore'
import { getSlots, getRestaurant } from '../../src/api/restaurants'
import { buildDates, normalizeRestaurant, type NormalizedRestaurant } from '../../src/utils/restaurant'
import { MOCK_RESTAURANTS } from '../../src/data/mockRestaurants'
import { Stars } from '../../src/components/Stars'

const TABS = ['about', 'menu', 'reviews'] as const
type TabKey = typeof TABS[number]

// ─── Cuisine name map ─────────────────────────────────────────────────────────

function getCuisineName(cuisine: string, t: any): string {
  const map: Record<string, string> = {
    polish:   t.polish,
    italiana: t.italian,
    japanese: t.japanese,
    french:   t.french,
  }
  return map[cuisine] ?? cuisine
}

// ─── Mock menu data ───────────────────────────────────────────────────────────

const MENUS: Record<string, { category: string; items: { name: string; desc: string; price: string }[] }[]> = {
  polish: [
    { category: 'Przystawki', items: [
      { name: 'Żurek staropolski',      desc: 'Z jajkiem i kiełbasą, w chlebowym garnku', price: '18 zł' },
      { name: 'Śledź w oleju',          desc: 'Z cebulą i kwaszonym ogórkiem',             price: '14 zł' },
      { name: 'Tatar wołowy',           desc: 'Z kaparami, korniszonami i żółtkiem',        price: '28 zł' },
    ]},
    { category: 'Dania Główne', items: [
      { name: 'Bigos myśliwski',         desc: 'Kapusta kiszona z mięsem i grzybami',       price: '36 zł' },
      { name: 'Pierogi ruskie',          desc: 'Z twarogiem i ziemniakami, smażone',         price: '29 zł' },
      { name: 'Kotlet schabowy',         desc: 'Z ziemniakami i surówką',                   price: '42 zł' },
      { name: 'Kaczka z jabłkami',       desc: 'Z kluskami śląskimi i modrą kapustą',       price: '58 zł' },
    ]},
    { category: 'Desery', items: [
      { name: 'Szarlotka domowa',        desc: 'Z lodami waniliowymi i bitą śmietaną',      price: '18 zł' },
      { name: 'Sernik warszawski',       desc: 'Na kruchym spodzie, z sosem malinowym',     price: '16 zł' },
    ]},
  ],
  italiana: [
    { category: 'Antipasti', items: [
      { name: 'Bruschetta al pomodoro',  desc: 'Pomidory, bazylia, oliwa z oliwek',         price: '22 zł' },
      { name: 'Carpaccio di manzo',      desc: 'Wołowina, rukola, parmezan, kapary',         price: '38 zł' },
    ]},
    { category: 'Pasta & Risotto', items: [
      { name: 'Tagliatelle al Ragù',     desc: 'Klasyczny sos bolognese, parmezan',          price: '46 zł' },
      { name: 'Cacio e Pepe',            desc: 'Spaghetti, pecorino, świeży pieprz',         price: '42 zł' },
      { name: 'Risotto ai funghi',       desc: 'Grzyby leśne, masło, parmezan',              price: '48 zł' },
    ]},
    { category: 'Secondi', items: [
      { name: 'Branzino al forno',       desc: 'Pieczona ryba z warzywami i cytryną',        price: '72 zł' },
      { name: 'Bistecca alla fiorentina',desc: 'Stek T-bone, 300g, z rozmarynem',            price: '95 zł' },
    ]},
    { category: 'Dolci', items: [
      { name: 'Tiramisù della nonna',    desc: 'Klasyczny, z espresso i mascarpone',         price: '24 zł' },
      { name: 'Panna cotta',             desc: 'Z sosem z owoców leśnych',                   price: '20 zł' },
    ]},
  ],
  japanese: [
    { category: 'Przystawki', items: [
      { name: 'Edamame',                 desc: 'Zielone soje z solą morską',                 price: '16 zł' },
      { name: 'Gyoza (6 szt.)',          desc: 'Smażone pierożki wieprzowe z sosem',         price: '26 zł' },
      { name: 'Karaage',                 desc: 'Chrupiący kurczak po japońsku z mayo',       price: '32 zł' },
    ]},
    { category: 'Sushi & Sashimi', items: [
      { name: 'Nigiri Set (8 szt.)',     desc: 'Łosoś, tuńczyk, krewetka, ośmiornica',      price: '64 zł' },
      { name: 'Salmon Maki (8 szt.)',    desc: 'Łosoś, awokado, ogórek',                    price: '36 zł' },
      { name: 'Spicy Tuna Roll',         desc: 'Tuńczyk, sriracha mayo, szczypior',          price: '44 zł' },
    ]},
    { category: 'Ramen', items: [
      { name: 'Tonkotsu Ramen',          desc: 'Bogaty bulion wieprzowy, jajko, nori',      price: '46 zł' },
      { name: 'Miso Ramen',              desc: 'Bulion miso, tofu, grzyby shiitake',         price: '42 zł' },
    ]},
  ],
  french: [
    { category: 'Entrées', items: [
      { name: 'Soupe à l\'oignon',       desc: 'Cebulowa z grzanką i serem gruyère',         price: '26 zł' },
      { name: 'Escargots de Bourgogne',  desc: 'Ślimaki w maśle czosnkowym (6 szt.)',        price: '48 zł' },
      { name: 'Foie gras',               desc: 'Z brioche i dżemem figowym',                 price: '68 zł' },
    ]},
    { category: 'Plats', items: [
      { name: 'Coq au Vin',              desc: 'Kurczak duszony w winie burgundzkim',        price: '72 zł' },
      { name: 'Steak Frites',            desc: 'Antrykot 200g, frytki i sos béarnaise',     price: '78 zł' },
      { name: 'Canard Confit',           desc: 'Kaczka konfitowana z soczewicą',             price: '82 zł' },
    ]},
    { category: 'Desserts', items: [
      { name: 'Crème Brûlée',            desc: 'Klasyczny, waniliowy, z karmelową skórką',  price: '26 zł' },
      { name: 'Tarte Tatin',             desc: 'Ciepła tarta jabłkowa z lodami',            price: '24 zł' },
    ]},
  ],
}

// ─── API menu types ───────────────────────────────────────────────────────────

const API = process.env.EXPO_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

type ApiMenuItem = {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  available: boolean
}

type ApiMenuCategory = {
  id: string
  name: string
  items: ApiMenuItem[]
}

// ─── Mock reviews ─────────────────────────────────────────────────────────────

const REVIEWS = [
  { id: '1', name: 'Anna K.',      stars: 5, date: '12 mar 2025', text: 'Rewelacyjne miejsce! Jedzenie pyszne, obsługa bardzo miła i szybka. Wrócimy na pewno.' },
  { id: '2', name: 'Marcin W.',    stars: 5, date: '28 lut 2025', text: 'Jedna z lepszych restauracji w Warszawie. Klimat, jakość, ceny — wszystko na najwyższym poziomie.' },
  { id: '3', name: 'Karolina P.',  stars: 4, date: '15 lut 2025', text: 'Bardzo dobre jedzenie, stolik rezerwowałam przez aplikację i wszystko poszło sprawnie. Jedynie czekaliśmy chwilę za długo na zamówienie.' },
  { id: '4', name: 'Tomasz N.',    stars: 4, date: '3 mar 2025',  text: 'Byłem już kilka razy i nigdy się nie zawiodłem. Klimatyczne miejsce, polecam szczególnie na randkę.' },
]

// ─── Login-required modal ──────────────────────────────────────────────────────

function LoginRequiredModal({ visible, onClose, onGoToLogin, th, t }: {
  visible:     boolean
  onClose:     () => void
  onGoToLogin: () => void
  th: any
  t:  any
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={lrm.backdrop} onPress={onClose}>
        <Pressable style={[lrm.sheet, { backgroundColor: th.bgCard }]} onPress={() => {}}>
          <Text style={lrm.icon}>🔒</Text>
          <Text style={[lrm.title, { color: th.text }]}>{t.login_required_title}</Text>
          <Text style={[lrm.sub, { color: th.textSub }]}>{t.login_required_sub}</Text>
          <TouchableOpacity
            onPress={() => { onClose(); onGoToLogin() }}
            activeOpacity={0.85}
            style={[lrm.btn, { backgroundColor: th.accent }]}
          >
            <Text style={lrm.btnText}>{t.sign_in_btn}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={lrm.cancelBtn}>
            <Text style={[lrm.cancelText, { color: th.textSub }]}>{t.cancel}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const lrm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  sheet:    { width: '100%', borderRadius: 24, padding: 28, alignItems: 'center' },
  icon:     { fontSize: 44, marginBottom: 16 },
  title:    { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  sub:      { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  btn:      { width: '100%', paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
  btnText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn:{ paddingVertical: 8 },
  cancelText:{ fontSize: 14 },
})

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RestaurantScreen() {
  const { th }      = useTheme()
  const { t }       = useLang()
  const insets      = useSafeAreaInsets()
  const { id }      = useLocalSearchParams<{ id: string }>()
  const restaurants        = useAppStore(s => s.restaurants)
  const token              = useAppStore(s => s.token)
  const setPendingBooking  = useAppStore(s => s.setPendingBooking)

  // Try store first, fall back to mock, then fetch from API
  const storeR = restaurants.find(x => x.id === id)
  const mockR  = MOCK_RESTAURANTS.find(m => m.id === id)
  const [fetchedR, setFetchedR] = useState<NormalizedRestaurant | null>(null)
  const [fetching,  setFetching] = useState(false)

  useEffect(() => {
    if (!storeR && !mockR && id) {
      setFetching(true)
      getRestaurant(id)
        .then(data => setFetchedR(normalizeRestaurant(data)))
        .catch(() => {})
        .finally(() => setFetching(false))
    }
  }, [id])

  const r  = storeR ?? mockR ?? fetchedR
  const nr: NormalizedRestaurant | null = r ? normalizeRestaurant(r) : null

  const imageUrl = mockR?.image ?? `https://picsum.photos/seed/stolik-${id}/800/400`

  const [activeTab,    setActiveTab]    = useState<TabKey>('about')
  const [apiMenu,      setApiMenu]      = useState<ApiMenuCategory[] | null>(null)
  const [menuLoading,  setMenuLoading]  = useState(false)
  const [date,         setDate]         = useState<string | null>(null)
  const [time,         setTime]         = useState<string | null>(null)
  const [guests,       setGuests]       = useState(2)
  const [slots,        setSlots]        = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loginModal,   setLoginModal]   = useState(false)

  useEffect(() => {
    if (activeTab !== 'menu' || !id || apiMenu !== null) return
    setMenuLoading(true)
    fetch(`${API}/api/menu/${id}`)
      .then(r => r.json())
      .then((data: ApiMenuCategory[]) => {
        if (Array.isArray(data)) setApiMenu(data)
        else setApiMenu([])
      })
      .catch(() => setApiMenu([]))
      .finally(() => setMenuLoading(false))
  }, [activeTab, id])

  const dates = buildDates(t.tonight, t.tomorrow)

  useEffect(() => {
    if (!id || !date) return
    setLoadingSlots(true)
    setSlots([])
    setTime(null)
    getSlots(id, date, guests)
      .then(s => {
        // Fall back to mock available times if API returns nothing
        if (s.length === 0 && mockR?.availableTimes) {
          setSlots(mockR.availableTimes)
        } else {
          setSlots(s)
        }
      })
      .catch(() => {
        if (mockR?.availableTimes) setSlots(mockR.availableTimes)
      })
      .finally(() => setLoadingSlots(false))
  }, [id, date, guests])

  if (!nr) {
    return (
      <View style={{ flex: 1, backgroundColor: th.bg, alignItems: 'center', justifyContent: 'center' }}>
        {fetching
          ? <Text style={{ color: th.textMuted }}>{t.loading}</Text>
          : <Text style={{ color: th.textMuted }}>{t.not_found}</Text>
        }
      </View>
    )
  }

  const s = makeStyles(th)
  const cuisine = nr.cuisine ?? ''
  const menuSections = MENUS[cuisine] ?? MENUS['polish']

  return (
    <View style={[s.root, { backgroundColor: th.bg }]}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Photo hero ── */}
        <View style={s.hero}>
          <Image
            source={{ uri: imageUrl }}
            style={s.heroImage}
            resizeMode="cover"
          />
          {/* subtle full-frame dimmer */}
          <View style={s.heroOverlayFull} />
          {/* bottom gradient for text */}
          <View style={s.heroOverlayBottom} />
          {/* content at bottom */}
          <View style={s.heroContent}>
            <Text style={s.heroName} numberOfLines={2}>{nr.name}</Text>
            <View style={s.heroMeta}>
              <Feather name="star" size={13} color="#F0A500" />
              <Text style={[s.heroRating]}>
                {nr.rating.toFixed(1)}
              </Text>
              <Text style={s.heroMetaSub}>
                {'  ·  '}{nr.district}{'  ·  '}{nr.price}
              </Text>
              {mockR?.isOpen !== undefined && (
                <View style={[s.openBadge, { backgroundColor: mockR.isOpen ? '#238636' : '#8B949E' }]}>
                  <Text style={s.openBadgeText}>
                    {mockR.isOpen ? t.open_badge : t.closed_badge}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Tabs ── */}
        <View style={[s.tabsRow, { borderBottomColor: th.border, backgroundColor: th.bg }]}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[s.tab, activeTab === tab && { borderBottomColor: th.accent, borderBottomWidth: 2 }]}
            >
              <Text style={[
                s.tabText,
                { color: activeTab === tab ? th.accent : th.textSub, fontWeight: activeTab === tab ? '600' : '400' },
              ]}>
                {t[tab as keyof typeof t] as string}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Tab content ── */}
        <View style={s.tabContent}>

          {/* About */}
          {activeTab === 'about' && (
            <View>
              {nr.desc ? (
                <Text style={[s.desc, { color: th.textSub }]}>{nr.desc}</Text>
              ) : null}
              <View style={[s.infoCard, { backgroundColor: th.bgCard, borderColor: th.border }]}>
                <Text style={[s.infoCardLabel, { color: th.textMuted }]}>{t.info_label}</Text>
                {[
                  [t.open_until,      nr.open],
                  [t.district,        nr.district],
                  [t.cuisine_label,   getCuisineName(cuisine, t)],
                  [t.address,         nr.address],
                  [t.tel,             (r as any)?.phone],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <View key={String(k)} style={[s.infoRow, { borderBottomColor: th.border }]}>
                    <Text style={[s.infoKey, { color: th.textSub }]}>{k}</Text>
                    <Text style={[s.infoVal, { color: th.text }]}>{v}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Menu */}
          {activeTab === 'menu' && (
            <View>
              {menuLoading ? (
                <ActivityIndicator size="small" color={th.accent} style={{ marginTop: 24 }} />
              ) : apiMenu && apiMenu.length > 0 ? (
                <>
                  {apiMenu.map(section => (
                    <View key={section.id} style={s.menuSection}>
                      <Text style={[s.menuCategory, { color: th.text }]}>{section.name}</Text>
                      {section.items.map(item => (
                        <View
                          key={item.id}
                          style={[
                            s.menuItem,
                            { borderBottomColor: th.border, opacity: item.available ? 1 : 0.45 },
                          ]}
                        >
                          {item.imageUrl ? (
                            <Image
                              source={{ uri: item.imageUrl }}
                              style={s.menuItemPhoto}
                              resizeMode="cover"
                            />
                          ) : null}
                          <View style={s.menuItemLeft}>
                            <Text style={[s.menuItemName, { color: th.text }]}>{item.name}</Text>
                            {item.description ? (
                              <Text style={[s.menuItemDesc, { color: th.textMuted }]}>{item.description}</Text>
                            ) : null}
                            {!item.available && (
                              <Text style={[s.menuItemUnavailable, { color: th.textMuted }]}>
                                {t.unavailable ?? 'Niedostępne'}
                              </Text>
                            )}
                          </View>
                          <Text style={[s.menuItemPrice, { color: th.accent }]}>
                            {item.price.toFixed(2)} zł
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                  <Text style={[s.menuNote, { color: th.textMuted }]}>{t.menu_note}</Text>
                </>
              ) : (
                <>
                  {menuSections.map(section => (
                    <View key={section.category} style={s.menuSection}>
                      <Text style={[s.menuCategory, { color: th.text }]}>{section.category}</Text>
                      {section.items.map(item => (
                        <View key={item.name} style={[s.menuItem, { borderBottomColor: th.border }]}>
                          <View style={s.menuItemLeft}>
                            <Text style={[s.menuItemName, { color: th.text }]}>{item.name}</Text>
                            <Text style={[s.menuItemDesc, { color: th.textMuted }]}>{item.desc}</Text>
                          </View>
                          <Text style={[s.menuItemPrice, { color: th.accent }]}>{item.price}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                  <Text style={[s.menuNote, { color: th.textMuted }]}>{t.menu_note}</Text>
                </>
              )}
            </View>
          )}

          {/* Reviews */}
          {activeTab === 'reviews' && (
            <View>
              {/* Summary bar */}
              <View style={[s.ratingBar, { backgroundColor: th.bgCard, borderColor: th.border }]}>
                <Text style={[s.ratingBig, { color: th.text }]}>{nr.rating.toFixed(1)}</Text>
                <View>
                  <Stars rating={nr.rating} size={16} emptyColor={th.border} />
                  <Text style={[s.reviewCountText, { color: th.textMuted }]}>
                    {mockR?.reviewCount ?? REVIEWS.length} {t.rating}
                  </Text>
                </View>
              </View>

              {/* Review cards */}
              {REVIEWS.map(rev => (
                <View key={rev.id} style={[s.reviewCard, { backgroundColor: th.bgCard, borderColor: th.border }]}>
                  <View style={s.reviewHeader}>
                    <View style={[s.reviewAvatar, { backgroundColor: th.accent + '28' }]}>
                      <Text style={[s.reviewAvatarText, { color: th.accent }]}>
                        {rev.name.split(' ').map(n => n[0]).join('')}
                      </Text>
                    </View>
                    <View style={s.reviewMeta}>
                      <Text style={[s.reviewName, { color: th.text }]}>{rev.name}</Text>
                      <Text style={[s.reviewDate, { color: th.textMuted }]}>{rev.date}</Text>
                    </View>
                    <View style={s.reviewStars}>
                      {/* replaced Feather (outline-only) with Stars component */}
                      <Stars rating={rev.stars} size={11} emptyColor={th.border} />
                    </View>
                  </View>
                  <Text style={[s.reviewText, { color: th.textSub }]}>{rev.text}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Spacer for sticky bottom */}
        <View style={{ height: 200 }} />
      </ScrollView>

      {/* ── Back button ── */}
      <View style={[s.backWrap, { top: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.85}>
          <Feather name="chevron-left" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Auth gate modal ── */}
      <LoginRequiredModal
        visible={loginModal}
        onClose={() => setLoginModal(false)}
        onGoToLogin={() => router.navigate('/(tabs)/profile')}
        th={th}
        t={t}
      />

      {/* ── Sticky booking bar ── */}
      <View style={[s.stickyBar, { backgroundColor: th.bg, borderTopColor: th.border, paddingBottom: insets.bottom + 12 }]}>

        {/* Date row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
          {dates.slice(0, 5).map(d => {
            const active = date === d.value
            return (
              <TouchableOpacity
                key={d.value}
                onPress={() => setDate(d.value)}
                activeOpacity={0.8}
                style={[s.chip, {
                  backgroundColor: active ? th.accent : th.bgCard,
                  borderColor:     active ? 'transparent' : th.border,
                }]}
              >
                <Text style={[s.chipText, { color: active ? '#fff' : th.textSub }]}>{d.label}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Time slots row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.chipRow, { minHeight: 34 }]}>
          {loadingSlots
            ? <Text style={[s.hint, { color: th.textMuted }]}>{t.loading_slots}</Text>
            : slots.length === 0 && date
            ? <Text style={[s.hint, { color: th.textMuted }]}>{t.no_slots}</Text>
            : slots.slice(0, 8).map(ti => {
                const active = time === ti
                return (
                  <TouchableOpacity
                    key={ti}
                    onPress={() => setTime(ti)}
                    activeOpacity={0.8}
                    style={[s.chip, {
                      backgroundColor: active ? th.accent : th.bgCard,
                      borderColor:     active ? 'transparent' : th.border,
                    }]}
                  >
                    <Text style={[s.chipText, { color: active ? '#fff' : th.textSub }]}>{ti}</Text>
                  </TouchableOpacity>
                )
              })
          }
        </ScrollView>

        {/* Guests + Reserve */}
        <View style={s.bottomRow}>
          <View style={s.guestControls}>
            <TouchableOpacity
              onPress={() => setGuests(g => Math.max(1, g - 1))}
              style={[s.guestBtn, { backgroundColor: th.bgCard, borderColor: th.border }]}
            >
              <Feather name="minus" size={15} color={th.text} />
            </TouchableOpacity>
            <Text style={[s.guestNum, { color: th.text }]}>{guests}</Text>
            <TouchableOpacity
              onPress={() => setGuests(g => Math.min(12, g + 1))}
              style={[s.guestBtn, { backgroundColor: th.bgCard, borderColor: th.border }]}
            >
              <Feather name="plus" size={15} color={th.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => {
              if (!token) {
                setPendingBooking({ restaurantId: id!, date: date ?? dates[0].value, time, guests })
                setLoginModal(true)
                return
              }
              router.push({
                pathname: '/booking/[restaurantId]',
                params: { restaurantId: id!, date: date ?? '', time: time ?? '', guests: String(guests) },
              })
            }}
            activeOpacity={0.85}
            style={[s.reserveBtn, { backgroundColor: th.accent }]}
          >
            <Text style={s.reserveBtnText}>{t.reserve}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(th: any) {
  return StyleSheet.create({
    root:             { flex: 1 },
    scroll:           { flex: 1 },

    // Hero photo
    hero:             { height: 250, position: 'relative' },
    heroImage:        { width: '100%', height: 250 },
    heroOverlayFull:  { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.12)' },
    heroOverlayBottom:{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 140, backgroundColor: 'rgba(0,0,0,0.68)' },
    heroContent:      { position: 'absolute', bottom: 16, left: 20, right: 20 },
    heroName:         { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 6 },
    heroMeta:         { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
    heroRating:       { fontSize: 14, fontWeight: '700', color: '#F0A500' },
    heroMetaSub:      { fontSize: 13, color: 'rgba(255,255,255,0.80)' },
    openBadge:        { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 6 },
    openBadgeText:    { fontSize: 11, fontWeight: '600', color: '#fff' },

    // Tabs
    tabsRow:          { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1 },
    tab:              { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabText:          { fontSize: 14, textTransform: 'capitalize' },
    tabContent:       { padding: 16 },

    // About
    desc:             { fontSize: 14, lineHeight: 22, marginBottom: 16 },
    infoCard:         { borderRadius: 14, borderWidth: 1, padding: 14 },
    infoCardLabel:    { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
    infoRow:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1 },
    infoKey:          { fontSize: 13 },
    infoVal:          { fontSize: 13, fontWeight: '500', flexShrink: 1, textAlign: 'right', maxWidth: '60%' },

    // Menu
    menuSection:      { marginBottom: 20 },
    menuCategory:     { fontSize: 13, fontWeight: '700', letterSpacing: 0.6, marginBottom: 10, textTransform: 'uppercase' },
    menuItem:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
    menuItemLeft:        { flex: 1 },
    menuItemName:        { fontSize: 14, fontWeight: '500', marginBottom: 2 },
    menuItemDesc:        { fontSize: 12, lineHeight: 17 },
    menuItemPrice:       { fontSize: 14, fontWeight: '700', minWidth: 48, textAlign: 'right' },
    menuItemPhoto:       { width: 52, height: 52, borderRadius: 10, marginRight: 10 },
    menuItemUnavailable: { fontSize: 11, fontStyle: 'italic', marginTop: 2 },
    menuNote:            { fontSize: 11, fontStyle: 'italic', marginTop: 8, textAlign: 'center' },

    // Reviews
    ratingBar:        { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
    ratingBig:        { fontSize: 48, fontWeight: '800', lineHeight: 52 },
    starsRow:         { flexDirection: 'row', gap: 3, marginBottom: 4 },
    reviewCountText:  { fontSize: 13 },
    reviewCard:       { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
    reviewHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    reviewAvatar:     { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    reviewAvatarText: { fontSize: 13, fontWeight: '700' },
    reviewMeta:       { flex: 1 },
    reviewName:       { fontSize: 14, fontWeight: '600' },
    reviewDate:       { fontSize: 12 },
    reviewStars:      { flexDirection: 'row', gap: 2 },
    reviewText:       { fontSize: 13, lineHeight: 20 },

    // Back button
    backWrap:         { position: 'absolute', left: 16, zIndex: 10 },
    backBtn:          { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },

    // Booking bar
    stickyBar:        { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12 },
    chipRow:          { gap: 8, paddingBottom: 10, paddingHorizontal: 2 },
    chip:             { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
    chipText:         { fontSize: 13, fontWeight: '500' },
    hint:             { fontSize: 13, alignSelf: 'center', paddingVertical: 7 },
    bottomRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 2 },
    guestControls:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
    guestBtn:         { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    guestNum:         { fontSize: 16, fontWeight: '700', minWidth: 22, textAlign: 'center' },
    reserveBtn:       { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
    reserveBtnText:   { color: '#fff', fontSize: 15, fontWeight: '700' },
  })
}
