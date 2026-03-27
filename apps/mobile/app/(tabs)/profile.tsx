import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTheme } from '../../src/theme'
import { useLang } from '../../src/i18n'
import { useAppStore } from '../../src/store/useAppStore'
import { login, register } from '../../src/api/auth'
import LanguagePickerModal from '../../src/components/LanguagePickerModal'
import { isEnabled, setEnabled, requestPermissions } from '../../src/notifications'

type AuthMode = 'login' | 'register'

// ─── Login / Register form ─────────────────────────────────────────────────────
function AuthForm({ th, t }: { th: any; t: any }) {
  const { setToken, setUser, pendingBooking, setPendingBooking } = useAppStore()
  const [mode,      setMode]      = useState<AuthMode>('login')
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) { setError(t.fill_fields); return }
    setLoading(true)
    setError('')
    try {
      const res = mode === 'login'
        ? await login(email.trim(), password)
        : await register(firstName.trim(), lastName.trim(), email.trim(), password)
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
            Stol<Text style={{ fontStyle: 'italic', color: th.accent }}>ik</Text>
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
  const [phone,     setPhone]     = useState('')

  function handleSave() {
    if (!firstName.trim() || !lastName.trim()) return
    setUser({ ...(user as any), firstName: firstName.trim(), lastName: lastName.trim() })
    onClose()
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
      <View style={epf.btnRow}>
        <TouchableOpacity onPress={onClose} style={[epf.cancelBtn, { borderColor: th.border }]}>
          <Text style={[epf.cancelText, { color: th.textSub }]}>{t.cancel}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave} style={[epf.saveBtn, { backgroundColor: th.accent }]}>
          <Text style={epf.saveText}>{t.save}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const epf = StyleSheet.create({
  wrap:       { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  label:      { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 12 },
  input:      { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, marginBottom: 10 },
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
    setLoading(true)
    setError('')
    try {
      // Placeholder: real API call would go here
      await new Promise(r => setTimeout(r, 600))
      setDone(true)
      setTimeout(onClose, 1200)
    } catch (e: any) {
      setError(e.message ?? t.booking_error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={[epf.wrap, { backgroundColor: th.bgCard, borderColor: th.border }]}>
      <Text style={[epf.label, { color: th.textMuted }]}>{t.change_password.toUpperCase()}</Text>
      {done ? (
        <Text style={{ color: th.success, textAlign: 'center', paddingVertical: 8 }}>✓ {t.saved}</Text>
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

// ─── Profile view (logged in) ──────────────────────────────────────────────────
function ProfileView({ th, t }: { th: any; t: any }) {
  const { themeKey, toggle } = useTheme()
  const { user, logout }     = useAppStore()

  const [langPickerOpen,    setLangPickerOpen]    = useState(false)
  const [editProfileOpen,   setEditProfileOpen]   = useState(false)
  const [changePwdOpen,     setChangePwdOpen]     = useState(false)
  const [notificationsOn,   setNotificationsOn]   = useState(true)

  // Load persisted notification preference on mount
  useEffect(() => {
    isEnabled().then(v => setNotificationsOn(v))
  }, [])

  async function toggleNotifications(v: boolean) {
    setNotificationsOn(v)
    await setEnabled(v)
    // Re-request permissions when user enables notifications
    if (v) requestPermissions()
  }

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'U'
    : 'U'

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={pv.scroll}>

      {/* Avatar + info */}
      <View style={pv.userRow}>
        <View style={[pv.avatar, { backgroundColor: th.accent }]}>
          <Text style={pv.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[pv.userName, { color: th.text }]}>
            {user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : t.user}
          </Text>
          <Text style={[pv.userEmail, { color: th.textSub }]}>{user?.email ?? ''}</Text>
        </View>
      </View>

      {/* Settings section */}
      <Text style={[pv.sectionLabel, { color: th.textMuted }]}>{t.settings.toUpperCase()}</Text>
      <View style={[pv.card, { backgroundColor: th.bgCard, borderColor: th.border }]}>

        {/* Language */}
        <TouchableOpacity
          onPress={() => setLangPickerOpen(true)}
          style={[pv.row, { borderBottomColor: th.border }]}
          activeOpacity={0.7}
        >
          <View style={pv.rowLabel}>
            <Text style={{ fontSize: 16 }}>🌐</Text>
            <Text style={[pv.rowLabelText, { color: th.text }]}>{t.language}</Text>
          </View>
          <Feather name="chevron-right" size={16} color={th.textMuted} />
        </TouchableOpacity>

        {/* Theme */}
        <TouchableOpacity
          onPress={toggle}
          style={[pv.row, { borderBottomColor: th.border }]}
          activeOpacity={0.7}
        >
          <View style={pv.rowLabel}>
            <Text style={{ fontSize: 16 }}>{themeKey === 'dark' ? '🌙' : '☀️'}</Text>
            <Text style={[pv.rowLabelText, { color: th.text }]}>{t.theme}</Text>
          </View>
          <Text style={[pv.rowValue, { color: th.textSub }]}>
            {themeKey === 'dark' ? t.dark : t.light}
          </Text>
        </TouchableOpacity>

        {/* Notifications */}
        <View style={[pv.row, { borderBottomWidth: 0 }]}>
          <View style={pv.rowLabel}>
            <Text style={{ fontSize: 16 }}>🔔</Text>
            <Text style={[pv.rowLabelText, { color: th.text }]}>{t.notifications}</Text>
          </View>
          <Switch
            value={notificationsOn}
            onValueChange={toggleNotifications}
            trackColor={{ false: th.border, true: th.accent }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Account section */}
      <Text style={[pv.sectionLabel, { color: th.textMuted }]}>{t.account.toUpperCase()}</Text>
      <View style={[pv.card, { backgroundColor: th.bgCard, borderColor: th.border }]}>
        <TouchableOpacity
          onPress={() => { setChangePwdOpen(false); setEditProfileOpen(v => !v) }}
          style={[pv.row, { borderBottomColor: th.border }]}
          activeOpacity={0.7}
        >
          <View style={pv.rowLabel}>
            <Feather name="edit-2" size={15} color={th.textSub} />
            <Text style={[pv.rowLabelText, { color: th.text }]}>{t.edit_profile}</Text>
          </View>
          <Feather name={editProfileOpen ? 'chevron-up' : 'chevron-right'} size={16} color={th.textMuted} />
        </TouchableOpacity>

        {editProfileOpen && (
          <View style={{ padding: 12, paddingTop: 0 }}>
            <EditProfileForm th={th} t={t} onClose={() => setEditProfileOpen(false)} />
          </View>
        )}

        <TouchableOpacity
          onPress={() => { setEditProfileOpen(false); setChangePwdOpen(v => !v) }}
          style={[pv.row, { borderBottomWidth: 0 }]}
          activeOpacity={0.7}
        >
          <View style={pv.rowLabel}>
            <Feather name="lock" size={15} color={th.textSub} />
            <Text style={[pv.rowLabelText, { color: th.text }]}>{t.change_password}</Text>
          </View>
          <Feather name={changePwdOpen ? 'chevron-up' : 'chevron-right'} size={16} color={th.textMuted} />
        </TouchableOpacity>

        {changePwdOpen && (
          <View style={{ padding: 12, paddingTop: 0 }}>
            <ChangePasswordForm th={th} t={t} onClose={() => setChangePwdOpen(false)} />
          </View>
        )}
      </View>

      {/* Danger zone */}
      <TouchableOpacity
        onPress={() => logout()}
        activeOpacity={0.8}
        style={[pv.logoutBtn, { backgroundColor: th.bgCard, borderColor: th.error + '50' }]}
      >
        <Feather name="log-out" size={16} color={th.error} />
        <Text style={[pv.logoutText, { color: th.error }]}>{t.logout}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      <LanguagePickerModal visible={langPickerOpen} onClose={() => setLangPickerOpen(false)} />
    </ScrollView>
  )
}

const pv = StyleSheet.create({
  scroll:        { paddingHorizontal: 16, paddingTop: 20 },
  userRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28, paddingHorizontal: 4 },
  avatar:        { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { color: '#fff', fontSize: 24, fontWeight: '700' },
  userName:      { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  userEmail:     { fontSize: 13 },
  sectionLabel:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 4 },
  card:          { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  row:           { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabelText:  { fontSize: 15, fontWeight: '500' },
  rowValue:      { fontSize: 13 },
  logoutBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 12, borderWidth: 1.5 },
  logoutText:    { fontSize: 15, fontWeight: '600' },
})

// ─── Screen export ─────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { th }  = useTheme()
  const { t }   = useLang()
  const { token } = useAppStore()

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: th.bg }]} edges={['top']}>
      <Text style={[styles.pageTitle, { color: th.text }]}>{t.profile}</Text>
      {token
        ? <ProfileView th={th} t={t} />
        : <AuthForm th={th} t={t} />
      }
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  pageTitle: { fontSize: 24, fontWeight: '800', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
})
