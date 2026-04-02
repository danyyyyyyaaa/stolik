import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'
import { useLang, LangKey } from '../i18n'
import { requestPermissions, getAndRegisterPushToken } from '../notifications'
import { useAppStore } from '../store/useAppStore'

type Step = 'language' | 'push' | 'done'

const LANGUAGES: { key: LangKey; native: string; label: string }[] = [
  { key: 'en', native: 'English',     label: 'English'    },
  { key: 'pl', native: 'Polski',      label: 'Polish'     },
  { key: 'ru', native: 'Русский',     label: 'Russian'    },
  { key: 'uk', native: 'Українська',  label: 'Ukrainian'  },
]

interface Props {
  onComplete: () => void
}

export default function OnboardingScreen({ onComplete }: Props) {
  const { th } = useTheme()
  const { t, lang, setLang } = useLang()
  const { token } = useAppStore()
  const insets = useSafeAreaInsets()

  const [step, setStep] = useState<Step>('language')
  const [selectedLang, setSelectedLang] = useState<LangKey>(lang)

  function handleLangNext() {
    setLang(selectedLang)
    setStep('push')
  }

  async function handlePushAllow() {
    try {
      const granted = await requestPermissions()
      if (granted && token) {
        getAndRegisterPushToken(token).catch(() => {})
      }
    } catch {
      // ignore — not critical
    }
    setStep('done')
  }

  const padTop = insets.top + 32
  const padBot = insets.bottom + 32

  // ── Step 1: Language selection ─────────────────────────────────────────────
  if (step === 'language') {
    return (
      <View style={[styles.root, { backgroundColor: '#1B3A2A', paddingTop: padTop, paddingBottom: padBot }]}>
        <View style={styles.content}>
          <Text style={styles.stepEmoji}>🌐</Text>
          <Text style={styles.stepTitle}>{t.choose_language}</Text>
          <View style={styles.langGrid}>
            {LANGUAGES.map(l => (
              <TouchableOpacity
                key={l.key}
                onPress={() => setSelectedLang(l.key)}
                activeOpacity={0.8}
                style={[
                  styles.langCard,
                  {
                    backgroundColor: selectedLang === l.key
                      ? th.accent
                      : 'rgba(255,255,255,0.08)',
                  },
                ]}
              >
                <Text style={styles.langNative}>{l.native}</Text>
                <Text style={styles.langLabel}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <TouchableOpacity onPress={handleLangNext} activeOpacity={0.85} style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>{t.onb_next}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ── Step 2: Push notifications ─────────────────────────────────────────────
  if (step === 'push') {
    return (
      <View style={[styles.root, { backgroundColor: '#1B2E42', paddingTop: padTop, paddingBottom: padBot }]}>
        <View style={styles.content}>
          <Text style={styles.stepEmoji}>🔔</Text>
          <Text style={styles.stepTitle}>{t.push_title}</Text>
          <Text style={styles.stepSubtitle}>{t.push_desc}</Text>
        </View>
        <View style={styles.pushBtns}>
          <TouchableOpacity onPress={handlePushAllow} activeOpacity={0.85} style={styles.nextBtn}>
            <Text style={styles.nextBtnText}>{t.push_allow}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep('done')} activeOpacity={0.7} style={styles.skipLink}>
            <Text style={styles.skipText}>{t.onb_skip}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Step 3: Done ───────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: '#2E1B3A', paddingTop: padTop, paddingBottom: padBot }]}>
      <View style={styles.content}>
        <Text style={styles.stepEmoji}>✅</Text>
        <Text style={styles.stepTitle}>{t.ready_title}</Text>
        <Text style={styles.stepSubtitle}>{t.ready_desc}</Text>
      </View>
      <TouchableOpacity onPress={onComplete} activeOpacity={0.85} style={styles.nextBtn}>
        <Text style={styles.nextBtnText}>{t.ready_btn}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  langGrid: {
    width: '100%',
    gap: 10,
    marginTop: 20,
  },
  langCard: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langNative: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  langLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
  },
  nextBtn: {
    backgroundColor: '#238636',
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  pushBtns: {
    gap: 8,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
  },
})
