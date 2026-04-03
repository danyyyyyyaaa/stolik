import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../theme'
import { useLang } from '../i18n'

const API = process.env.EXPO_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

export default function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const { th } = useTheme()
  const { t } = useLang()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    if (!email.trim()) return
    setLoading(true); setError('')
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 15000)
      await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
        signal: ctrl.signal,
      }).finally(() => clearTimeout(timer))
      setDone(true)
    } catch { setError(t.network_error) }
    finally { setLoading(false) }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: th.bg }]}>
      <TouchableOpacity onPress={onBack} style={s.back}>
        <Text style={[s.backText, { color: th.accent }]}>← {t.back_to_login}</Text>
      </TouchableOpacity>
      <View style={s.body}>
        <Text style={[s.title, { color: th.text }]}>{t.forgot_password}</Text>
        {done ? (
          <>
            <Text style={s.emoji}>📬</Text>
            <Text style={[s.heading, { color: th.text }]}>{t.check_email_title}</Text>
            <Text style={[s.desc, { color: th.textSub }]}>{t.check_email_body}</Text>
            <TouchableOpacity onPress={onBack} style={[s.btn, { backgroundColor: th.accent }]}>
              <Text style={s.btnText}>{t.back_to_login}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput value={email} onChangeText={setEmail} placeholder={t.email}
              placeholderTextColor={th.textMuted} keyboardType="email-address" autoCapitalize="none"
              style={[s.input, { backgroundColor: th.bgCard, borderColor: th.inputBorder, color: th.text }]} />
            {error ? <Text style={[s.err, { color: th.error }]}>{error}</Text> : null}
            <TouchableOpacity onPress={handleSend} disabled={loading}
              style={[s.btn, { backgroundColor: th.accent, opacity: loading ? 0.7 : 1 }]}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnText}>{t.send_reset_link}</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:    { flex: 1 },
  back:    { paddingHorizontal: 20, paddingTop: 12 },
  backText:{ fontSize: 15, fontWeight: '500' },
  body:    { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  title:   { fontSize: 26, fontWeight: '800', marginBottom: 24 },
  emoji:   { fontSize: 48, textAlign: 'center', marginBottom: 12 },
  heading: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  desc:    { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 32 },
  input:   { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 12 },
  err:     { fontSize: 12, marginBottom: 8 },
  btn:     { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
