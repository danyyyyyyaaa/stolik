'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Utensils, Check, Upload, X } from 'lucide-react'
import { useT } from '@/lib/i18n'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
type DayKey = (typeof DAY_KEYS)[number]

const CUISINE_VALUES = [
  { value: 'polska',            tKey: 'cuisinePolish',        emoji: '🥟' },
  { value: 'włoska',            tKey: 'cuisineItalian',       emoji: '🍕' },
  { value: 'japońska',          tKey: 'cuisineJapanese',      emoji: '🍣' },
  { value: 'francuska',         tKey: 'cuisineFrench',        emoji: '🥐' },
  { value: 'meksykańska',       tKey: 'cuisineMexican',       emoji: '🌮' },
  { value: 'indyjska',          tKey: 'cuisineIndian',        emoji: '🍛' },
  { value: 'chińska',           tKey: 'cuisineChinese',       emoji: '🥡' },
  { value: 'śródziemnomorska',  tKey: 'cuisineMediterranean', emoji: '🫒' },
  { value: 'inne',              tKey: 'cuisineOther',         emoji: '🍽️' },
] as const

const WARSAW_DISTRICTS = [
  'Śródmieście', 'Mokotów', 'Wola', 'Praga-Północ', 'Praga-Południe',
  'Żoliborz', 'Ochota', 'Ursynów', 'Wilanów', 'Bemowo', 'Bielany',
  'Targówek', 'Białołęka', 'Ursus', 'Włochy', 'Wawer', 'Wesoła',
  'Rembertów',
]

const PRICE_RANGES = ['$', '$$', '$$$', '$$$$']
const SLOT_DURATIONS = [60, 90, 120]

type DayHours = { open: string; close: string; closed: boolean }
type Hours = Record<DayKey, DayHours>

function defaultHours(): Hours {
  return Object.fromEntries(
    DAY_KEYS.map(d => [d, { open: '12:00', close: '22:00', closed: false }])
  ) as Hours
}

const inputCls =
  'w-full bg-surface-2 border border-border rounded-lg px-3.5 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent transition-colors'
const btnCls =
  'flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg px-4 py-2.5 text-sm transition-colors'
const backCls =
  'flex-1 bg-surface-2 border border-border hover:border-muted/50 text-muted hover:text-text font-medium rounded-lg px-4 py-2.5 text-sm transition-colors'

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted/70">{hint}</p>}
    </div>
  )
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-red-400 bg-red-400/8 border border-red-400/20 rounded-lg px-4 py-2.5">
      {children}
    </div>
  )
}

function ProgressBar({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="mb-8">
      <div className="flex items-center">
        {labels.map((label, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i < step
                  ? 'bg-accent text-white'
                  : i === step
                  ? 'bg-accent text-white ring-2 ring-accent/30 ring-offset-2 ring-offset-surface'
                  : 'bg-surface-2 border border-border text-muted'
              }`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`mt-1.5 text-xs font-medium text-center leading-tight max-w-[60px] ${
                i <= step ? 'text-text' : 'text-muted'
              }`}>
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div className={`flex-1 h-px mx-2 mt-[-14px] ${i < step ? 'bg-accent' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PhotoUpload({
  label, hint, url, uploading, onUpload, onRemove, aspectClass = 'h-40',
}: {
  label:       string
  hint?:       string
  url:         string | null
  uploading:   boolean
  onUpload:    (file: File) => void
  onRemove:    () => void
  aspectClass?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</p>
      {url ? (
        <div className="relative rounded-xl overflow-hidden border border-border">
          <img src={url} alt="preview" className={`w-full ${aspectClass} object-cover`} />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg text-white hover:bg-black/80 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`w-full ${aspectClass} border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted hover:border-accent/50 hover:text-accent transition-colors disabled:opacity-50`}
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload size={20} />
          )}
          <span className="text-xs font-medium">{uploading ? 'Uploading…' : 'Click to upload'}</span>
        </button>
      )}
      {hint && <p className="text-xs text-muted/70">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) { onUpload(file); e.target.value = '' }
        }}
      />
    </div>
  )
}

function Stepper({
  value, onChange, min = 0, max = 999,
}: {
  value: number; onChange: (v: number) => void; min?: number; max?: number
}) {
  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
        className="w-10 h-10 rounded-lg bg-surface-2 border border-border text-text hover:border-muted/50 transition-colors text-xl flex items-center justify-center">
        −
      </button>
      <span className="flex-1 text-center text-xl font-bold text-text">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))}
        className="w-10 h-10 rounded-lg bg-surface-2 border border-border text-text hover:border-muted/50 transition-colors text-xl flex items-center justify-center">
        +
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const t      = useT()

  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const tok = localStorage.getItem('stolik_token')
    if (!tok) { router.push('/login'); return }
    const existing = localStorage.getItem('stolik_restaurant')
    if (existing) {
      try { if (JSON.parse(existing)?.id) { router.push('/dashboard'); return } } catch {}
    }
    setToken(tok)
  }, [router])

  const DAYS_T = [
    { key: 'monday'    as DayKey, label: t.mon },
    { key: 'tuesday'   as DayKey, label: t.tue },
    { key: 'wednesday' as DayKey, label: t.wed },
    { key: 'thursday'  as DayKey, label: t.thu },
    { key: 'friday'    as DayKey, label: t.fri },
    { key: 'saturday'  as DayKey, label: t.sat },
    { key: 'sunday'    as DayKey, label: t.sun },
  ]
  const STEP_LABELS = [t.basicInfo, t.tabHours, t.stepPhotosLabel, t.tables]

  const [step,    setStep]    = useState(0)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  // ── Step 1: Basic info ────────────────────────────────────────────────────
  const [name,        setName]        = useState('')
  const [cuisine,     setCuisine]     = useState('polska')
  const [priceRange,  setPriceRange]  = useState('$$')
  const [description, setDescription] = useState('')
  const [phone,       setPhone]       = useState('')
  const [address,     setAddress]     = useState('')
  const [district,    setDistrict]    = useState(WARSAW_DISTRICTS[0])
  const [city,        setCity]        = useState('Warszawa')

  // ── Step 2: Hours ─────────────────────────────────────────────────────────
  const [hours, setHours] = useState<Hours>(defaultHours())

  function updateDay(day: DayKey, field: keyof DayHours, value: string | boolean) {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  function copyFromMonday(targetDay: DayKey) {
    setHours(prev => ({ ...prev, [targetDay]: { ...prev['monday'] } }))
  }

  // ── Step 3: Photos ────────────────────────────────────────────────────────
  const [coverImage,    setCoverImage]    = useState<string | null>(null)
  const [logoImage,     setLogoImage]     = useState<string | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingLogo,  setUploadingLogo]  = useState(false)

  async function uploadPhoto(
    file: File,
    setUploading: (b: boolean) => void,
    setUrl: (url: string | null) => void,
  ) {
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res  = await fetch(`${API}/api/upload`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setUrl(data.url)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // ── Step 4: Tables & slots ────────────────────────────────────────────────
  const [tableCount,      setTableCount]      = useState(6)
  const [slotDuration,    setSlotDuration]    = useState(90)
  const [minAdvanceHours, setMinAdvanceHours] = useState(2)
  const [maxGuestsPerSlot,setMaxGuestsPerSlot] = useState(20)

  // ── Go live ───────────────────────────────────────────────────────────────
  async function handleGoLive() {
    if (loading) return
    setError(''); setLoading(true)

    try {
      const emoji = CUISINE_VALUES.find(c => c.value === cuisine)?.emoji ?? '🍽️'

      // 1. Create restaurant record
      const createRes = await fetch(`${API}/api/restaurants`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          name,
          cuisine,
          priceRange,
          district,
          city: city || 'Warszawa',
          address,
          ...(phone       ? { phone }       : {}),
          ...(description ? { description } : {}),
          emoji,
          ...(coverImage  ? { coverImage }  : {}),
        }),
      })
      const created = await createRes.json()
      if (!createRes.ok) {
        setError(created.error || t.restaurantSaveError)
        setLoading(false)
        return
      }

      const restaurantId = created.id

      // 2. Create tables
      if (tableCount > 0) {
        await Promise.all(
          Array.from({ length: tableCount }, (_, i) =>
            fetch(`${API}/api/restaurants/${restaurantId}/tables`, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body:    JSON.stringify({ name: `T${i + 1}`, capacity: 4 }),
            })
          )
        )
      }

      // 3. Apply hours + slot settings + go live
      const hoursData: Record<string, string | null> = {}
      DAY_KEYS.forEach(d => {
        const h   = hours[d]
        const key = `open${d.charAt(0).toUpperCase()}${d.slice(1)}`
        hoursData[key] = h.closed ? null : `${h.open}-${h.close}`
      })

      const patchBody: Record<string, unknown> = {
        ...hoursData,
        slotDuration,
        maxGuestsPerSlot,
        minAdvanceHours,
        isActive: true,
        ...(logoImage ? { images: [logoImage] } : {}),
      }

      await fetch(`${API}/api/restaurants/${restaurantId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(patchBody),
      })

      // 4. Store + redirect
      localStorage.setItem('stolik_restaurant',        JSON.stringify(created))
      localStorage.setItem('stolik_active_restaurant', JSON.stringify(created))
      router.push('/dashboard')
    } catch {
      setError(t.serverError)
    } finally {
      setLoading(false)
    }
  }

  if (!token) return null

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-bg">
      <div className="w-full max-w-2xl">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/15 border border-accent/25 rounded-2xl mb-4">
            <Utensils size={22} className="text-accent" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Stolik</h1>
          <p className="mt-1.5 text-sm text-muted">{t.regTagline}</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-8 shadow-2xl">
          <ProgressBar step={step} labels={STEP_LABELS} />

          {/* ── Step 1: Basic info ──────────────────────────────────────── */}
          {step === 0 && (
            <form
              onSubmit={e => { e.preventDefault(); setError(''); setStep(1) }}
              className="space-y-4"
            >
              <h2 className="text-base font-bold text-text mb-5">{t.basicInfo}</h2>

              <Field label={t.restaurantNameLabel}>
                <input
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="Restauracja Pod Lipami" className={inputCls}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label={t.cuisineLabel}>
                  <select value={cuisine} onChange={e => setCuisine(e.target.value)} className={inputCls}>
                    {CUISINE_VALUES.map(c => (
                      <option key={c.value} value={c.value}>{(t as any)[c.tKey]}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t.priceRangeLabel}>
                  <div className="flex gap-1.5">
                    {PRICE_RANGES.map(p => (
                      <button
                        key={p} type="button" onClick={() => setPriceRange(p)}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-colors ${
                          priceRange === p
                            ? 'bg-accent border-accent text-white'
                            : 'bg-surface-2 border-border text-muted hover:border-muted/50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <Field label={t.descriptionLabel}>
                <textarea
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder={t.descPlaceholder}
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label={t.phone}>
                  <input
                    type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+48 500 123 456" className={inputCls}
                  />
                </Field>
                <Field label={t.cityLabel}>
                  <input
                    type="text" value={city} onChange={e => setCity(e.target.value)}
                    placeholder="Warszawa" className={inputCls}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label={t.districtLabel}>
                  <select value={district} onChange={e => setDistrict(e.target.value)} className={inputCls}>
                    {WARSAW_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label={t.addressLabel}>
                  <input
                    type="text" required value={address} onChange={e => setAddress(e.target.value)}
                    placeholder="ul. Nowy Świat 12" className={inputCls}
                  />
                </Field>
              </div>

              {error && <ErrorBox>{error}</ErrorBox>}

              <div className="pt-1">
                <button type="submit" className={`w-full ${btnCls}`}>{t.nextArrow}</button>
              </div>
            </form>
          )}

          {/* ── Step 2: Hours ────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-base font-bold text-text mb-1">{t.tabHours}</h2>
              <p className="text-xs text-muted -mt-3">{t.hoursHint}</p>

              <div className="space-y-1.5">
                {DAYS_T.map(({ key, label }, idx) => (
                  <div key={key} className="flex items-center gap-2 py-2 px-3 bg-surface-2 rounded-lg border border-border">
                    <span className="text-xs text-muted w-[88px] shrink-0 font-medium">{label}</span>

                    {hours[key].closed ? (
                      <span className="text-xs text-muted flex-1">{t.closedDay}</span>
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time" value={hours[key].open}
                          onChange={e => updateDay(key, 'open', e.target.value)}
                          className="bg-surface border border-border rounded px-2 py-1 text-xs text-text focus:outline-none focus:border-accent transition-colors [color-scheme:dark]"
                        />
                        <span className="text-muted text-xs">–</span>
                        <input
                          type="time" value={hours[key].close}
                          onChange={e => updateDay(key, 'close', e.target.value)}
                          className="bg-surface border border-border rounded px-2 py-1 text-xs text-text focus:outline-none focus:border-accent transition-colors [color-scheme:dark]"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 shrink-0">
                      {idx > 0 && !hours[key].closed && (
                        <button
                          type="button"
                          onClick={() => copyFromMonday(key)}
                          className="text-xs px-2 py-1 rounded-lg border border-border text-muted hover:border-muted/50 transition-colors font-medium"
                        >
                          {t.copyFromMonday}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => updateDay(key, 'closed', !hours[key].closed)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors font-medium ${
                          hours[key].closed
                            ? 'border-accent/40 text-accent bg-accent/8'
                            : 'border-border text-muted hover:border-muted/50'
                        }`}
                      >
                        {hours[key].closed ? t.openDay : t.closeDay}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setStep(0); setError('') }} className={backCls}>{t.back}</button>
                <button type="button" onClick={() => { setStep(2); setError('') }} className={btnCls}>{t.nextArrow}</button>
              </div>
            </div>
          )}

          {/* ── Step 3: Photos ───────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-text mb-5">{t.stepPhotosLabel}</h2>

              <PhotoUpload
                label={t.coverPhoto}
                hint={t.photoHint}
                url={coverImage}
                uploading={uploadingCover}
                onUpload={file => uploadPhoto(file, setUploadingCover, setCoverImage)}
                onRemove={() => setCoverImage(null)}
                aspectClass="h-44"
              />

              <PhotoUpload
                label={t.logoPhoto}
                url={logoImage}
                uploading={uploadingLogo}
                onUpload={file => uploadPhoto(file, setUploadingLogo, setLogoImage)}
                onRemove={() => setLogoImage(null)}
                aspectClass="h-32"
              />

              {error && <ErrorBox>{error}</ErrorBox>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setStep(1); setError('') }} className={backCls}>{t.back}</button>
                <button type="button" onClick={() => { setStep(3); setError('') }} className={btnCls}>{t.nextArrow}</button>
              </div>
            </div>
          )}

          {/* ── Step 4: Tables & slots ───────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-text mb-5">{t.tables}</h2>

              <Field label={t.tableCountLabel}>
                <Stepper value={tableCount} onChange={setTableCount} min={0} max={50} />
              </Field>

              <Field label={t.slotDurationLabel}>
                <div className="flex gap-3">
                  {SLOT_DURATIONS.map(d => (
                    <button
                      key={d} type="button" onClick={() => setSlotDuration(d)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-colors ${
                        slotDuration === d
                          ? 'bg-accent border-accent text-white'
                          : 'bg-surface-2 border-border text-muted hover:border-muted/50'
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </Field>

              <Field label={t.bookingLeadTimeLabel}>
                <Stepper value={minAdvanceHours} onChange={setMinAdvanceHours} min={0} max={72} />
              </Field>

              <Field label={t.maxGuestsPerSlotLabel}>
                <Stepper value={maxGuestsPerSlot} onChange={setMaxGuestsPerSlot} min={1} max={200} />
              </Field>

              {error && <ErrorBox>{error}</ErrorBox>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setStep(2); setError('') }} className={backCls}>{t.back}</button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoLive}
                  className={btnCls}
                >
                  {loading ? t.goingLive : t.goLive}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
