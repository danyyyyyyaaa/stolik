import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Animated, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SecureStore from 'expo-secure-store'
import { ThemeProvider, useTheme } from '../src/theme'
import { LangProvider, useLang } from '../src/i18n'
import { useAppStore } from '../src/store/useAppStore'
import { TOKEN_KEY } from '../src/api/client'
import { getMe } from '../src/api/auth'
import OnboardingScreen from '../src/screens/OnboardingScreen'
import { requestPermissions, getAndRegisterPushToken } from '../src/notifications'

const ONBOARDING_KEY = 'onboarding_completed'

// ─── Animated splash ──────────────────────────────────────────────────────────

function SplashView({ onDone }: { onDone: () => void }) {
  const { th } = useTheme()
  const { t }  = useLang()
  const scale   = useRef(new Animated.Value(0.75)).current
  const opacity = useRef(new Animated.Value(0)).current
  const fadeOut = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  return (
    <Animated.View style={[styles.splash, { backgroundColor: th.bg, opacity: fadeOut }]}>
      <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
        <Text style={[styles.splashLogo, { color: th.text }]}>
          Stol<Text style={{ fontStyle: 'italic', color: th.accent }}>ik</Text>
        </Text>
        <Text style={styles.splashEmoji}>🍽️</Text>
        <Text style={[styles.splashTagline, { color: th.textMuted }]}>
          {t.find_your_table}
        </Text>
      </Animated.View>
    </Animated.View>
  )
}

// ─── Root stack (inside providers) ───────────────────────────────────────────

type AppState = 'splash' | 'onboarding' | 'main'

function RootStack() {
  const { th, themeKey } = useTheme()
  const { setToken, setUser, token } = useAppStore()

  const [appState, setAppState] = useState<AppState>('splash')

  useEffect(() => {
    const splashTimer = new Promise<void>(r => setTimeout(r, 1500))

    // Wake the Railway server immediately — free-tier instances sleep after inactivity.
    // Fire-and-forget: we don't wait for this, it just starts the cold-boot in parallel.
    fetch('https://stolik-production.up.railway.app/api/restaurants', {
      method: 'GET',
      signal: AbortSignal.timeout(25_000),
    }).catch(() => {/* ignore — this is best-effort only */})

    async function init() {
      let restoredToken: string | null = null

      // Restore session
      try {
        const tok = await SecureStore.getItemAsync(TOKEN_KEY)
        if (tok) {
          restoredToken = tok
          setToken(tok)
          try {
            const user = await getMe()
            setUser(user)
          } catch {
            setToken(null)
            restoredToken = null
          }
        }
      } catch {}

      // Check onboarding
      let onboardingDone = false
      try {
        const val = await SecureStore.getItemAsync(ONBOARDING_KEY)
        onboardingDone = !!val
      } catch {}

      // Respect minimum splash duration
      await splashTimer

      if (onboardingDone) {
        // Request notification permissions and register push token (non-blocking)
        requestPermissions().then(granted => {
          if (granted && restoredToken) getAndRegisterPushToken(restoredToken)
        })
      }

      setAppState(onboardingDone ? 'main' : 'onboarding')
    }

    init()
  }, [])

  async function completeOnboarding() {
    try {
      await SecureStore.setItemAsync(ONBOARDING_KEY, '1')
    } catch {}
    // Request permissions now that the user has completed onboarding
    requestPermissions().then(granted => {
      if (granted && token) getAndRegisterPushToken(token)
    })
    setAppState('main')
  }

  if (appState === 'splash') {
    return <SplashView onDone={() => {}} />
  }

  if (appState === 'onboarding') {
    return <OnboardingScreen onComplete={completeOnboarding} />
  }

  return (
    <>
      <StatusBar style={themeKey === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown:  false,
          contentStyle: { backgroundColor: th.bg },
          animation:    'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)"               options={{ animation: 'none' }} />
        <Stack.Screen name="restaurant/[id]" />
        <Stack.Screen name="booking/[restaurantId]" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="confirmed"             options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
    </>
  )
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LangProvider>
        <RootStack />
      </LangProvider>
    </ThemeProvider>
  )
}

const styles = StyleSheet.create({
  splash:       {
    flex: 1,
    alignItems:     'center',
    justifyContent: 'center',
    gap: 8,
  },
  splashLogo:   {
    fontSize:   52,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  splashEmoji:  {
    fontSize:    36,
    marginTop:   4,
  },
  splashTagline:{
    fontSize:    15,
    marginTop:   6,
    letterSpacing: 0.3,
  },
})
