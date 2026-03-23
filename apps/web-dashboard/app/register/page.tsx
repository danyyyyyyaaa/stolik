'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const API = 'http://localhost:3001'

const DAYS = [
  { key: 'monday',    label: 'Poniedziałek' },
  { key: 'tuesday',   label: 'Wtorek' },
  { key: 'wednesday', label: 'Środa' },
  { key: 'thursday',  label: 'Czwartek' },
  { key: 'friday',    label: 'Piątek' },
  { key: 'saturday',  label: 'Sobota' },
  { key: 'sunday',    label: 'Niedziela' },
]

const CUISINES = [
  { value: 'polska',    label: 'Polska' },
  { value: 'włoska',   label: 'Włoska' },
  { value: 'japońska', label: 'Japońska' },
  { value: 'francuska',label: 'Francuska' },
  { value: 'inne',     label: 'Inne' },
]

const PRICE_RANGES = ['$', '$$', '$$$', '$$$$']
const SLOT_DURATIONS = [60, 90, 120]

type DayHours = { open: string; close: string; closed: boolean }
type Hours    = Record<string, DayHours>

function defaultHours(): Hours {
  return Object.fromEntries(
    DAYS.map(d => [d.key, { open: '12:00', close: '22:00', closed: false }])
  )
}

const STEP_LABELS = ['Konto', 'Restauracja', 'Ustawienia']

/* ─── Input ─────────────────────────────────────────────── */
function Field({
  label, children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent transition-colors'

/* ─── Progress bar ───────────────────────────────────────── */
function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex flex-col items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                i < step
                  ? 'bg-accent text-white'
                  : i === step
                  ? 'bg-accent text-white ring-2 ring-accent/40'
                  : 'bg-surface border border-border text-muted'
              }`}
            >
              {i < step ? '✓' : i + 1}
            </div>
            <span
              className={`mt-1.5 text-xs ${
                i <= step ? 'text-text' : 'text-muted'
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="relative h-1 bg-border rounded-full">
        <div
          className="absolute h-1 bg-accent rounded-full transition-all duration-500"
          style={{ width: `${(step / (STEP_LABELS.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────── */
export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep]     = useState(0)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  // stored after step 1
  const [jwt, setJwt]   = useState('')

  /* Step 1 */
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')

  /* Step 2 */
  const [name,       setName]       = useState('')
  const [cuisine,    setCuisine]    = useState('polska')
  const [district,   setDistrict]   = useState('')
  const [city,       setCity]       = useState('')
  const [address,    setAddress]    = useState('')
  const [phone,      setPhone]      = useState('')
  const [priceRange, setPriceRange] = useState('$$')

  /* Step 3 */
  const [hours,            setHours]            = useState<Hours>(defaultHours())
  const [slotDuration,     setSlotDuration]     = useState(60)
  const [maxGuestsPerSlot, setMaxGuestsPerSlot] = useState(4)

  /* ── Handlers ── */
  function updateDay(day: string, field: keyof DayHours, value: string | boolean) {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Błąd rejestracji'); return }
      localStorage.setItem('stolik_token', data.token)
      localStorage.setItem('stolik_user',  JSON.stringify(data.user))
      setJwt(data.token)
      setStep(1)
    } catch {
      setError('Nie można połączyć się z serwerem')
    } finally {
      setLoading(false)
    }
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/restaurants`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ name, cuisine, district, city, address, phone, priceRange }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Błąd zapisu restauracji'); return }
      localStorage.setItem('stolik_restaurant', JSON.stringify(data))
      setStep(2)
    } catch {
      setError('Nie można połączyć się z serwerem')
    } finally {
      setLoading(false)
    }
  }

  async function handleStep3(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const stored = localStorage.getItem('stolik_restaurant')
      const restaurantId = stored ? JSON.parse(stored).id : null

      if (restaurantId) {
        await fetch(`${API}/api/restaurants/${restaurantId}/settings`, {
          method:  'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ hours, slotDuration, maxGuestsPerSlot }),
        })
      }
      router.push('/dashboard')
    } catch {
      setError('Nie można połączyć się z serwerem')
    } finally {
      setLoading(false)
    }
  }

  /* ── Render ── */
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-4xl">🍽️</span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-text">Stolik</h1>
          <p className="mt-1 text-sm text-muted">Rejestracja restauracji</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8">
          <ProgressBar step={step} />

          {/* ── STEP 1: Account ── */}
          {step === 0 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <h2 className="text-base font-semibold text-text mb-5">Dane konta</h2>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Imię">
                  <input
                    type="text" required value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Marek"
                    className={inputCls}
                  />
                </Field>
                <Field label="Nazwisko">
                  <input
                    type="text" required value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Kowalski"
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Email">
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="marek@restauracja.pl"
                  className={inputCls}
                />
              </Field>

              <Field label="Hasło">
                <input
                  type="password" required minLength={6} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 znaków"
                  className={inputCls}
                />
              </Field>

              {error && <ErrorBox>{error}</ErrorBox>}

              <button
                type="submit" disabled={loading}
                className="w-full mt-2 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
              >
                {loading ? 'Rejestracja…' : 'Dalej →'}
              </button>

              <p className="text-center text-xs text-muted pt-1">
                Masz już konto?{' '}
                <Link href="/login" className="text-accent hover:text-accent-hover transition-colors">
                  Zaloguj się
                </Link>
              </p>
            </form>
          )}

          {/* ── STEP 2: Restaurant ── */}
          {step === 1 && (
            <form onSubmit={handleStep2} className="space-y-4">
              <h2 className="text-base font-semibold text-text mb-5">Informacje o restauracji</h2>

              <Field label="Nazwa restauracji">
                <input
                  type="text" required value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Restauracja Pod Lipami"
                  className={inputCls}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Kuchnia">
                  <select
                    value={cuisine}
                    onChange={e => setCuisine(e.target.value)}
                    className={inputCls}
                  >
                    {CUISINES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Przedział cenowy">
                  <div className="flex gap-2">
                    {PRICE_RANGES.map(p => (
                      <button
                        key={p} type="button"
                        onClick={() => setPriceRange(p)}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-medium border transition-colors ${
                          priceRange === p
                            ? 'bg-accent border-accent text-white'
                            : 'bg-bg border-border text-muted hover:border-accent/50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Miasto">
                  <input
                    type="text" required value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Warszawa"
                    className={inputCls}
                  />
                </Field>
                <Field label="Dzielnica">
                  <input
                    type="text" value={district}
                    onChange={e => setDistrict(e.target.value)}
                    placeholder="Śródmieście"
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Adres">
                <input
                  type="text" required value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="ul. Nowy Świat 12"
                  className={inputCls}
                />
              </Field>

              <Field label="Telefon">
                <input
                  type="tel" required value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+48 500 123 456"
                  className={inputCls}
                />
              </Field>

              {error && <ErrorBox>{error}</ErrorBox>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setStep(0); setError('') }}
                  className="flex-1 bg-bg border border-border hover:border-accent/50 text-muted font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
                >
                  ← Wstecz
                </button>
                <button
                  type="submit" disabled={loading}
                  className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
                >
                  {loading ? 'Zapisywanie…' : 'Dalej →'}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 3: Settings ── */}
          {step === 2 && (
            <form onSubmit={handleStep3} className="space-y-5">
              <h2 className="text-base font-semibold text-text mb-5">Ustawienia pracy</h2>

              {/* Hours */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted uppercase tracking-wider">Godziny otwarcia</p>
                <div className="space-y-1.5">
                  {DAYS.map(d => (
                    <div key={d.key} className="flex items-center gap-3 py-1.5 px-3 bg-bg rounded-lg border border-border">
                      <span className="text-xs text-muted w-28 shrink-0">{d.label}</span>
                      {hours[d.key].closed ? (
                        <span className="text-xs text-muted flex-1">Zamknięte</span>
                      ) : (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="time"
                            value={hours[d.key].open}
                            onChange={e => updateDay(d.key, 'open', e.target.value)}
                            className="bg-surface border border-border rounded px-2 py-1 text-xs text-text focus:outline-none focus:border-accent transition-colors"
                          />
                          <span className="text-muted text-xs">–</span>
                          <input
                            type="time"
                            value={hours[d.key].close}
                            onChange={e => updateDay(d.key, 'close', e.target.value)}
                            className="bg-surface border border-border rounded px-2 py-1 text-xs text-text focus:outline-none focus:border-accent transition-colors"
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => updateDay(d.key, 'closed', !hours[d.key].closed)}
                        className={`text-xs px-2 py-1 rounded border transition-colors shrink-0 ${
                          hours[d.key].closed
                            ? 'border-accent/50 text-accent bg-accent/10'
                            : 'border-border text-muted hover:border-accent/40'
                        }`}
                      >
                        {hours[d.key].closed ? 'Otwórz' : 'Zamknij'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slot duration */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted uppercase tracking-wider">Długość slotu</p>
                <div className="flex gap-3">
                  {SLOT_DURATIONS.map(d => (
                    <button
                      key={d} type="button"
                      onClick={() => setSlotDuration(d)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                        slotDuration === d
                          ? 'bg-accent border-accent text-white'
                          : 'bg-bg border-border text-muted hover:border-accent/50'
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Max guests */}
              <Field label="Maks. gości na slot">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setMaxGuestsPerSlot(v => Math.max(1, v - 1))}
                    className="w-10 h-10 rounded-lg bg-bg border border-border text-text hover:border-accent/50 transition-colors text-lg flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center text-xl font-semibold text-text">
                    {maxGuestsPerSlot}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMaxGuestsPerSlot(v => v + 1)}
                    className="w-10 h-10 rounded-lg bg-bg border border-border text-text hover:border-accent/50 transition-colors text-lg flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </Field>

              {error && <ErrorBox>{error}</ErrorBox>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError('') }}
                  className="flex-1 bg-bg border border-border hover:border-accent/50 text-muted font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
                >
                  ← Wstecz
                </button>
                <button
                  type="submit" disabled={loading}
                  className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
                >
                  {loading ? 'Zapisywanie…' : 'Zakończ rejestrację'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5">
      {children}
    </p>
  )
}
