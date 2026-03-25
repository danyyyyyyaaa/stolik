'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare, Bell, Clock, CheckCircle,
  AlertCircle, Info, RefreshCw,
} from 'lucide-react'
import clsx from 'clsx'
import { useT } from '@/lib/i18n'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

// ─── Types ────────────────────────────────────────────────────────────────────

type SmsSettings = {
  smsConfirmation: boolean
  smsReminder24h:  boolean
  smsReminder2h:   boolean
  customSmsText:   string
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({
  checked, onChange, disabled = false,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={clsx(
        'relative w-11 h-6 rounded-full transition-colors focus:outline-none shrink-0',
        checked ? 'bg-accent' : 'bg-surface-2 border border-border',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className={clsx(
        'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
        checked ? 'translate-x-5' : 'translate-x-0.5'
      )} />
    </button>
  )
}

// ─── Setting row ──────────────────────────────────────────────────────────────

function SettingRow({
  icon: Icon, iconColor, title, description, checked, onChange, disabled,
}: {
  icon:        React.ElementType
  iconColor:   string
  title:       string
  description: string
  checked:     boolean
  onChange:    (v: boolean) => void
  disabled?:   boolean
}) {
  return (
    <div className={clsx(
      'flex items-center justify-between gap-4 px-5 py-4 rounded-xl border transition-colors',
      checked ? 'bg-accent/5 border-accent/20' : 'bg-surface border-border hover:border-muted/40'
    )}>
      <div className="flex items-start gap-3.5 min-w-0">
        <div className={clsx('p-2 rounded-lg shrink-0 mt-0.5', iconColor)}>
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text">{title}</p>
          <p className="text-xs text-muted mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, ok, onHide }: { msg: string; ok: boolean; onHide: () => void }) {
  useEffect(() => {
    const id = setTimeout(onHide, 3500)
    return () => clearTimeout(id)
  }, [onHide])

  return (
    <div className={clsx(
      'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl border transition-all',
      ok
        ? 'bg-accent/95 text-white border-accent/30'
        : 'bg-surface border-red-500/30 text-red-400'
    )}>
      {ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {msg}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const SMS_VARS = ['{name}', '{time}', '{date}', '{restaurant}', '{bookingRef}']

export default function SettingsPage() {
  const router = useRouter()
  const t      = useT()

  const [token,        setToken]        = useState<string | null>(null)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null)
  const [charCount,    setCharCount]    = useState(0)

  const [settings, setSettings] = useState<SmsSettings>({
    smsConfirmation: true,
    smsReminder24h:  true,
    smsReminder2h:   false,
    customSmsText:   '',
  })

  // ── auth + load ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const tok = localStorage.getItem('stolik_token')
    if (!tok) { router.push('/login'); return }
    setToken(tok)

    const stored = localStorage.getItem('stolik_active_restaurant') || localStorage.getItem('stolik_restaurant')
    if (!stored) { setLoading(false); return }

    let rid: string | null = null
    try { rid = JSON.parse(stored)?.id } catch {}
    if (!rid) { setLoading(false); return }
    setRestaurantId(rid)

    fetch(`${API}/api/restaurants/${rid}`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data?.settings) {
          const s = data.settings
          setSettings({
            smsConfirmation: s.smsConfirmation ?? true,
            smsReminder24h:  s.smsReminder24h  ?? true,
            smsReminder2h:   s.smsReminder2h   ?? false,
            customSmsText:   s.customSmsText   ?? '',
          })
          setCharCount((s.customSmsText ?? '').length)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  // ── save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!token || !restaurantId) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/restaurants/${restaurantId}`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ settings }),
      })
      if (!res.ok) throw new Error()
      setToast({ msg: t.smsSaved, ok: true })
    } catch {
      setToast({ msg: t.smsSaveError, ok: false })
    } finally {
      setSaving(false)
    }
  }

  function set<K extends keyof SmsSettings>(key: K, value: SmsSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  // ── skeleton ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col min-h-full">
        <header className="shrink-0 border-b border-border bg-surface px-8 py-5">
          <div className="w-32 h-6 bg-surface-2 rounded-md animate-pulse" />
          <div className="w-48 h-4 bg-surface-2/70 rounded-md animate-pulse mt-2" />
        </header>
        <div className="flex-1 px-8 py-7 space-y-4 max-w-2xl">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-surface border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const anyEnabled = settings.smsConfirmation || settings.smsReminder24h || settings.smsReminder2h

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-border bg-surface px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-text">{t.smsSettings}</h1>
          <p className="text-sm text-muted mt-0.5">{t.smsSettingsSub}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {saving ? (
            <><RefreshCw size={14} className="animate-spin" /> {t.saving}</>
          ) : (
            <>{t.save}</>
          )}
        </button>
      </header>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-8 py-7 max-w-2xl space-y-8">

        {/* SMS toggles */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={16} className="text-accent" />
            <h2 className="text-sm font-bold text-text uppercase tracking-wider">{t.smsNotifSection}</h2>
          </div>

          <div className="space-y-3">
            <SettingRow
              icon={CheckCircle}
              iconColor="text-green-400 bg-green-400/10"
              title={t.smsConfirmTitle}
              description={t.smsConfirmDesc}
              checked={settings.smsConfirmation}
              onChange={v => set('smsConfirmation', v)}
            />
            <SettingRow
              icon={Bell}
              iconColor="text-blue-400 bg-blue-400/10"
              title={t.smsReminder24Title}
              description={t.smsReminder24Desc}
              checked={settings.smsReminder24h}
              onChange={v => set('smsReminder24h', v)}
            />
            <SettingRow
              icon={Clock}
              iconColor="text-yellow-400 bg-yellow-400/10"
              title={t.smsReminder2Title}
              description={t.smsReminder2Desc}
              checked={settings.smsReminder2h}
              onChange={v => set('smsReminder2h', v)}
            />
          </div>
        </section>

        {/* Custom SMS text */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={16} className="text-accent" />
            <h2 className="text-sm font-bold text-text uppercase tracking-wider">{t.smsMsgSection}</h2>
          </div>

          <div className={clsx(
            'bg-surface border border-border rounded-xl overflow-hidden transition-opacity',
            !anyEnabled && 'opacity-50 pointer-events-none'
          )}>
            <div className="px-5 py-4 border-b border-border bg-surface-2/30">
              <p className="text-sm font-semibold text-text">{t.smsCustomLabel}</p>
              <p className="text-xs text-muted mt-0.5">{t.smsCustomHint}</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Variables hint */}
              <div className="flex items-start gap-2.5 p-3.5 bg-surface-2 border border-border rounded-lg">
                <Info size={14} className="text-muted shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-text mb-2">{t.smsVarsTitle}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SMS_VARS.map(v => (
                      <code
                        key={v}
                        onClick={() => {
                          set('customSmsText', settings.customSmsText + v)
                          setCharCount((settings.customSmsText + v).length)
                        }}
                        className="text-xs px-2 py-0.5 bg-surface border border-border rounded font-mono text-accent cursor-pointer hover:border-accent/40 transition-colors"
                        title={t.smsVarsTitle}
                      >
                        {v}
                      </code>
                    ))}
                  </div>
                </div>
              </div>

              {/* Textarea */}
              <div>
                <textarea
                  value={settings.customSmsText}
                  onChange={e => {
                    set('customSmsText', e.target.value)
                    setCharCount(e.target.value.length)
                  }}
                  rows={4}
                  maxLength={320}
                  placeholder={t.smsDefaultText}
                  className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-sm text-text placeholder-muted focus:outline-none focus:border-accent transition-colors resize-none font-mono"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-xs text-muted">
                    {charCount === 0 && <span className="text-accent">{t.smsUsingDefault}</span>}
                  </p>
                  <p className={clsx('text-xs tabular-nums', charCount > 280 ? 'text-red-400' : 'text-muted')}>
                    {charCount} / 320
                  </p>
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 bg-surface-2 border border-border rounded-lg">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">{t.smsPreview}</p>
                <p className="text-sm text-text leading-relaxed font-mono">
                  {(settings.customSmsText || t.smsDefaultText)
                    .replace('{name}', 'Anna Kowalska')
                    .replace('{time}', '19:00')
                    .replace('{date}', 'wt. 25 mar')
                    .replace('{restaurant}', 'Restauracja')
                    .replace('{bookingRef}', 'STK-1234')}
                </p>
              </div>
            </div>
          </div>

          {!anyEnabled && (
            <p className="text-xs text-muted mt-2 flex items-center gap-1.5">
              <Info size={12} />
              {t.smsEnableHint}
            </p>
          )}
        </section>

        {/* Save button bottom */}
        <div className="pt-2 pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {saving ? (
              <><RefreshCw size={14} className="animate-spin" /> {t.saving}</>
            ) : (
              t.save
            )}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onHide={() => setToast(null)} />
      )}
    </div>
  )
}
