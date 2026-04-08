'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useMyRestaurant } from '@/hooks/useRestaurant'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/shared/LoadingSkeleton'
import { useT } from '@/lib/i18n'

const TABS = ['General', 'Hours', 'Notifications', 'SMS Templates', 'Danger Zone'] as const
type Tab = typeof TABS[number]

const DISTRICTS = [
  'Śródmieście', 'Wola', 'Praga-Południe', 'Praga-Północ', 'Mokotów',
  'Ochota', 'Żoliborz', 'Bemowo', 'Bielany', 'Ursynów', 'Wilanów',
  'Targówek', 'Rembertów', 'Wawer', 'Wesoła', 'Białołęka',
  'Ursus', 'Włochy', 'Ursus',
]

const CUISINES = [
  'Polish', 'Italian', 'Japanese', 'French', 'Georgian',
  'American', 'Mediterranean', 'Asian', 'Mexican', 'Indian',
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIME_OPTIONS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
  '22:00', '23:00', '00:00',
]

interface DayHours {
  open: boolean
  openTime: string
  closeTime: string
}

interface NotifSettings {
  emailNewBooking: boolean
  emailCancellation: boolean
  pushNewBooking: boolean
  dailySummary: boolean
  weeklyReport: boolean
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
        checked ? 'bg-accent' : 'bg-surface-2'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function SettingsPage() {
  const { restaurant, loading: restaurantLoading } = useMyRestaurant()
  const t = useT()

  const [activeTab, setActiveTab] = useState<Tab>('General')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  // General tab state
  const [form, setForm] = useState({
    name: '',
    description: '',
    cuisine: '',
    priceRange: '$$',
    address: '',
    phone: '',
    email: '',
    website: '',
    district: '',
  })

  // Hours tab state
  const [hours, setHours] = useState<DayHours[]>(
    DAYS.map(() => ({ open: true, openTime: '12:00', closeTime: '22:00' }))
  )
  const [slotDuration, setSlotDuration] = useState(60)
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(30)
  const [birthdayPerkEnabled, setBirthdayPerkEnabled] = useState(false)
  const [birthdayPerkDescription, setBirthdayPerkDescription] = useState('')

  // Parking state
  const [hasParking, setHasParking] = useState(false)
  const [parkingDetails, setParkingDetails] = useState('')

  // Notifications tab state
  const [notifs, setNotifs] = useState<NotifSettings>({
    emailNewBooking: true,
    emailCancellation: true,
    pushNewBooking: true,
    dailySummary: false,
    weeklyReport: false,
  })

  // SMS Templates tab state
  const SMS_TYPES = ['booking_confirmed', 'booking_reminder', 'booking_cancelled', 'booking_manual'] as const
  const SMS_LANGS = ['en', 'pl', 'ru', 'uk'] as const
  type SmsType = typeof SMS_TYPES[number]
  type SmsLang = typeof SMS_LANGS[number]

  const SMS_DEFAULTS: Record<SmsType, Record<SmsLang, string>> = {
    booking_confirmed: {
      en: 'Hi {guestName}! Booking at {restaurant} confirmed: {date} at {time}, {partySize} guests. See you! — Dinto',
      pl: 'Cześć {guestName}! Rezerwacja w {restaurant} potwierdzona: {date} o {time}, {partySize} os. Do zobaczenia! — Dinto',
      ru: 'Привет {guestName}! Бронь в {restaurant} подтверждена: {date} в {time}, {partySize} гостей. До встречи! — Dinto',
      uk: 'Привіт {guestName}! Бронь у {restaurant} підтверджено: {date} о {time}, {partySize} гостей. До зустрічі! — Dinto',
    },
    booking_reminder: {
      en: 'Reminder: Today at {time} you have a reservation at {restaurant} for {partySize} guests. See you!',
      pl: 'Przypomnienie: Dziś o {time} masz rezerwację w {restaurant} na {partySize} os. Do zobaczenia!',
      ru: 'Напоминание: Сегодня в {time} у вас бронь в {restaurant} на {partySize} гостей. До встречи!',
      uk: 'Нагадування: Сьогодні о {time} у вас бронь у {restaurant} на {partySize} гостей. До зустрічі!',
    },
    booking_cancelled: {
      en: 'Your reservation at {restaurant} ({date}, {time}) has been cancelled. Book again at dinto.pl',
      pl: 'Rezerwacja w {restaurant} ({date}, {time}) została anulowana. Zarezerwuj ponownie na dinto.pl',
      ru: 'Ваша бронь в {restaurant} ({date}, {time}) отменена. Забронируйте снова на dinto.pl',
      uk: 'Вашу бронь у {restaurant} ({date}, {time}) скасовано. Забронюйте знову на dinto.pl',
    },
    booking_manual: {
      en: 'Hi {guestName}! A table has been reserved for you at {restaurant}: {date} at {time}, {partySize} guests. Booking: {bookingCode}',
      pl: 'Cześć {guestName}! Zarezerwowano dla Ciebie stolik w {restaurant}: {date} o {time}, {partySize} os. Rezerwacja: {bookingCode}',
      ru: 'Привет {guestName}! Для вас зарезервирован столик в {restaurant}: {date} в {time}, {partySize} гостей. Бронь: {bookingCode}',
      uk: 'Привіт {guestName}! Для вас зарезервовано столик у {restaurant}: {date} о {time}, {partySize} гостей. Бронь: {bookingCode}',
    },
  }

  const SMS_VARS = ['{guestName}', '{restaurant}', '{date}', '{time}', '{partySize}', '{bookingCode}']
  const SMS_TYPE_LABELS: Record<SmsType, string> = {
    booking_confirmed: 'Booking Confirmed',
    booking_reminder: 'Booking Reminder',
    booking_cancelled: 'Booking Cancelled',
    booking_manual: 'Manual Booking',
  }

  const [smsType, setSmsType] = useState<SmsType>('booking_confirmed')
  const [smsLang, setSmsLang] = useState<SmsLang>('en')
  const [smsTemplates, setSmsTemplates] = useState<Partial<Record<SmsType, Partial<Record<SmsLang, string>>>>>({})
  const [smsSaving, setSmsSaving] = useState(false)
  const [smsSaved, setSmsSaved] = useState(false)
  const [testingSms, setTestingSms] = useState(false)

  const currentTemplate = smsTemplates[smsType]?.[smsLang] ?? SMS_DEFAULTS[smsType][smsLang]

  function setSmsTemplate(val: string) {
    setSmsTemplates(t => ({
      ...t,
      [smsType]: { ...(t[smsType] ?? {}), [smsLang]: val },
    }))
  }

  function insertVar(v: string) {
    setSmsTemplate(currentTemplate + v)
  }

  function resetTemplate() {
    setSmsTemplates(t => ({
      ...t,
      [smsType]: { ...(t[smsType] ?? {}), [smsLang]: SMS_DEFAULTS[smsType][smsLang] },
    }))
  }

  async function handleSaveSms() {
    if (!restaurant) return
    setSmsSaving(true)
    try {
      await api.put(`/api/sms-templates`, {
        restaurantId: restaurant.id,
        templates: Object.entries(smsTemplates).flatMap(([type, langs]) =>
          Object.entries(langs ?? {}).map(([lang, template]) => ({ type, language: lang, template }))
        ),
      })
      setSmsSaved(true)
      setTimeout(() => setSmsSaved(false), 2000)
    } catch {
      // silently
    } finally {
      setSmsSaving(false)
    }
  }

  async function handleTestSms() {
    if (!restaurant) return
    setTestingSms(true)
    try {
      await api.post('/api/sms-templates/test', {
        restaurantId: restaurant.id,
        template: currentTemplate,
        type: smsType,
        language: smsLang,
      })
    } catch {
      // silently
    } finally {
      setTestingSms(false)
    }
  }

  // Preview with sample data
  const SMS_PREVIEW_DATA: Record<string, string> = {
    '{guestName}': 'Jan Kowalski',
    '{restaurant}': restaurant?.name ?? 'Your Restaurant',
    '{date}': '15 Apr',
    '{time}': '19:00',
    '{partySize}': '4',
    '{bookingCode}': 'DN-1234',
  }
  const previewText = currentTemplate.replace(
    /\{[a-zA-Z]+\}/g,
    match => SMS_PREVIEW_DATA[match] ?? match
  )

  // Danger Zone state
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')

  // Fill form from restaurant data
  useEffect(() => {
    if (restaurant) {
      const r = restaurant as any
      setForm({
        name: r.name ?? '',
        description: r.description ?? '',
        cuisine: r.cuisine ?? '',
        priceRange: r.priceRange ?? '$$',
        address: r.address ?? '',
        phone: r.phone ?? '',
        email: r.email ?? '',
        website: r.website ?? '',
        district: r.district ?? '',
      })
      setBirthdayPerkEnabled(r.birthdayPerkEnabled ?? false)
      setBirthdayPerkDescription(r.birthdayPerkDescription ?? '')
      setHasParking(r.hasParking ?? false)
      setParkingDetails(r.parkingDetails ?? '')
    }
  }, [restaurant])

  const showSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSaveGeneral = async () => {
    if (!restaurant) return
    setSaving(true)
    try {
      await api.put(`/api/restaurants/${restaurant.id}`, {
        ...form,
        hasParking,
        parkingDetails: parkingDetails || null,
      })
      showSaved()
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  const handleSaveHours = async () => {
    if (!restaurant) return
    setSaving(true)
    try {
      await api.put(`/api/restaurants/${restaurant.id}`, {
        openingHours: JSON.stringify(hours),
        slotDuration,
        maxAdvanceDays,
        birthdayPerkEnabled,
        birthdayPerkDescription: birthdayPerkDescription || null,
      })
      showSaved()
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotifs = async () => {
    if (!restaurant) return
    setSaving(true)
    try {
      await api.put(`/api/restaurants/${restaurant.id}`, notifs)
      showSaved()
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  const handleUnpublish = async () => {
    if (!restaurant) return
    try {
      await api.put(`/api/restaurants/${restaurant.id}`, { isPublished: false })
    } catch {
      // silently fail
    }
  }

  const handleDelete = async () => {
    if (!restaurant) return
    try {
      await api.delete(`/api/restaurants/${restaurant.id}`)
      window.location.href = '/login'
    } catch {
      // silently fail
    }
  }

  if (restaurantLoading) {
    return (
      <div>
        <PageHeader title={t.settings} description={t.profileSub} />
        <div className="space-y-3 max-w-2xl">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    )
  }

  const SaveButton = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      disabled={saving}
      className="px-6 py-2 bg-accent text-white rounded-btn text-sm font-medium hover:bg-accent/90 disabled:opacity-60 transition-colors"
    >
      {saved ? `✓ ${t.profileSaved}` : saving ? t.saving : t.save}
    </button>
  )

  return (
    <div>
      <PageHeader title={t.settings} description={t.profileSub} />

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab
                ? 'text-accent border-b-2 border-accent -mb-px'
                : 'text-muted hover:text-text'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* General tab */}
      {activeTab === 'General' && (
        <div className="max-w-2xl space-y-5">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">{t.restaurantNameLabel} *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-accent bg-surface text-text"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">{t.descriptionLabel}</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none bg-surface text-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">{t.cuisineLabel}</label>
              <select
                value={form.cuisine}
                onChange={e => setForm(f => ({ ...f, cuisine: e.target.value }))}
                className="w-full border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-accent bg-surface text-text"
              >
                <option value="">Select cuisine</option>
                {CUISINES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">{t.districtLabel}</label>
              <select
                value={form.district}
                onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                className="w-full border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-accent bg-surface text-text"
              >
                <option value="">Select district</option>
                {DISTRICTS.filter((d, i, arr) => arr.indexOf(d) === i).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">{t.priceRangeLabel}</label>
            <div className="flex gap-2">
              {(['$', '$$', '$$$', '$$$$'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setForm(f => ({ ...f, priceRange: p }))}
                  className={`px-4 py-1.5 rounded-chip text-sm font-medium transition-colors ${
                    form.priceRange === p
                      ? 'bg-accent text-white'
                      : 'bg-surface border border-border text-muted hover:text-text'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">{t.addressLabel}</label>
            <input
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="w-full border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-accent bg-surface text-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">{t.phone}</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-accent bg-surface text-text"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">{t.email}</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-accent bg-surface text-text"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">{t.websiteLabel}</label>
            <input
              type="url"
              value={form.website}
              onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
              placeholder="https://"
              className="w-full border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-accent bg-surface text-text"
            />
          </div>

          {/* Parking */}
          <div className="border border-border rounded-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-text">🅿 {t.parkingTitle}</p>
                <p className="text-xs text-muted mt-0.5">{t.parkingDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => setHasParking(v => !v)}
                className={[
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                  hasParking ? 'bg-accent' : 'bg-muted/30',
                ].join(' ')}
                role="switch"
                aria-checked={hasParking}
              >
                <span className={[
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                  hasParking ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')} />
              </button>
            </div>
            {hasParking && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-muted mb-1.5">{t.parkingDetailsLabel}</label>
                <input
                  type="text"
                  value={parkingDetails}
                  onChange={e => setParkingDetails(e.target.value)}
                  placeholder={t.parkingDetailsPlaceholder}
                  className="w-full border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-accent bg-surface text-text"
                />
              </div>
            )}
          </div>

          <div className="pt-2">
            <SaveButton onClick={handleSaveGeneral} />
          </div>
        </div>
      )}

      {/* Hours tab */}
      {activeTab === 'Hours' && (
        <div className="max-w-2xl">
          <div className="space-y-3 mb-6">
            {DAYS.map((day, i) => (
              <div
                key={day}
                className="flex items-center gap-4 p-3 bg-surface border border-border rounded-btn"
              >
                <span className="w-24 text-sm font-medium text-text flex-shrink-0">{day}</span>
                <ToggleSwitch
                  checked={hours[i].open}
                  onChange={() =>
                    setHours(h =>
                      h.map((d, idx) => (idx === i ? { ...d, open: !d.open } : d))
                    )
                  }
                />
                {hours[i].open ? (
                  <>
                    <select
                      value={hours[i].openTime}
                      onChange={e =>
                        setHours(h =>
                          h.map((d, idx) =>
                            idx === i ? { ...d, openTime: e.target.value } : d
                          )
                        )
                      }
                      className="border border-border rounded-btn px-2 py-1.5 text-sm bg-surface text-text focus:outline-none focus:border-accent"
                    >
                      {TIME_OPTIONS.map(t => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    <span className="text-muted text-sm">–</span>
                    <select
                      value={hours[i].closeTime}
                      onChange={e =>
                        setHours(h =>
                          h.map((d, idx) =>
                            idx === i ? { ...d, closeTime: e.target.value } : d
                          )
                        )
                      }
                      className="border border-border rounded-btn px-2 py-1.5 text-sm bg-surface text-text focus:outline-none focus:border-accent"
                    >
                      {TIME_OPTIONS.map(t => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <span className="text-sm text-muted">{t.closedDay}</span>
                )}
              </div>
            ))}
            <button
              onClick={() =>
                setHours(h =>
                  h.map(() => ({
                    open: h[0].open,
                    openTime: h[0].openTime,
                    closeTime: h[0].closeTime,
                  }))
                )
              }
              className="text-sm text-accent hover:underline"
            >
              {t.copyFromMonday}
            </button>
          </div>

          {/* Slot duration + advance booking */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">{t.slotDurationLabel}</label>
              <select
                value={slotDuration}
                onChange={e => setSlotDuration(Number(e.target.value))}
                className="w-full border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-accent bg-surface text-text"
              >
                <option value={30}>30 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
                <option value={120}>120 min</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Max advance booking</label>
              <select
                value={maxAdvanceDays}
                onChange={e => setMaxAdvanceDays(Number(e.target.value))}
                className="w-full border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-accent bg-surface text-text"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
              </select>
            </div>
          </div>

          {/* Birthday perks */}
          <div className="border border-border rounded-card p-4 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-text">{t.birthdayPerkTitle}</p>
                <p className="text-xs text-muted mt-0.5">{t.birthdayPerkDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => setBirthdayPerkEnabled(v => !v)}
                className={[
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                  birthdayPerkEnabled ? 'bg-accent' : 'bg-muted/30',
                ].join(' ')}
                role="switch"
                aria-checked={birthdayPerkEnabled}
              >
                <span className={[
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                  birthdayPerkEnabled ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')} />
              </button>
            </div>
            {birthdayPerkEnabled && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-muted mb-1.5">{t.birthdayPerkDescLabel}</label>
                <input
                  type="text"
                  value={birthdayPerkDescription}
                  onChange={e => setBirthdayPerkDescription(e.target.value)}
                  placeholder={t.birthdayPerkDescPlaceholder}
                  className="w-full border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-accent bg-surface text-text"
                />
              </div>
            )}
          </div>

          <SaveButton onClick={handleSaveHours} />
        </div>
      )}

      {/* Notifications tab */}
      {activeTab === 'Notifications' && (
        <div className="max-w-2xl">
          <div className="bg-surface border border-border rounded-card divide-y divide-border mb-6">
            {(
              [
                { key: 'emailNewBooking', label: 'Email — new booking', desc: 'Get an email when a new booking is made' },
                { key: 'emailCancellation', label: 'Email — cancellation', desc: 'Get an email when a booking is cancelled' },
                { key: 'pushNewBooking', label: 'Push — new booking', desc: 'Push notification for new bookings' },
                { key: 'dailySummary', label: 'Daily summary', desc: 'Daily digest of bookings at 8:00 AM' },
                { key: 'weeklyReport', label: 'Weekly report', desc: 'Weekly analytics report every Monday' },
              ] as { key: keyof NotifSettings; label: string; desc: string }[]
            ).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-4">
                <div>
                  <div className="text-sm font-medium text-text">{label}</div>
                  <div className="text-xs text-muted mt-0.5">{desc}</div>
                </div>
                <ToggleSwitch
                  checked={notifs[key]}
                  onChange={() => setNotifs(n => ({ ...n, [key]: !n[key] }))}
                />
              </div>
            ))}
          </div>
          <SaveButton onClick={handleSaveNotifs} />
        </div>
      )}

      {/* SMS Templates tab */}
      {activeTab === 'SMS Templates' && (
        <div className="max-w-2xl space-y-5">
          {/* Type + Language selectors */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-semibold text-muted mb-1">{t.smsSettings}</label>
              <select
                value={smsType}
                onChange={e => setSmsType(e.target.value as SmsType)}
                className="w-full border border-border rounded-btn px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-accent"
              >
                {SMS_TYPES.map(t => (
                  <option key={t} value={t}>{SMS_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Language</label>
              <div className="flex gap-1">
                {SMS_LANGS.map(l => (
                  <button
                    key={l}
                    onClick={() => setSmsLang(l)}
                    className={`px-3 py-2 text-xs font-semibold rounded-btn transition-colors ${
                      smsLang === l ? 'bg-accent text-white' : 'border border-border bg-surface text-muted hover:text-text'
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Available variables */}
          <div>
            <p className="text-xs font-semibold text-muted mb-2">{t.smsVarsTitle}</p>
            <div className="flex flex-wrap gap-1.5">
              {SMS_VARS.map(v => (
                <button
                  key={v}
                  onClick={() => insertVar(v)}
                  className="px-2 py-1 bg-accent/10 border border-accent/20 text-accent text-xs font-mono rounded-full hover:bg-accent/20 transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Template textarea */}
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">{t.smsCustomLabel}</label>
            <textarea
              value={currentTemplate}
              onChange={e => setSmsTemplate(e.target.value)}
              rows={4}
              className="w-full border border-border rounded-btn px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-accent resize-none font-mono"
            />
            <p className="text-xs text-muted mt-1">{currentTemplate.length} / 160 characters</p>
          </div>

          {/* Live preview */}
          <div>
            <p className="text-xs font-semibold text-muted mb-2">{t.smsPreview}</p>
            <div className="bg-surface-2 border border-border rounded-xl p-4">
              <div className="bg-surface border border-border rounded-xl px-4 py-3 max-w-xs">
                <p className="text-xs text-text leading-relaxed">{previewText}</p>
              </div>
              <p className="text-[10px] text-muted mt-2">Sample preview — real values filled at send time</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSaveSms}
              disabled={smsSaving}
              className="px-5 py-2 bg-accent text-white rounded-btn text-sm font-medium hover:bg-accent/90 disabled:opacity-60 transition-colors"
            >
              {smsSaved ? `✓ ${t.smsSaved}` : smsSaving ? t.saving : 'Save template'}
            </button>
            <button
              onClick={resetTemplate}
              className="px-4 py-2 border border-border rounded-btn text-sm text-muted hover:text-text hover:bg-surface-2 transition-colors"
            >
              Reset to default
            </button>
            <button
              onClick={handleTestSms}
              disabled={testingSms}
              className="px-4 py-2 border border-border rounded-btn text-sm text-muted hover:text-text hover:bg-surface-2 transition-colors disabled:opacity-60"
            >
              {testingSms ? 'Sending…' : 'Send Test SMS'}
            </button>
          </div>
        </div>
      )}

      {/* Danger Zone tab */}
      {activeTab === 'Danger Zone' && (
        <div className="max-w-2xl">
          <div className="border-2 border-red-200 rounded-card p-6">
            <h3 className="text-red-600 font-semibold mb-4">Danger Zone</h3>
            <div className="space-y-4">
              {/* Unpublish */}
              <div className="flex items-center justify-between py-3 border-b border-red-100">
                <div>
                  <div className="font-medium text-text">Unpublish Restaurant</div>
                  <div className="text-sm text-muted">Your restaurant will no longer appear in the app</div>
                </div>
                <button
                  onClick={handleUnpublish}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-btn text-sm hover:bg-red-50 transition-colors"
                >
                  Unpublish
                </button>
              </div>

              {/* Delete */}
              <div className="py-3">
                <div className="font-medium text-text mb-1">Delete Restaurant</div>
                <div className="text-sm text-muted mb-3">
                  This action cannot be undone. All data will be permanently deleted.
                </div>
                {deleteConfirm ? (
                  <div>
                    <p className="text-sm text-text mb-2">
                      Type <strong>{restaurant?.name}</strong> to confirm:
                    </p>
                    <input
                      value={deleteInput}
                      onChange={e => setDeleteInput(e.target.value)}
                      className="border border-red-300 rounded-btn px-3 py-2 text-sm w-64 focus:outline-none bg-surface text-text"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleDelete}
                        disabled={deleteInput !== restaurant?.name}
                        className="px-4 py-2 bg-red-600 text-white rounded-btn text-sm disabled:opacity-50 hover:bg-red-700 transition-colors"
                      >
                        Delete permanently
                      </button>
                      <button
                        onClick={() => { setDeleteConfirm(false); setDeleteInput('') }}
                        className="px-4 py-2 border border-border rounded-btn text-sm text-muted hover:bg-surface-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-btn text-sm hover:bg-red-700 transition-colors"
                  >
                    Delete Restaurant
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
