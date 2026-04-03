'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Camera, Globe, Instagram, Phone, MapPin, Utensils,
  FileText, CheckCircle, AlertCircle, RefreshCw,
} from 'lucide-react'
import clsx from 'clsx'
import { useT } from '@/lib/i18n'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

// ─── Types ────────────────────────────────────────────────────────────────────

type DayHours = { open: string; close: string; closed: boolean }
type Hours = Record<string, DayHours>

type RestaurantProfile = {
  name:          string
  description:   string
  cuisine:       string
  city:          string
  district:      string
  address:       string
  phone:         string
  website:       string
  instagram:     string
  emoji:         string
  hours:         Hours
  googlePlaceId: string
}

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
type DayKey = typeof DAY_KEYS[number]

const DAY_T_KEYS: Record<DayKey, 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'> = {
  monday: 'mon', tuesday: 'tue', wednesday: 'wed', thursday: 'thu',
  friday: 'fri', saturday: 'sat', sunday: 'sun',
}

const CUISINE_VALUES: { value: string; tKey: string }[] = [
  { value: 'polska',          tKey: 'cuisinePolish'        },
  { value: 'włoska',          tKey: 'cuisineItalian'       },
  { value: 'japońska',        tKey: 'cuisineJapanese'      },
  { value: 'francuska',       tKey: 'cuisineFrench'        },
  { value: 'meksykańska',     tKey: 'cuisineMexican'       },
  { value: 'indyjska',        tKey: 'cuisineIndian'        },
  { value: 'chińska',         tKey: 'cuisineChinese'       },
  { value: 'śródziemnomorska',tKey: 'cuisineMediterranean' },
  { value: 'amerykańska',     tKey: 'cuisineAmerican'      },
  { value: 'inne',            tKey: 'cuisineOther'         },
]

const EMOJIS = ['🍽️', '🍕', '🍣', '🥩', '🍜', '🥗', '🍷', '🍺', '☕', '🧁']

function defaultHours(): Hours {
  return Object.fromEntries(
    DAY_KEYS.map(d => [d, { open: '12:00', close: '22:00', closed: false }])
  )
}

// ─── Input component ──────────────────────────────────────────────────────────

function Field({
  label, icon: Icon, children,
}: {
  label: string
  icon?: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wider">
        {Icon && <Icon size={11} />}
        {label}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full bg-surface-2 border border-border rounded-lg px-3.5 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent transition-colors'

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, ok, onHide }: { msg: string; ok: boolean; onHide: () => void }) {
  useEffect(() => {
    const id = setTimeout(onHide, 3500)
    return () => clearTimeout(id)
  }, [onHide])

  return (
    <div className={clsx(
      'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl border',
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

export default function ProfilePage() {
  const router     = useRouter()
  const t          = useT()
  const fileRef    = useRef<HTMLInputElement>(null)

  const [token,        setToken]        = useState<string | null>(null)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [activeTab,    setActiveTab]    = useState<'info' | 'hours'>('info')

  const [form, setForm] = useState<RestaurantProfile>({
    name:          '',
    description:   '',
    cuisine:       'polska',
    city:          '',
    district:      '',
    address:       '',
    phone:         '',
    website:       '',
    instagram:     '',
    emoji:         '🍽️',
    hours:         defaultHours(),
    googlePlaceId: '',
  })

  // ── auth + load ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const tok = localStorage.getItem('stolik_token')
    if (!tok) { router.push('/login'); return }
    setToken(tok)

    const stored = localStorage.getItem('stolik_active_restaurant') || localStorage.getItem('stolik_restaurant')
    let rid: string | null = null
    if (stored) { try { rid = JSON.parse(stored)?.id } catch {} }
    if (!rid) { setLoading(false); return }
    setRestaurantId(rid)

    fetch(`${API}/api/restaurants/${rid}`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
      .then(r => r.json())
      .then(data => {
        setForm({
          name:          data.name          ?? '',
          description:   data.description   ?? '',
          cuisine:       data.cuisine       ?? 'polska',
          city:          data.city          ?? '',
          district:      data.district      ?? '',
          address:       data.address       ?? '',
          phone:         data.phone         ?? '',
          website:       data.website       ?? '',
          instagram:     data.instagram     ?? '',
          emoji:         data.emoji         ?? '🍽️',
          hours:         data.settings?.hours ?? defaultHours(),
          googlePlaceId: data.googlePlaceId ?? '',
        })
        if (data.coverPhoto) setCoverPreview(data.coverPhoto)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  // ── helpers ──────────────────────────────────────────────────────────────────
  function setField<K extends keyof RestaurantProfile>(key: K, value: RestaurantProfile[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function updateDay(day: string, field: keyof DayHours, value: string | boolean) {
    setForm(prev => ({
      ...prev,
      hours: { ...prev.hours, [day]: { ...prev.hours[day], [field]: value } },
    }))
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setCoverPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  // ── save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!token || !restaurantId) return
    setSaving(true)
    try {
      const payload = {
        name:          form.name.trim(),
        description:   form.description.trim(),
        cuisine:       form.cuisine,
        city:          form.city.trim(),
        district:      form.district.trim(),
        address:       form.address.trim(),
        phone:         form.phone.trim(),
        website:       form.website.trim(),
        instagram:     form.instagram.trim(),
        emoji:         form.emoji,
        settings:      { hours: form.hours },
        googlePlaceId: form.googlePlaceId.trim(),
      }

      const res = await fetch(`${API}/api/restaurants/${restaurantId}`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()

      // Update localStorage
      const stored = localStorage.getItem('stolik_active_restaurant') || localStorage.getItem('stolik_restaurant')
      if (stored) {
        try {
          const updated = JSON.stringify({ ...JSON.parse(stored), ...payload })
          localStorage.setItem('stolik_active_restaurant', updated)
          localStorage.setItem('stolik_restaurant', updated)
        } catch {}
      }

      setToast({ msg: t.profileSaved, ok: true })
    } catch {
      setToast({ msg: t.profileSaveError, ok: false })
    } finally {
      setSaving(false)
    }
  }

  // ── skeleton ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col min-h-full">
        <header className="shrink-0 border-b border-border bg-surface px-8 py-5">
          <div className="w-40 h-6 bg-surface-2 rounded-md animate-pulse" />
          <div className="w-56 h-4 bg-surface-2/70 rounded-md animate-pulse mt-2" />
        </header>
        <div className="flex-1 px-8 py-7 max-w-3xl space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-14 bg-surface border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-border bg-surface px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-text">{t.profile}</h1>
          <p className="text-sm text-muted mt-0.5">{t.profileSub}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {saving ? (
            <><RefreshCw size={14} className="animate-spin" /> {t.saving}</>
          ) : t.save}
        </button>
      </header>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border bg-surface px-8">
        <div className="flex gap-0.5">
          {([
            { key: 'info',  label: t.tabInfo  },
            { key: 'hours', label: t.tabHours },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px',
                activeTab === tab.key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-text'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-8 py-7 max-w-3xl">

        {/* ── Tab: Info ──────────────────────────────────────────────────────*/}
        {activeTab === 'info' && (
          <div className="space-y-8">

            {/* Cover photo */}
            <section>
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">{t.coverPhoto}</h2>
              <div className="flex items-center gap-5">
                <div
                  className="w-28 h-28 rounded-2xl border-2 border-dashed border-border bg-surface-2 flex items-center justify-center overflow-hidden cursor-pointer hover:border-accent/50 transition-colors group relative"
                  onClick={() => fileRef.current?.click()}
                >
                  {coverPreview ? (
                    <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted group-hover:text-accent transition-colors">
                      <Camera size={24} />
                      <span className="text-xs font-medium text-center leading-tight">{t.addPhoto}</span>
                    </div>
                  )}
                  {coverPreview && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera size={20} className="text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-surface-2 border border-border rounded-lg text-sm text-text hover:border-muted/50 transition-colors font-medium"
                  >
                    <Camera size={14} />
                    {coverPreview ? t.changePhoto : t.uploadPhoto}
                  </button>
                  <p className="text-xs text-muted mt-2">{t.photoHint}</p>
                  {coverPreview && (
                    <button
                      type="button"
                      onClick={() => { setCoverPreview(null); if (fileRef.current) fileRef.current.value = '' }}
                      className="text-xs text-red-400 hover:text-red-300 mt-1.5 transition-colors"
                    >
                      {t.removePhoto}
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverChange}
                />
              </div>
            </section>

            {/* Basic info */}
            <section className="space-y-4">
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider">{t.basicInfo}</h2>

              {/* Emoji picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">{t.restaurantIcon}</label>
                <div className="flex gap-2 flex-wrap">
                  {EMOJIS.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setField('emoji', e)}
                      className={clsx(
                        'text-xl w-10 h-10 rounded-lg flex items-center justify-center border transition-all',
                        form.emoji === e
                          ? 'border-accent bg-accent/10 scale-110'
                          : 'border-border bg-surface-2 hover:border-muted/50'
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <Field label={t.restaurantNameLabel} icon={Utensils}>
                <input
                  type="text" required value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="Restauracja Pod Lipami"
                  className={inputCls}
                />
              </Field>

              <Field label={t.descriptionLabel} icon={FileText}>
                <textarea
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  placeholder={t.descPlaceholder}
                  rows={3}
                  maxLength={500}
                  className={`${inputCls} resize-none`}
                />
                <p className="text-xs text-muted text-right mt-1">{form.description.length} / 500</p>
              </Field>

              <Field label={t.cuisineLabel}>
                <select
                  value={form.cuisine}
                  onChange={e => setField('cuisine', e.target.value)}
                  className={inputCls}
                >
                  {CUISINE_VALUES.map(({ value, tKey }) => (
                    <option key={value} value={value}>{(t as any)[tKey]}</option>
                  ))}
                </select>
              </Field>
            </section>

            {/* Location */}
            <section className="space-y-4">
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider">{t.locationSection}</h2>

              <div className="grid grid-cols-2 gap-4">
                <Field label={t.cityLabel} icon={MapPin}>
                  <input type="text" value={form.city} onChange={e => setField('city', e.target.value)}
                    placeholder="Warszawa" className={inputCls} />
                </Field>
                <Field label={t.districtLabel}>
                  <input type="text" value={form.district} onChange={e => setField('district', e.target.value)}
                    placeholder="Śródmieście" className={inputCls} />
                </Field>
              </div>

              <Field label={t.addressLabel}>
                <input type="text" value={form.address} onChange={e => setField('address', e.target.value)}
                  placeholder="ul. Nowy Świat 12" className={inputCls} />
              </Field>

              <Field label={t.phone} icon={Phone}>
                <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)}
                  placeholder="+48 500 123 456" className={inputCls} />
              </Field>
            </section>

            {/* Online presence */}
            <section className="space-y-4">
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider">{t.onlineSection}</h2>

              <Field label={t.websiteLabel} icon={Globe}>
                <div className="relative">
                  <input
                    type="url" value={form.website}
                    onChange={e => setField('website', e.target.value)}
                    placeholder="https://restauracja.pl"
                    className={inputCls}
                  />
                </div>
              </Field>

              <Field label="Instagram" icon={Instagram}>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">@</span>
                  <input
                    type="text" value={form.instagram}
                    onChange={e => setField('instagram', e.target.value.replace(/^@/, ''))}
                    placeholder="restauracja.pl"
                    className={`${inputCls} pl-8`}
                  />
                </div>
              </Field>

              <Field label="Google Place ID">
                <input
                  type="text" value={form.googlePlaceId}
                  onChange={e => setField('googlePlaceId', e.target.value)}
                  placeholder="ChIJ..."
                  className={inputCls}
                />
                <p className="text-xs text-muted mt-1">
                  Find your Place ID at{' '}
                  <a
                    href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    Google Place ID Finder
                  </a>
                  . Used to display Google reviews and ratings.
                </p>
              </Field>
            </section>

          </div>
        )}

        {/* ── Tab: Hours ─────────────────────────────────────────────────────*/}
        {activeTab === 'hours' && (
          <div className="space-y-3">
            <p className="text-sm text-muted mb-5">{t.hoursHint}</p>

            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-surface-2/40 grid grid-cols-[140px_1fr_auto] gap-4">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">{t.dayCol}</span>
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">{t.hoursCol}</span>
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">{t.status}</span>
              </div>

              <div className="divide-y divide-border">
                {DAY_KEYS.map(d => {
                  const day = form.hours[d] ?? { open: '12:00', close: '22:00', closed: false }
                  return (
                    <div
                      key={d}
                      className={clsx(
                        'grid grid-cols-[140px_1fr_auto] gap-4 items-center px-5 py-3.5 transition-colors',
                        day.closed ? 'opacity-60' : ''
                      )}
                    >
                      <span className="text-sm font-medium text-text">{t[DAY_T_KEYS[d]]}</span>

                      {day.closed ? (
                        <span className="text-sm text-muted italic">{t.closedDay}</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="time" value={day.open}
                            onChange={e => updateDay(d, 'open', e.target.value)}
                            className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent transition-colors [color-scheme:dark]"
                          />
                          <span className="text-muted text-xs font-medium">→</span>
                          <input
                            type="time" value={day.close}
                            onChange={e => updateDay(d, 'close', e.target.value)}
                            className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent transition-colors [color-scheme:dark]"
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => updateDay(d, 'closed', !day.closed)}
                        className={clsx(
                          'text-xs px-3 py-1.5 rounded-lg border font-semibold transition-colors whitespace-nowrap',
                          day.closed
                            ? 'border-accent/40 text-accent bg-accent/8 hover:bg-accent/15'
                            : 'border-border text-muted hover:text-text hover:border-muted/50'
                        )}
                      >
                        {day.closed ? t.openDay : t.closeDay}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => DAY_KEYS.forEach(d => updateDay(d, 'closed', false))}
                className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted hover:text-text hover:border-muted/50 transition-colors"
              >
                {t.openAllDays}
              </button>
              <button
                type="button"
                onClick={() => ['saturday', 'sunday'].forEach(d => updateDay(d, 'closed', true))}
                className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted hover:text-text hover:border-muted/50 transition-colors"
              >
                {t.closeWeekend}
              </button>
            </div>
          </div>
        )}

        {/* Bottom save */}
        <div className="pt-6 pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {saving ? (
              <><RefreshCw size={14} className="animate-spin" /> {t.saving}</>
            ) : t.save}
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
