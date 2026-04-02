import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../theme'
import { useLang } from '../i18n'
import { useAppStore } from '../store/useAppStore'
import { register } from '../api/auth'

interface Props {
  onSuccess: () => void
  onBack: () => void
}

export default function RegisterScreen({ onSuccess, onBack }: Props) {
  const { th } = useTheme()
  const { t } = useLang()
  const { setToken, setUser } = useAppStore()
  const insets = useSafeAreaInsets()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function validate(): string | null {
    if (!firstName.trim()) return t.fill_fields
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return t.email
    }
    if (password.length < 6) return t.password_min
    return null
  }

  async function handleSubmit() {
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setLoading(true)
    setError('')
    try {
      const res = await register(
        firstName.trim(),
        lastName.trim(),
        email.trim(),
        password,
        phone.trim() || undefined,
      )
      await setToken(res.token)
      setUser(res.user)
      onSuccess()
    } catch (e: any) {
      const msg: string = e.message ?? ''
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists') || msg.toLowerCase().includes('409')) {
        setError(t.email_taken)
      } else if (msg.toLowerCase().includes('slow') || msg.toLowerCase().includes('timeout')) {
        setError(t.network_error)
      } else {
        setError(msg || t.booking_error)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: th.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={12} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={th.text} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: th.text }]}>{t.create_account}</Text>
        </View>

        {/* Fields */}
        <TextInput
          value={firstName}
          onChangeText={v => { setFirstName(v); setError('') }}
          placeholder={t.first_name}
          placeholderTextColor={th.textMuted}
          style={[styles.input, { backgroundColor: th.bgCard, borderColor: th.inputBorder, color: th.text }]}
        />
        <TextInput
          value={lastName}
          onChangeText={v => { setLastName(v); setError('') }}
          placeholder={t.last_name}
          placeholderTextColor={th.textMuted}
          style={[styles.input, { backgroundColor: th.bgCard, borderColor: th.inputBorder, color: th.text }]}
        />
        <TextInput
          value={email}
          onChangeText={v => { setEmail(v); setError('') }}
          placeholder={t.email}
          placeholderTextColor={th.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { backgroundColor: th.bgCard, borderColor: th.inputBorder, color: th.text }]}
        />
        <TextInput
          value={password}
          onChangeText={v => { setPassword(v); setError('') }}
          placeholder={t.password}
          placeholderTextColor={th.textMuted}
          secureTextEntry
          style={[styles.input, { backgroundColor: th.bgCard, borderColor: th.inputBorder, color: th.text }]}
        />
        <TextInput
          value={phone}
          onChangeText={v => { setPhone(v); setError('') }}
          placeholder={t.phone_placeholder}
          placeholderTextColor={th.textMuted}
          keyboardType="phone-pad"
          style={[styles.input, { backgroundColor: th.bgCard, borderColor: th.inputBorder, color: th.text }]}
        />

        {/* Error */}
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: th.error + '18' }]}>
            <Text style={[styles.errorText, { color: th.error }]}>{error}</Text>
          </View>
        ) : null}

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
          style={[styles.submitBtn, { backgroundColor: th.accent, opacity: loading ? 0.7 : 1 }]}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.submitBtnText}>{t.create_account}</Text>
          }
        </TouchableOpacity>

        {/* Login link */}
        <View style={styles.loginLinkRow}>
          <Text style={[styles.loginLinkText, { color: th.textSub }]}>{t.have_account} </Text>
          <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
            <Text style={[styles.loginLinkText, { color: th.accent, fontWeight: '600' }]}>{t.sign_in}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex:          { flex: 1 },
  scroll:        { paddingHorizontal: 24 },
  backBtn:       { marginBottom: 20, alignSelf: 'flex-start', padding: 4 },
  header:        { marginBottom: 28 },
  title:         { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  input:         {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  errorBox:      { borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText:     { fontSize: 13 },
  submitBtn:     { paddingVertical: 17, borderRadius: 16, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  loginLinkRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginLinkText: { fontSize: 14 },
})
