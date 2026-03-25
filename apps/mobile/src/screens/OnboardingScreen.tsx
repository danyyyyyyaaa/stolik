import React, { useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLang } from '../i18n'

const { width: SCREEN_W } = Dimensions.get('window')

const SLIDE_BG_COLORS = ['#1B3A2A', '#1B2E42', '#2E1B3A']

interface Props {
  onComplete: () => void
}

export default function OnboardingScreen({ onComplete }: Props) {
  const insets        = useSafeAreaInsets()
  const { t }         = useLang()
  const [index, setIndex] = useState(0)
  const scrollRef     = useRef<ScrollView>(null)
  const dotAnims      = useRef([0, 1, 2].map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current

  const slides = [
    { emoji: '🍽️', bgColor: SLIDE_BG_COLORS[0], title: t.onb_title_1, subtitle: t.onb_sub_1 },
    { emoji: '⚡',  bgColor: SLIDE_BG_COLORS[1], title: t.onb_title_2, subtitle: t.onb_sub_2 },
    { emoji: '✅',  bgColor: SLIDE_BG_COLORS[2], title: t.onb_title_3, subtitle: t.onb_sub_3 },
  ]

  const isLast = index === slides.length - 1
  const slide  = slides[index]

  function goTo(next: number) {
    if (next < 0 || next >= slides.length) return
    scrollRef.current?.scrollTo({ x: next * SCREEN_W, animated: true })
    animateDots(next)
    setIndex(next)
  }

  function animateDots(next: number) {
    slides.forEach((_, i) => {
      Animated.spring(dotAnims[i], {
        toValue: i === next ? 1 : 0,
        useNativeDriver: false,
        tension: 160,
        friction: 12,
      }).start()
    })
  }

  function handleScroll(e: any) {
    const x    = e.nativeEvent.contentOffset.x
    const next = Math.round(x / SCREEN_W)
    if (next !== index) {
      animateDots(next)
      setIndex(next)
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: slide.bgColor }]}>

      {/* Skip button */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={onComplete} hitSlop={12} activeOpacity={0.7}>
          <Text style={styles.skipText}>{t.onb_skip}</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.slidesScroll}
      >
        {slides.map((s, i) => (
          <View key={i} style={[styles.slide, { width: SCREEN_W }]}>
            {/* Illustration circle */}
            <View style={[styles.illustrationCircle, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <View style={[styles.illustrationInner, { backgroundColor: 'rgba(255,255,255,0.10)' }]}>
                <Text style={styles.emoji}>{s.emoji}</Text>
              </View>
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.subtitle}>{s.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom controls */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {slides.map((_, i) => {
            const width = dotAnims[i].interpolate({
              inputRange:  [0, 1],
              outputRange: [8, 24],
            })
            const opacity = dotAnims[i].interpolate({
              inputRange:  [0, 1],
              outputRange: [0.35, 1],
            })
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width, opacity }]}
              />
            )
          })}
        </View>

        {/* Next / Get Started */}
        <TouchableOpacity
          onPress={isLast ? onComplete : () => goTo(index + 1)}
          activeOpacity={0.85}
          style={styles.nextBtn}
        >
          <Text style={styles.nextBtnText}>
            {isLast ? t.onb_start : t.onb_next}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root:               { flex: 1 },
  topBar:             { paddingHorizontal: 24, alignItems: 'flex-end' },
  skipText:           { color: 'rgba(255,255,255,0.55)', fontSize: 15, fontWeight: '500' },

  slidesScroll:       { flex: 1 },
  slide:              { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  illustrationCircle: {
    width: 220, height: 220, borderRadius: 110,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 44,
  },
  illustrationInner:  {
    width: 160, height: 160, borderRadius: 80,
    alignItems: 'center', justifyContent: 'center',
  },
  emoji:              { fontSize: 72 },

  title:              {
    fontSize: 28, fontWeight: '800', color: '#fff',
    textAlign: 'center', marginBottom: 16, letterSpacing: -0.5,
  },
  subtitle:           {
    fontSize: 16, color: 'rgba(255,255,255,0.65)',
    textAlign: 'center', lineHeight: 24,
  },

  bottom:             { paddingHorizontal: 24, alignItems: 'center', gap: 24 },
  dots:               { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot:                { height: 8, borderRadius: 4, backgroundColor: '#fff' },
  nextBtn:            {
    width: '100%', paddingVertical: 16, borderRadius: 16,
    backgroundColor: '#238636', alignItems: 'center',
  },
  nextBtnText:        { color: '#fff', fontSize: 17, fontWeight: '700' },
})
