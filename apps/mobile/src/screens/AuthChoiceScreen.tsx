import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'
import { useLang } from '../i18n'

interface Props {
  onLogin: () => void
  onRegister: () => void
}

export default function AuthChoiceScreen({ onLogin, onRegister }: Props) {
  const { th } = useTheme()
  const { t } = useLang()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: th.bg,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 32,
        },
      ]}
    >
      {/* Logo area */}
      <View style={styles.logoArea}>
        <Text style={[styles.logo, { color: th.text }]}>
          Stol<Text style={{ fontStyle: 'italic', color: th.accent }}>ik</Text>
        </Text>
        <Text style={styles.emoji}>🍽️</Text>
        <Text style={[styles.tagline, { color: th.textMuted }]}>{t.find_your_table}</Text>
      </View>

      {/* Action buttons */}
      <View style={styles.btnArea}>
        <TouchableOpacity
          onPress={onRegister}
          activeOpacity={0.85}
          style={[styles.primaryBtn, { backgroundColor: th.accent }]}
        >
          <Text style={styles.primaryBtnText}>{t.create_account}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onLogin}
          activeOpacity={0.85}
          style={[styles.secondaryBtn, { borderColor: th.border }]}
        >
          <Text style={[styles.secondaryBtnText, { color: th.text }]}>{t.sign_in}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  logoArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logo: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  emoji: {
    fontSize: 40,
    marginTop: 4,
  },
  tagline: {
    fontSize: 15,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  btnArea: {
    gap: 12,
  },
  primaryBtn: {
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  secondaryBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
})
