import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Switch, Alert, Image, Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronRight, Edit2, Lock, LogOut, Camera, HelpCircle, MessageCircle, FileText, Globe, Sun, Moon, Bell, ChevronDown } from 'lucide-react-native'
import { router } from 'expo-router'
import { useTheme, colors, radii, shadows } from '../../src/theme'
import { useLang } from '../../src/i18n'
import { useAppStore } from '../../src/store/useAppStore'
import { login, register, changePassword, deleteAccount, updateProfile, uploadAvatar } from '../../src/api/auth'
import { getReferralStats, type ReferralStats } from '../../src/api/referrals'
import LanguagePickerModal from '../../src/components/LanguagePickerModal'
import { isEnabled, setEnabled, requestPermissions } from '../../src/notifications'
import ForgotPasswordScreen from '../../src/screens/ForgotPasswordScreen'

type AuthMode = 'login' | 'register'

// ─── Login / Register form ─────────────────────────────────────────────────────
function AuthForm({ th, t }: { th: any; t: any }) {
  const { setToken, setUser, pendingBooking, setPendingBooking } = useAppStore()
  const [mode,       setMode]       = useState<AuthMode>('login')
  const [firstName,    setFirstName]    = useState('')
  const [lastName,     setLastName]     = useState('')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [showForgot,   setShowForgot]   = useState(false)

  if (showForgot) return <ForgotPasswordScreen onBack={() => setShowForgot(false)} />

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) { setError(t.fill_fields); return }
    setLoading(true)
    setError('')
    try {
      const res = mode === 'login'
        ? await login(email.trim(), password)
        : await register(firstName.trim(), lastName.trim(), email.trim(), password, referralCode.trim() || undefined)
      await setToken(res.token)
      setUser(res.user)

      // Resume pending booking if user was redirected from restaurant screen
      if (pendingBooking) {
        const p = pendingBooking
        setPendingBooking(null)
        router.replace({
          pathname: '/booking/[restaurantId]',
          params: {
            restaurantId: p.restaurantId,
            date:    p.date,
            time:    p.time   ?? '',
            guests:  String(p.guests),
          },
        })
      }
    } catch (e: any) {
      setError(e.message ?? t.booking_error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={af.scroll}>
        {/* Logo */}
        <View style={af.logoRow}>
          <Text style={[af.logo, { color: th.text }]}>
            Din<Text style={{ fontStyle: 'italic', color: th.accent }}>to</Text>
          </Text>
          <Text style={[af.subtitle, { color: th.textSub }]}>{t.sign_in}</Text>
        </View>

        {/* Mode toggle */}
        <View style={[af.modeToggle, { backgroundColor: th.bgCard, borderColor: th.border }]}>
          {(['login', 'register'] as AuthMode[]).map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => { setMode(m); setError('') }}
              style={[af.modeBtn, mode === m && { backgroundColor: th.accent }]}
            >
              <Text style={[af.modeBtnText, { color: mode === m ? '#fff' : th.textSub }]}>
                {m === 'login' ? t.sign_in_btn : t.register}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Register fields */}
        {mode === 'register' && (
          <>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t.first_name}
              placeholderTextColor={th.textMuted}
              style={[af.input, { backgroundColor: th.bgCard, borderColor: th.inputBorder, color: th.text }]}
            />
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder={t.last_name}
              placeholderTextColor={th.textMuted}
              style={[af.input, { backgroundColor: th.bgCard, borderColor: th.inputBorder, color: th.text }]}
            />
          </>
        )}

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={t.email}
          placeholderTextColor={th.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          style={[af.input, { backgroundColor: th.bgCard, borderColor: th.inputBorder, color: th.text }]}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={t.password}
          placeholderTextColor={th.textMuted}
          secureTextEntry
          style={[af.input, { backgroundColor: th.bgCard, borderColor: th.inputBorder, color: th.text }]}
        />

        {mode === 'register' && (
          <TextInput
            value={referralCode}
            onChangeText={setReferralCode}
            placeholder={t.referral_code_placeholder as string}
            placeholderTextColor={th.textMuted}
            autoCapitalize="characters"
            style={[af.input, { backgroundColor: th.bgCard, borderColor: th.inputBorder, color: th.text }]}
          />
        )}

        {mode === 'login' && (
          <TouchableOpacity onPress={() => setShowForgot(true)} style={{ alignSelf: 'flex-end', marginBottom: 8, marginTop: -4 }}>
            <Text style={{ fontSize: 13, color: th.accent }}>{t.forgot_password}</Text>
          </TouchableOpacity>
        )}

        {error ? (
          <View style={[af.errorBox, { backgroundColor: th.error + '18' }]}>
            <Text style={[af.errorText, { color: th.error }]}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
          style={[af.submitBtn, { backgroundColor: th.accent, opacity: loading ? 0.7 : 1 }]}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={af.submitBtnText}>{mode === 'login' ? t.sign_in_btn : t.register}</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const af = StyleSheet.create({
  scroll:       { paddingHorizontal: 20, paddingTop: 32 },
  logoRow:      { alignItems: 'center', marginBottom: 32 },
  logo:         { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  subtitle:     { fontSize: 14, marginTop: 4 },
  modeToggle:   { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4, marginBottom: 20 },
  modeBtn:      { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  modeBtnText:  { fontSize: 14, fontWeight: '600' },
  input:        { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 12 },
  errorBox:     { borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText:    { fontSize: 13 },
  submitBtn:    { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  submitBtnText:{ color: '#fff', fontSize: 16, fontWeight: '700' },
})

// ─── Inline edit form ──────────────────────────────────────────────────────────
function EditProfileForm({ th, t, onClose }: { th: any; t: any; onClose: () => void }) {
  const { user, setUser } = useAppStore()
  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName,  setLastName]  = useState(user?.lastName  ?? '')
  const [phone,     setPhone]     = useState((user as any)?.phone ?? '')
  const [dob,       setDob]       = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  // Parse DD.MM.YYYY → ISO string, or null to clear
  function parseDob(raw: string): string | null | undefined {
    if (!raw.trim()) return null  // clear DOB
    const parts = raw.trim().split('.')
    if (parts.length !== 3) return undefined  // invalid
    const [dd, mm, yyyy] = parts
    const d = new Date(`${yyyy}-${mm}-${dd}`)
    if (isNaN(d.getTime())) return undefined  // invalid
    return d.toISOString()
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) { setError(t.fill_fields); return }
    const parsedDob = dob.trim() ? parseDob(dob) : undefined
    if (parsedDob === undefined && dob.trim()) { setError(t.dob_invalid); return }
    setLoading(true)
    setError('')
    try {
      const updated = await updateProfile({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        phone:     phone.trim() || undefined,
        ...(parsedDob !== undefined ? { dateOfBirth: parsedDob } : {}),
      })
      setUser({ ...(user as any), ...updated })
      onClose()
    } catch (e: any) {
      setError(e.message ?? t.booking_error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={[epf.wrap, { backgroundColor: th.bgCard, borderColor: th.border }]}>
      <Text style={[epf.label, { color: th.textMuted }]}>{t.edit_profile.toUpperCase()}</Text>
      <TextInput
        value={firstName}
        onChangeText={setFirstName}
        placeholder={t.first_name}
        placeholderTextColor={th.textMuted}
        style={[epf.input, { backgroundColor: th.bgCardAlt, borderColor: th.border, color: th.text }]}
      />
      <TextInput
        value={lastName}
        onChangeText={setLastName}
        placeholder={t.last_name}
        placeholderTextColor={th.textMuted}
        style={[epf.input, { backgroundColor: th.bgCardAlt, borderColor: th.border, color: th.text }]}
      />
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder={t.phone_placeholder}
        placeholderTextColor={th.textMuted}
        keyboardType="phone-pad"
        style={[epf.input, { backgroundColor: th.bgCardAlt, borderColor: th.border, color: th.text }]}
      />
      <TextInput
        value={dob}
        onChangeText={setDob}
        placeholder={t.dob_placeholder}
        placeholderTextColor={th.textMuted}
        keyboardType="numbers-and-punctuation"
        style={[epf.input, { backgroundColor: th.bgCardAlt, borderColor: th.border, color: th.text }]}
      />
      <Text style={[epf.hint, { color: th.textMuted }]}>{t.dob_hint}</Text>
      {error ? <Text style={[epf.error, { color: th.error ?? '#e53e3e' }]}>{error}</Text> : null}
      <View style={epf.btnRow}>
        <TouchableOpacity onPress={onClose} style={[epf.cancelBtn, { borderColor: th.border }]}>
          <Text style={[epf.cancelText, { color: th.textSub }]}>{t.cancel}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave} disabled={loading}
          style={[epf.saveBtn, { backgroundColor: th.accent, opacity: loading ? 0.7 : 1 }]}>
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={epf.saveText}>{t.save}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const epf = StyleSheet.create({
  wrap:       { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  label:      { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 12 },
  input:      { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, marginBottom: 10 },
  hint:       { fontSize: 11, marginBottom: 10, marginTop: -6 },
  error:      { fontSize: 12, marginBottom: 8 },
  btnRow:     { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:  { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '500' },
  saveBtn:    { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveText:   { color: '#fff', fontSize: 14, fontWeight: '600' },
})

// ─── Change password form ──────────────────────────────────────────────────────
function ChangePasswordForm({ th, t, onClose }: { th: any; t: any; onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next,    setNext]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)

  async function handleSave() {
    if (!current.trim() || !next.trim()) { setError(t.fill_fields); return }
    if (next.trim().length < 6) { setError(t.password_min); return }
    setLoading(true)
    setError('')
    try {
      await changePassword(current.trim(), next.trim())
      setDone(true)
      setTimeout(onClose, 1500)
    } catch (e: any) {
      setError(e.message?.includes('401') || e.message?.includes('wrong') || e.message?.includes('current')
        ? t.wrong_password
        : e.message ?? t.booking_error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={[epf.wrap, { backgroundColor: th.bgCard, borderColor: th.border }]}>
      <Text style={[epf.label, { color: th.textMuted }]}>{t.change_password.toUpperCase()}</Text>
      {done ? (
        <Text style={{ color: th.success, textAlign: 'center', paddingVertical: 8 }}>✓ {t.password_changed}</Text>
      ) : (
        <>
          <TextInput
            value={current}
            onChangeText={setCurrent}
            placeholder={t.current_password}
            placeholderTextColor={th.textMuted}
            secureTextEntry
            style={[epf.input, { backgroundColor: th.bgCardAlt, borderColor: th.border, color: th.text }]}
          />
          <TextInput
            value={next}
            onChangeText={setNext}
            placeholder={t.new_password}
            placeholderTextColor={th.textMuted}
            secureTextEntry
            style={[epf.input, { backgroundColor: th.bgCardAlt, borderColor: th.border, color: th.text }]}
          />
          {error ? <Text style={{ color: th.error, fontSize: 12, marginBottom: 8 }}>{error}</Text> : null}
          <View style={epf.btnRow}>
            <TouchableOpacity onPress={onClose} style={[epf.cancelBtn, { borderColor: th.border }]}>
              <Text style={[epf.cancelText, { color: th.textSub }]}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={loading} style={[epf.saveBtn, { backgroundColor: th.accent }]}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={epf.saveText}>{t.save}</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  )
}

// ─── Change email form ─────────────────────────────────────────────────────────
function ChangeEmailForm({ th, t, onClose }: { th: any; t: any; onClose: () => void }) {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)
  const { token } = useAppStore()

  async function handleSend() {
    if (!email.trim()) { setError(t.fill_fields); return }
    setLoading(true); setError('')
    try {
      const apiBase = process.env.EXPO_PUBLIC_API_URL || ''
      const res = await fetch(`${apiBase}/api/auth/change-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newEmail: email.trim() }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Error') }
      setDone(true)
    } catch (e: any) {
      setError(e.message ?? t.booking_error)
    } finally { setLoading(false) }
  }

  return (
    <View style={[epf.wrap, { backgroundColor: th.bgCard, borderColor: th.border }]}>
      <Text style={[epf.label, { color: th.textMuted }]}>{t.change_email.toUpperCase()}</Text>
      {done ? (
        <Text style={{ color: th.accent, textAlign: 'center', paddingVertical: 8 }}>✓ {t.code_sent_email}</Text>
      ) : (
        <>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t.new_email}
            placeholderTextColor={th.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[epf.input, { backgroundColor: th.bgCardAlt, borderColor: th.border, color: th.text }]}
          />
          {error ? <Text style={{ color: th.error, fontSize: 12, marginBottom: 8 }}>{error}</Text> : null}
          <View style={epf.btnRow}>
            <TouchableOpacity onPress={onClose} style={[epf.cancelBtn, { borderColor: th.border }]}>
              <Text style={[epf.cancelText, { color: th.textSub }]}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSend} disabled={loading} style={[epf.saveBtn, { backgroundColor: th.accent }]}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={epf.saveText}>{t.send_code}</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  )
}

// ─── Change phone form ─────────────────────────────────────────────────────────
function ChangePhoneForm({ th, t, onClose }: { th: any; t: any; onClose: () => void }) {
  const [phone,   setPhone]   = useState('')
  const [code,    setCode]    = useState('')
  const [step,    setStep]    = useState<'phone' | 'code'>('phone')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)
  const { token, user, setUser } = useAppStore()

  async function handleSendCode() {
    if (!phone.trim()) { setError(t.fill_fields); return }
    setLoading(true); setError('')
    try {
      const apiBase = process.env.EXPO_PUBLIC_API_URL || ''
      const res = await fetch(`${apiBase}/api/auth/change-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPhone: phone.trim() }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Error') }
      setStep('code')
    } catch (e: any) {
      setError(e.message ?? t.booking_error)
    } finally { setLoading(false) }
  }

  async function handleVerify() {
    if (!code.trim()) { setError(t.fill_fields); return }
    setLoading(true); setError('')
    try {
      const apiBase = process.env.EXPO_PUBLIC_API_URL || ''
      const res = await fetch(`${apiBase}/api/auth/verify-new-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: code.trim() }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? t.code_invalid) }
      if (user) setUser({ ...user, phone: phone.trim() })
      setDone(true)
      setTimeout(onClose, 1500)
    } catch (e: any) {
      setError(e.message ?? t.booking_error)
    } finally { setLoading(false) }
  }

  return (
    <View style={[epf.wrap, { backgroundColor: th.bgCard, borderColor: th.border }]}>
      <Text style={[epf.label, { color: th.textMuted }]}>{t.change_phone.toUpperCase()}</Text>
      {done ? (
        <Text style={{ color: th.accent, textAlign: 'center', paddingVertical: 8 }}>✓ {t.phone_changed}</Text>
      ) : step === 'phone' ? (
        <>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder={t.new_phone}
            placeholderTextColor={th.textMuted}
            keyboardType="phone-pad"
            style={[epf.input, { backgroundColor: th.bgCardAlt, borderColor: th.border, color: th.text }]}
          />
          {error ? <Text style={{ color: th.error, fontSize: 12, marginBottom: 8 }}>{error}</Text> : null}
          <View style={epf.btnRow}>
            <TouchableOpacity onPress={onClose} style={[epf.cancelBtn, { borderColor: th.border }]}>
              <Text style={[epf.cancelText, { color: th.textSub }]}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSendCode} disabled={loading} style={[epf.saveBtn, { backgroundColor: th.accent }]}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={epf.saveText}>{t.send_code}</Text>}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <Text style={{ color: th.textSub, fontSize: 13, marginBottom: 10 }}>{t.code_sent_phone}</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder={t.enter_verification_code}
            placeholderTextColor={th.textMuted}
            keyboardType="number-pad"
            style={[epf.input, { backgroundColor: th.bgCardAlt, borderColor: th.border, color: th.text }]}
          />
          {error ? <Text style={{ color: th.error, fontSize: 12, marginBottom: 8 }}>{error}</Text> : null}
          <View style={epf.btnRow}>
            <TouchableOpacity onPress={() => { setStep('phone'); setCode('') }} style={[epf.cancelBtn, { borderColor: th.border }]}>
              <Text style={[epf.cancelText, { color: th.textSub }]}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleVerify} disabled={loading} style={[epf.saveBtn, { backgroundColor: th.accent }]}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={epf.saveText}>{t.verify_code}</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  )
}

// ─── Profile view (logged in) ──────────────────────────────────────────────────
function ProfileView({ th, t }: { th: any; t: any }) {
  const { themeKey, toggle } = useTheme()
  const { user, logout, setUser } = useAppStore()
  const [deletingAccount,  setDeletingAccount]  = useState(false)

  function handleDeleteAccount() {
    Alert.alert(
      t.delete_account,
      t.delete_account_confirm,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete_account,
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true)
            try {
              await deleteAccount()
              await logout()
            } catch {
              Alert.alert(t.booking_error)
            } finally {
              setDeletingAccount(false)
            }
          },
        },
      ]
    )
  }

  const [referralStats,     setReferralStats]     = useState<ReferralStats | null>(null)
  const [referralCopied,    setReferralCopied]    = useState(false)
  const [langPickerOpen,    setLangPickerOpen]    = useState(false)
  const [editProfileOpen,   setEditProfileOpen]   = useState(false)
  const [changePwdOpen,     setChangePwdOpen]     = useState(false)
  const [changeEmailOpen,   setChangeEmailOpen]   = useState(false)
  const [changePhoneOpen,   setChangePhoneOpen]   = useState(false)
  const [notificationsOn,   setNotificationsOn]   = useState(true)
  const [avatarUploading,   setAvatarUploading]   = useState(false)
  const [faqOpen,           setFaqOpen]           = useState(false)
  const [openFaqIdx,        setOpenFaqIdx]        = useState<number | null>(null)

  useEffect(() => {
    isEnabled().then(v => setNotificationsOn(v))
    getReferralStats().then(setReferralStats).catch(() => {})
  }, [])

  async function toggleNotifications(v: boolean) {
    setNotificationsOn(v)
    await setEnabled(v)
    if (v) requestPermissions()
  }

  async function handleAvatarTap() {
    Alert.alert('Profile Photo', undefined, [
      { text: 'Take Photo',            onPress: () => pickImage('camera')  },
      { text: 'Choose from Library',   onPress: () => pickImage('library') },
      { text: 'Remove Photo', style: 'destructive', onPress: async () => {
          try { const updated = await updateProfile({ avatarUrl: null }); setUser({ ...user!, ...updated }) } catch {}
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  async function pickImage(source: 'camera' | 'library') {
    try {
      const ImagePicker = await import('expo-image-picker').catch(() => null)
      if (!ImagePicker) { Alert.alert('Feature not available'); return }
      let result: any
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') { Alert.alert('Camera permission required'); return }
        result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 })
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== 'granted') { Alert.alert('Photo library permission required'); return }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'images', allowsEditing: true, aspect: [1, 1], quality: 0.7 })
      }
      if (result.canceled || !result.assets?.[0]?.uri) return
      setAvatarUploading(true)
      try {
        const url = await uploadAvatar(result.assets[0].uri)
        const updated = await updateProfile({ avatarUrl: url })
        setUser({ ...user!, ...updated })
      } catch (e: any) {
        Alert.alert('Upload failed', e.message ?? 'Try again')
      } finally {
        setAvatarUploading(false)
      }
    } catch {
      Alert.alert('Feature not available')
    }
  }

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'U'
    : 'U'

  const accentColor = themeKey === 'dark' ? colors.primaryAccent : colors.primary

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={pv.scroll}>

      {/* ── Avatar + name ── */}
      <View style={pv.avatarSection}>
        <TouchableOpacity onPress={handleAvatarTap} activeOpacity={0.8} style={pv.avatarWrap}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={[pv.avatar, { borderColor: th.border }]} />
          ) : (
            <View style={[pv.avatar, { backgroundColor: accentColor }]}>
              <Text style={pv.avatarText}>{initials}</Text>
            </View>
          )}
          {avatarUploading && (
            <View style={pv.avatarOverlay as any}>
              <ActivityIndicator color="#fff" size="small" />
            </View>
          )}
          <View style={[pv.avatarBadge, { backgroundColor: accentColor }]}>
            <Camera size={10} color="#fff" strokeWidth={2} />
          </View>
        </TouchableOpacity>
        <Text style={[pv.userName, { color: th.text }]}>
          {user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : t.user}
        </Text>
        <Text style={[pv.userEmail, { color: th.textSub }]}>{user?.email ?? ''}</Text>
      </View>

      {/* ── Settings ── */}
      <Text style={[pv.sectionLabel, { color: th.textMuted }]}>{t.settings.toUpperCase()}</Text>
      <View style={[pv.card, { backgroundColor: th.bgCard, borderColor: th.border }]}>
        <TouchableOpacity onPress={() => setLangPickerOpen(true)} style={[pv.row, { borderBottomColor: th.border }]} activeOpacity={0.7}>
          <View style={pv.rowLabel}>
            <Globe size={20} color={th.textSub} strokeWidth={1.75} />
            <Text style={[pv.rowLabelText, { color: th.text }]}>{t.language}</Text>
          </View>
          <ChevronRight size={16} color={th.textMuted} strokeWidth={1.75} />
        </TouchableOpacity>

        <TouchableOpacity onPress={toggle} style={[pv.row, { borderBottomColor: th.border }]} activeOpacity={0.7}>
          <View style={pv.rowLabel}>
            {themeKey === 'dark'
              ? <Moon size={20} color={th.textSub} strokeWidth={1.75} />
              : <Sun size={20} color={th.textSub} strokeWidth={1.75} />
            }
            <Text style={[pv.rowLabelText, { color: th.text }]}>{t.theme}</Text>
          </View>
          <Text style={[pv.rowValue, { color: th.textSub }]}>{themeKey === 'dark' ? t.dark : t.light}</Text>
        </TouchableOpacity>

        <View style={[pv.row, { borderBottomWidth: 0 }]}>
          <View style={pv.rowLabel}>
            <Bell size={20} color={th.textSub} strokeWidth={1.75} />
            <Text style={[pv.rowLabelText, { color: th.text }]}>{t.notifications}</Text>
          </View>
          <Switch value={notificationsOn} onValueChange={toggleNotifications} trackColor={{ false: th.border, true: accentColor }} thumbColor="#fff" />
        </View>
      </View>

      {/* ── Account ── */}
      <Text style={[pv.sectionLabel, { color: th.textMuted }]}>{t.account.toUpperCase()}</Text>
      <View style={[pv.card, { backgroundColor: th.bgCard, borderColor: th.border }]}>
        <TouchableOpacity
          onPress={() => { setChangePwdOpen(false); setEditProfileOpen(v => !v) }}
          style={[pv.row, { borderBottomColor: th.border }]}
          activeOpacity={0.7}
        >
          <View style={pv.rowLabel}>
            <Edit2 size={15} color={th.textSub} strokeWidth={1.75} />
            <Text style={[pv.rowLabelText, { color: th.text }]}>{t.edit_profile}</Text>
          </View>
          <ChevronRight size={16} color={th.textMuted} strokeWidth={1.75} />
        </TouchableOpacity>

        {editProfileOpen && (
          <View style={{ padding: 12, paddingTop: 0 }}>
            <EditProfileForm th={th} t={t} onClose={() => setEditProfileOpen(false)} />
          </View>
        )}

        <TouchableOpacity
          onPress={() => { setEditProfileOpen(false); setChangeEmailOpen(false); setChangePhoneOpen(false); setChangePwdOpen(v => !v) }}
          style={[pv.row, { borderBottomColor: th.border }]}
          activeOpacity={0.7}
        >
          <View style={pv.rowLabel}>
            <Lock size={15} color={th.textSub} strokeWidth={1.75} />
            <Text style={[pv.rowLabelText, { color: th.text }]}>{t.change_password}</Text>
          </View>
          <ChevronRight size={16} color={th.textMuted} strokeWidth={1.75} />
        </TouchableOpacity>

        {changePwdOpen && (
          <View style={{ padding: 12, paddingTop: 0 }}>
            <ChangePasswordForm th={th} t={t} onClose={() => setChangePwdOpen(false)} />
          </View>
        )}

        <TouchableOpacity
          onPress={() => { setEditProfileOpen(false); setChangePwdOpen(false); setChangePhoneOpen(false); setChangeEmailOpen(v => !v) }}
          style={[pv.row, { borderBottomColor: th.border }]}
          activeOpacity={0.7}
        >
          <View style={pv.rowLabel}>
            <Edit2 size={15} color={th.textSub} strokeWidth={1.75} />
            <Text style={[pv.rowLabelText, { color: th.text }]}>{t.change_email}</Text>
          </View>
          <ChevronRight size={16} color={th.textMuted} strokeWidth={1.75} />
        </TouchableOpacity>

        {changeEmailOpen && (
          <View style={{ padding: 12, paddingTop: 0 }}>
            <ChangeEmailForm th={th} t={t} onClose={() => setChangeEmailOpen(false)} />
          </View>
        )}

        <TouchableOpacity
          onPress={() => { setEditProfileOpen(false); setChangePwdOpen(false); setChangeEmailOpen(false); setChangePhoneOpen(v => !v) }}
          style={[pv.row, { borderBottomWidth: 0 }]}
          activeOpacity={0.7}
        >
          <View style={pv.rowLabel}>
            <Edit2 size={15} color={th.textSub} strokeWidth={1.75} />
            <Text style={[pv.rowLabelText, { color: th.text }]}>{t.change_phone}</Text>
          </View>
          <ChevronRight size={16} color={th.textMuted} strokeWidth={1.75} />
        </TouchableOpacity>

        {changePhoneOpen && (
          <View style={{ padding: 12, paddingTop: 0 }}>
            <ChangePhoneForm th={th} t={t} onClose={() => setChangePhoneOpen(false)} />
          </View>
        )}
      </View>

      {/* ── Invite Friends (Referral) ── */}
      <Text style={[pv.sectionLabel, { color: th.textMuted }]}>{(t.invite_friends as string).toUpperCase()}</Text>
      <View style={[pv.card, { backgroundColor: th.bgCard, borderColor: th.border }]}>
        {referralStats ? (
          <>
            {/* Code box */}
            <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: th.border }}>
              <Text style={[{ fontSize: 11, color: th.textMuted, marginBottom: 6 }]}>{t.your_referral_code as string}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1, backgroundColor: th.bgCardAlt, borderRadius: 8, borderWidth: 1, borderColor: th.border, paddingHorizontal: 12, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: th.text, letterSpacing: 2 }}>
                    {referralStats.referralCode}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      const Clipboard = await import('expo-clipboard').catch(() => null)
                      if (Clipboard) await Clipboard.setStringAsync(referralStats.referralCode)
                    } catch {}
                    setReferralCopied(true)
                    setTimeout(() => setReferralCopied(false), 2000)
                  }}
                  style={[{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: th.border, backgroundColor: th.bgCardAlt }]}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: referralCopied ? th.accent : th.textSub }}>
                    {referralCopied ? t.referral_copied as string : t.referral_copy as string}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => {
                  const { Share } = require('react-native')
                  Share.share({ message: `${t.referral_share as string}: ${referralStats.referralCode}` })
                }}
                style={{ marginTop: 10, paddingVertical: 12, borderRadius: 10, backgroundColor: th.accent, alignItems: 'center' }}
                activeOpacity={0.85}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{t.referral_share as string}</Text>
              </TouchableOpacity>
            </View>
            {/* Stats */}
            <View style={{ flexDirection: 'row', padding: 14, gap: 12 }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: th.text }}>{referralStats.totalReferrals}</Text>
                <Text style={{ fontSize: 11, color: th.textMuted, marginTop: 2 }}>{t.referral_count as string}</Text>
              </View>
              <View style={{ width: 1, backgroundColor: th.border }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: th.accent }}>{referralStats.completedReferrals}</Text>
                <Text style={{ fontSize: 11, color: th.textMuted, marginTop: 2 }}>Completed</Text>
              </View>
              <View style={{ width: 1, backgroundColor: th.border }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: th.text }}>{referralStats.pendingReferrals}</Text>
                <Text style={{ fontSize: 11, color: th.textMuted, marginTop: 2 }}>{t.referral_pending as string}</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={pv.row}>
            <Text style={[pv.rowLabelText, { color: th.textMuted }]}>{t.loading}</Text>
          </View>
        )}
      </View>

      {/* ── Help ── */}
      <Text style={[pv.sectionLabel, { color: th.textMuted }]}>{(t.help ?? 'ПОМОЩЬ').toUpperCase()}</Text>
      <View style={[pv.card, { backgroundColor: th.bgCard, borderColor: th.border }]}>
        {/* FAQ with accordion */}
        <TouchableOpacity
          onPress={() => setFaqOpen(v => !v)}
          style={[pv.row, { borderBottomColor: th.border }]}
          activeOpacity={0.7}
        >
          <View style={pv.rowLabel}>
            <HelpCircle size={15} color={th.textSub} strokeWidth={1.75} />
            <Text style={[pv.rowLabelText, { color: th.text }]}>{t.faq}</Text>
          </View>
          <ChevronDown size={16} color={th.textMuted} strokeWidth={1.75} style={{ transform: [{ rotate: faqOpen ? '180deg' : '0deg' }] }} />
        </TouchableOpacity>
        {faqOpen && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            {[
              { q: 'Как забронировать столик?', a: 'Выберите ресторан, дату, время и количество гостей. Нажмите Забронировать.' },
              { q: 'Как отменить бронь?', a: 'Откройте раздел Брони, найдите нужную бронь и нажмите Отменить.' },
              { q: 'В каких городах работает Dinto?', a: 'Сейчас Dinto доступен в Варшаве. Бухарест — скоро!' },
              { q: 'Бронирование бесплатное?', a: 'Да, бронирование через Dinto полностью бесплатно для гостей.' },
              { q: 'Как связаться с рестораном?', a: 'На странице ресторана нажмите на номер телефона.' },
            ].map((item, idx) => (
              <View key={idx} style={[pv.faqItem, { borderBottomColor: th.border, borderBottomWidth: idx < 4 ? 1 : 0 }]}>
                <TouchableOpacity
                  onPress={() => setOpenFaqIdx(openFaqIdx === idx ? null : idx)}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}
                  activeOpacity={0.7}
                >
                  <Text style={[pv.faqQ, { color: th.text, flex: 1, marginRight: 8 }]}>{item.q}</Text>
                  <ChevronDown size={14} color={th.textMuted} style={{ transform: [{ rotate: openFaqIdx === idx ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>
                {openFaqIdx === idx && (
                  <Text style={[pv.faqA, { color: th.textSub }]}>{item.a}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Contact */}
        <TouchableOpacity
          onPress={() => Linking.openURL('mailto:support@dinto.app')}
          style={[pv.row, { borderBottomColor: th.border }]}
          activeOpacity={0.7}
        >
          <View style={pv.rowLabel}>
            <MessageCircle size={15} color={th.textSub} strokeWidth={1.75} />
            <Text style={[pv.rowLabelText, { color: th.text }]}>{t.contact_us}</Text>
          </View>
          <ChevronRight size={16} color={th.textMuted} strokeWidth={1.75} />
        </TouchableOpacity>

        {/* Terms */}
        <TouchableOpacity
          onPress={() => Alert.alert(t.terms, 'Условия использования будут опубликованы до запуска приложения.')}
          style={[pv.row, { borderBottomWidth: 0 }]}
          activeOpacity={0.7}
        >
          <View style={pv.rowLabel}>
            <FileText size={15} color={th.textSub} strokeWidth={1.75} />
            <Text style={[pv.rowLabelText, { color: th.text }]}>{t.terms}</Text>
          </View>
          <ChevronRight size={16} color={th.textMuted} strokeWidth={1.75} />
        </TouchableOpacity>
      </View>

      {/* ── Log out (grey, neutral) ── */}
      <TouchableOpacity
        onPress={() => logout()}
        activeOpacity={0.8}
        style={[pv.logoutBtn, { backgroundColor: th.bgCard, borderColor: '#D1D5DB' }]}
      >
        <LogOut size={16} color={th.textSub} strokeWidth={1.75} />
        <Text style={[pv.logoutText, { color: th.textSub }]}>{t.logout}</Text>
      </TouchableOpacity>

      {/* ── Delete account — subtle link ── */}
      <TouchableOpacity
        onPress={handleDeleteAccount}
        disabled={deletingAccount}
        activeOpacity={0.6}
        style={pv.deleteLink}
      >
        {deletingAccount
          ? <ActivityIndicator size="small" color={th.textMuted} />
          : <Text style={[pv.deleteLinkTxt, { color: th.textMuted }]}>{t.delete_account}</Text>
        }
      </TouchableOpacity>

      <Text style={[pv.versionText, { color: th.textMuted }]}>{t.app_version} 1.0.0</Text>

      <View style={{ height: 40 }} />

      <LanguagePickerModal visible={langPickerOpen} onClose={() => setLangPickerOpen(false)} />
    </ScrollView>
  )
}

const pv = StyleSheet.create({
  scroll:        { paddingHorizontal: 16, paddingTop: 20 },

  // Avatar section — centred
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarWrap:    { position: 'relative', width: 80, height: 80, marginBottom: 12 },
  avatar:        { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarOverlay: { position: 'absolute', inset: 0, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  avatarBadge:   { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarText:    { color: '#fff', fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold' },
  userName:      { fontSize: 20, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 3 },
  userEmail:     { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular' },

  // Sections
  sectionLabel:  { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 4 },
  card:          { borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  row:           { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon:       { fontSize: 16, width: 20, textAlign: 'center' },
  rowLabelText:  { fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium' },
  rowValue:      { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular' },

  // Log out — grey button
  logoutBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: radii.md, borderWidth: 1.5, marginBottom: 16 },
  logoutText:    { fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold' },

  // Delete — subtle text link
  deleteLink:    { alignItems: 'center', paddingVertical: 8, marginBottom: 8 },
  deleteLinkTxt: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', textDecorationLine: 'underline' },

  versionText:   { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center', marginTop: 4, opacity: 0.5 },

  // FAQ
  faqItem: { paddingHorizontal: 0 },
  faqQ:    { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium' },
  faqA:    { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', paddingBottom: 10, lineHeight: 20 },
})

// ─── Screen export ─────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { th }    = useTheme()
  const { t }     = useLang()
  const { token } = useAppStore()

  return (
    <SafeAreaView style={[ps.safe, { backgroundColor: th.bg }]} edges={['top']}>
      <Text style={[ps.pageTitle, { color: th.text }]}>{t.profile}</Text>
      {token
        ? <ProfileView th={th} t={t} />
        : <AuthForm th={th} t={t} />
      }
    </SafeAreaView>
  )
}

const ps = StyleSheet.create({
  safe:      { flex: 1 },
  pageTitle: { fontSize: 28, fontFamily: 'DMSerifDisplay_400Regular', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
})
