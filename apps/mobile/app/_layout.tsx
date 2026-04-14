import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Animated, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SecureStore from 'expo-secure-store'
import * as Font from 'expo-font'
import {
  DMSerifDisplay_400Regular,
} from '@expo-google-fonts/dm-serif-display'
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans'
import { ThemeProvider, useTheme } from '../src/theme'
import { LangProvider, useLang } from '../src/i18n'
import { useAppStore } from '../src/store/useAppStore'
import { TOKEN_KEY } from '../src/api/client'
import { getMe } from '../src/api/auth'
import AuthChoiceScreen from '../src/screens/AuthChoiceScreen'
import RegisterScreen from '../src/screens/RegisterScreen'
import OnboardingScreen from '../src/screens/OnboardingScreen'
import OfflineBanner from '../src/components/OfflineBanner'

const ONBOARDING_KEY = 'onboarding_completed'

// ─── Animated splash ──────────────────────────────────────────────────────────

function SplashView() {
  const { th } = useTheme()
  const { t }  = useLang()
  const scale   = useRef(new Animated.Value(0.75)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start()
  }, [])

  return (
    <Animated.View style={[styles.splash, { backgroundColor: th.bg }]}>
      <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
        <Text style={[styles.splashLogo, { color: th.text }]}>
          Stol<Text style={{ fontStyle: 'italic', color: th.accent }}>ik</Text>
        </Text>
        <Text style={styles.splashEmoji}>🍽️</Text>
        <Text style={[styles.splashTagline, { color: th.textMuted }]}>{t.find_your_table}</Text>
      </Animated.View>
    </Animated.View>
  )
}

// ─── Auth flow (choice → register) ───────────────────────────────────────────

type AuthStep = 'choice' | 'register'

function AuthFlow({
  onLogin,
  onRegisterSuccess,
}: {
  onLogin: () => void
  onRegisterSuccess: () => void
}) {
  const [step, setStep] = useState<AuthStep>('choice')

  if (step === 'choice') {
    return (
      <AuthChoiceScreen
        onLogin={onLogin}
        onRegister={() => setStep('register')}
      />
    )
  }

  return (
    <RegisterScreen
      onSuccess={onRegisterSuccess}
      onBack={() => setStep('choice')}
    />
  )
}

// ─── Root stack ───────────────────────────────────────────────────────────────

type AppState = 'splash' | 'auth' | 'onboarding' | 'main'

function RootStack() {
  const { th, themeKey } = useTheme()
  const { setToken, setUser } = useAppStore()

  const [appState, setAppState] = useState<AppState>('splash')
  const [fontsLoaded, setFontsLoaded] = useState(false)

  useEffect(() => {
    Font.loadAsync({
      DMSerifDisplay_400Regular,
      PlusJakartaSans_400Regular,
      PlusJakartaSans_500Medium,
      PlusJakartaSans_600SemiBold,
      PlusJakartaSans_700Bold,
    })
      .catch(() => {})
      .finally(() => setFontsLoaded(true))
  }, [])

  useEffect(() => {
    const splashTimer = new Promise<void>(r => setTimeout(r, 1500))

    // Wake the Railway server — free-tier sleeps after inactivity
    const wakeController = new AbortController()
    const wakeTimeout = setTimeout(() => wakeController.abort(), 25_000)
    fetch('https://stolik-production.up.railway.app/api/restaurants', {
      method: 'GET',
      signal: wakeController.signal,
    }).finally(() => clearTimeout(wakeTimeout)).catch(() => {})

    async function init() {
      let restoredToken: string | null = null

      try {
        const tok = await SecureStore.getItemAsync(TOKEN_KEY)
        if (tok) {
          restoredToken = tok
          setToken(tok)
          try {
            const user = await getMe()
            setUser(user)
          } catch {
            // Token expired / invalid — clear it
            await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {})
            setToken(null)
            restoredToken = null
          }
        }
      } catch {}

      let onboardingDone = false
      try {
        const val = await SecureStore.getItemAsync(ONBOARDING_KEY)
        onboardingDone = !!val
      } catch {}

      await splashTimer

      if (onboardingDone) {
        setAppState('main')
      } else if (restoredToken) {
        // Has token but onboarding not finished (e.g. app killed mid-onboarding)
        setAppState('onboarding')
      } else {
        setAppState('auth')
      }
    }

    init()
  }, [])

  async function completeOnboarding() {
    try {
      await SecureStore.setItemAsync(ONBOARDING_KEY, '1')
    } catch {}
    setAppState('main')
  }

  if (appState === 'splash' || !fontsLoaded) return <SplashView />

  if (appState === 'auth') {
    return (
      <AuthFlow
        onLogin={() => setAppState('main')}
        onRegisterSuccess={() => setAppState('onboarding')}
      />
    )
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
        <Stack.Screen name="(tabs)"                    options={{ animation: 'none' }} />
        <Stack.Screen name="restaurant/[id]" />
        <Stack.Screen name="booking/[restaurantId]"    options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="confirmed"                 options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
      {/* Global offline banner — slides in from top when connection is lost */}
      <OfflineBanner />
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
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  splashLogo: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  splashEmoji: {
    fontSize: 36,
    marginTop: 4,
  },
  splashTagline: {
    fontSize: 15,
    marginTop: 6,
    letterSpacing: 0.3,
  },
})
