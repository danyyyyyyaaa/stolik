'use client'
import { useEffect, useState, useRef } from 'react'
import {
  Tag, Plus, Pencil, Trash2, Eye, MousePointerClick, CalendarCheck2,
  Star, Pause, Play, ChevronDown, X, Clock, Percent, DollarSign,
  Gift, Calendar, Zap
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { useMyRestaurant } from '@/hooks/useRestaurant'
import { useT } from '@/lib/i18n'
import { apiFetch } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type PromotionType   = 'DISCOUNT' | 'SPECIAL_OFFER' | 'HAPPY_HOUR' | 'EVENT' | 'BOOKING_BONUS'
type PromotionStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED'

interface Promotion {
  id:              string
  restaurantId:    string
  title:           string
  titleEn?:        string | null
  titlePl?:        string | null
  titleUk?:        string | null
  description:     string
  descriptionEn?:  string | null
  descriptionPl?:  string | null
  descriptionUk?:  string | null
  type:            PromotionType
  discountPercent?: number | null
  discountAmount?:  number | null
  startDate:       string
  endDate?:        string | null
  recurringDays:   number[]
  timeStart?:      string | null
  timeEnd?:        string | null
  conditions?:     string | null
  promoCode?:      string | null
  imageUrl?:       string | null
  isHighlighted:   boolean
  status:          PromotionStatus
  viewCount:       number
  clickCount:      number
  bookingCount:    number
  createdAt:       string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<PromotionType, { label: string; color: string; icon: React.ReactNode }> = {
  DISCOUNT:      { label: 'Discount',      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',    icon: <Percent size={12} /> },
  SPECIAL_OFFER: { label: 'Special Offer', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: <Gift size={12} /> },
  HAPPY_HOUR:    { label: 'Happy Hour',    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: <Clock size={12} /> },
  EVENT:         { label: 'Event',         color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',      icon: <Calendar size={12} /> },
  BOOKING_BONUS: { label: 'Booking Bonus', color: 'text-green-400 bg-green-500/10 border-green-500/20',   icon: <Zap size={12} /> },
}

const STATUS_CONFIG: Record<PromotionStatus, { label: string; color: string }> = {
  DRAFT:   { label: 'Draft',   color: 'text-muted bg-surface-2 border-border' },
  ACTIVE:  { label: 'Active',  color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  PAUSED:  { label: 'Paused',  color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  EXPIRED: { label: 'Expired', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const EMPTY_FORM = {
  title:           '',
  titleEn:         '',
  titlePl:         '',
  titleUk:         '',
  description:     '',
  descriptionEn:   '',
  descriptionPl:   '',
  descriptionUk:   '',
  type:            'DISCOUNT' as PromotionType,
  discountPercent: '' as string | number,
  discountAmount:  '' as string | number,
  startDate:       new Date().toISOString().slice(0, 10),
  endDate:         '',
  recurringDays:   [] as number[],
  timeStart:       '',
  timeEnd:         '',
  conditions:      '',
  promoCode:       '',
  isHighlighted:   false,
  status:          'DRAFT' as PromotionStatus,
}

function fmtDate(s?: string | null) {
  if (!s) return '—'
  try { return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return s }
}

// ─── PromotionCard ────────────────────────────────────────────────────────────

function PromotionCard({
  promo, onEdit, onDelete, onStatusChange,
}: {
  promo: PromotionCard_Props['promo']
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (s: PromotionStatus) => void
}) {
  const type   = TYPE_CONFIG[promo.type]
  const status = STATUS_CONFIG[promo.status]
  const ctr    = promo.viewCount > 0 ? Math.round((promo.clickCount / promo.viewCount) * 100) : 0

  return (
    <div className="bg-surface border border-border rounded-card p-4 flex flex-col gap-3 hover:border-accent/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${type.color}`}>
              {type.icon} {type.label}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${status.color}`}>
              {status.label}
            </span>
            {promo.isHighlighted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium text-yellow-400 bg-yellow-500/10 border-yellow-500/20">
                <Star size={10} className="fill-yellow-400" /> Featured
              </span>
            )}
          </div>
          <h3 className="font-semibold text-text truncate">{promo.title}</h3>
          {promo.description && (
            <p className="text-xs text-muted mt-0.5 line-clamp-2">{promo.description}</p>
          )}
        </div>
        {promo.imageUrl && (
          <img src={promo.imageUrl} alt="" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
        )}
      </div>

      {/* Details */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-muted">
        {promo.discountPercent && (
          <span className="text-accent font-semibold">{promo.discountPercent}% off</span>
        )}
        {promo.discountAmount && (
          <span className="text-accent font-semibold">{promo.discountAmount} PLN off</span>
        )}
        {promo.promoCode && (
          <span className="px-1.5 py-0.5 bg-surface-2 border border-border rounded font-mono text-text">
            {promo.promoCode}
          </span>
        )}
        <span>{fmtDate(promo.startDate)} – {fmtDate(promo.endDate)}</span>
        {promo.timeStart && promo.timeEnd && (
          <span>{promo.timeStart} – {promo.timeEnd}</span>
        )}
        {promo.recurringDays.length > 0 && (
          <span>{promo.recurringDays.map(d => DAY_NAMES[d]).join(', ')}</span>
        )}
      </div>

      {/* Metrics */}
      <div className="flex items-center gap-4 py-2 border-t border-border text-xs text-muted">
        <span className="flex items-center gap-1"><Eye size={12} /> {promo.viewCount}</span>
        <span className="flex items-center gap-1"><MousePointerClick size={12} /> {promo.clickCount} ({ctr}%)</span>
        <span className="flex items-center gap-1"><CalendarCheck2 size={12} /> {promo.bookingCount}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {promo.status === 'ACTIVE' ? (
          <button
            onClick={() => onStatusChange('PAUSED')}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-border bg-surface-2 hover:bg-surface text-muted hover:text-text rounded-btn transition-colors"
          >
            <Pause size={11} /> Pause
          </button>
        ) : promo.status !== 'EXPIRED' ? (
          <button
            onClick={() => onStatusChange('ACTIVE')}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-btn transition-colors"
          >
            <Play size={11} /> Activate
          </button>
        ) : null}
        <button
          onClick={onEdit}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-border bg-surface-2 hover:bg-surface text-muted hover:text-text rounded-btn transition-colors"
        >
          <Pencil size={11} /> Edit
        </button>
        <button
          onClick={onDelete}
          className="ml-auto p-1.5 rounded hover:bg-red-500/10 text-muted hover:text-red-400 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

interface PromotionCard_Props { promo: Promotion }

// ─── PromoModal ───────────────────────────────────────────────────────────────

function PromoModal({
  initial, onClose, onSave, restaurantId,
}: {
  initial: Partial<typeof EMPTY_FORM> | null
  onClose: () => void
  onSave: () => void
  restaurantId: string
}) {
  const [form, setForm]     = useState({ ...EMPTY_FORM, ...initial })
  const [langTab, setLangTab] = useState<'base' | 'en' | 'pl' | 'uk'>('base')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (key: keyof typeof EMPTY_FORM, val: any) =>
    setForm(f => ({ ...f, [key]: val }))

  const toggleDay = (d: number) =>
    set('recurringDays', form.recurringDays.includes(d)
      ? form.recurringDays.filter(x => x !== d)
      : [...form.recurringDays, d])

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required'); return }
    setSaving(true); setError('')
    try {
      const body: any = {
        title:           form.title,
        titleEn:         form.titleEn   || undefined,
        titlePl:         form.titlePl   || undefined,
        titleUk:         form.titleUk   || undefined,
        description:     form.description,
        descriptionEn:   form.descriptionEn  || undefined,
        descriptionPl:   form.descriptionPl  || undefined,
        descriptionUk:   form.descriptionUk  || undefined,
        type:            form.type,
        discountPercent: form.discountPercent !== '' ? Number(form.discountPercent) : null,
        discountAmount:  form.discountAmount  !== '' ? Number(form.discountAmount)  : null,
        startDate:       new Date(form.startDate).toISOString(),
        endDate:         form.endDate ? new Date(form.endDate).toISOString() : null,
        recurringDays:   form.recurringDays,
        timeStart:       form.timeStart || null,
        timeEnd:         form.timeEnd   || null,
        conditions:      form.conditions  || null,
        promoCode:       form.promoCode   || null,
        isHighlighted:   form.isHighlighted,
        status:          form.status,
      }

      const isEditing = !!(initial as any)?.id
      const url = isEditing
        ? `/restaurants/${restaurantId}/promotions/${(initial as any).id}`
        : `/restaurants/${restaurantId}/promotions`
      await apiFetch(url, { method: isEditing ? 'PUT' : 'POST', body: JSON.stringify(body) })
      onSave()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface z-10">
          <h2 className="font-semibold text-text">
            {(initial as any)?.id ? 'Edit Promotion' : 'New Promotion'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-surface-2 text-muted hover:text-text transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-semibold text-muted mb-2">Type</label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(TYPE_CONFIG) as PromotionType[]).map(type => {
                const cfg = TYPE_CONFIG[type]
                const active = form.type === type
                return (
                  <button
                    key={type}
                    onClick={() => set('type', type)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-btn border text-xs font-medium transition-colors ${
                      active ? cfg.color : 'border-border text-muted hover:border-accent/30 hover:text-text'
                    }`}
                  >
                    <span>{cfg.icon}</span>
                    <span className="text-center leading-tight">{cfg.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Language tabs */}
          <div>
            <div className="flex gap-1 mb-3">
              {(['base', 'en', 'pl', 'uk'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLangTab(l)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-btn transition-colors ${
                    langTab === l ? 'bg-accent text-white' : 'bg-surface-2 text-muted hover:text-text'
                  }`}
                >
                  {l === 'base' ? 'Default' : l.toUpperCase()}
                </button>
              ))}
            </div>

            {langTab === 'base' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Title *</label>
                  <input
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Description *</label>
                  <textarea
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    Title ({langTab.toUpperCase()})
                  </label>
                  <input
                    value={langTab === 'en' ? form.titleEn : langTab === 'pl' ? form.titlePl : form.titleUk}
                    onChange={e => set(
                      langTab === 'en' ? 'titleEn' : langTab === 'pl' ? 'titlePl' : 'titleUk',
                      e.target.value
                    )}
                    className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    Description ({langTab.toUpperCase()})
                  </label>
                  <textarea
                    value={langTab === 'en' ? form.descriptionEn : langTab === 'pl' ? form.descriptionPl : form.descriptionUk}
                    onChange={e => set(
                      langTab === 'en' ? 'descriptionEn' : langTab === 'pl' ? 'descriptionPl' : 'descriptionUk',
                      e.target.value
                    )}
                    rows={2}
                    className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Discount fields */}
          {(form.type === 'DISCOUNT' || form.type === 'HAPPY_HOUR') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Discount %</label>
                <input
                  type="number"
                  min={1} max={100}
                  value={form.discountPercent}
                  onChange={e => set('discountPercent', e.target.value)}
                  placeholder="e.g. 20"
                  className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent placeholder:text-muted"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Discount Amount (PLN)</label>
                <input
                  type="number"
                  min={0}
                  value={form.discountAmount}
                  onChange={e => set('discountAmount', e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent placeholder:text-muted"
                />
              </div>
            </div>
          )}

          {/* Happy hour days + times */}
          {form.type === 'HAPPY_HOUR' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-2">Recurring days</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAY_NAMES.map((name, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      className={`px-2.5 py-1.5 text-xs font-semibold rounded-btn border transition-colors ${
                        form.recurringDays.includes(i)
                          ? 'bg-accent border-accent text-white'
                          : 'border-border text-muted hover:border-accent/40 hover:text-text'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Time Start</label>
                  <input
                    type="time"
                    value={form.timeStart}
                    onChange={e => set('timeStart', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Time End</label>
                  <input
                    type="time"
                    value={form.timeEnd}
                    onChange={e => set('timeEnd', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Start Date *</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => set('endDate', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Conditions + promo code */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Promo Code</label>
              <input
                value={form.promoCode}
                onChange={e => set('promoCode', e.target.value.toUpperCase())}
                placeholder="e.g. SAVE20"
                className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text font-mono focus:outline-none focus:border-accent placeholder:text-muted placeholder:font-sans"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Conditions</label>
              <input
                value={form.conditions}
                onChange={e => set('conditions', e.target.value)}
                placeholder="e.g. Min. 2 guests"
                className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent placeholder:text-muted"
              />
            </div>
          </div>

          {/* Featured + status */}
          <div className="flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => set('isHighlighted', !form.isHighlighted)}
                className={`w-9 h-5 rounded-full transition-colors flex items-center ${
                  form.isHighlighted ? 'bg-yellow-500' : 'bg-surface-2 border border-border'
                }`}
              >
                <span className={`w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mx-0.5 ${
                  form.isHighlighted ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
              <span className="text-sm text-text flex items-center gap-1">
                <Star size={12} className="text-yellow-400" /> Featured
              </span>
            </label>

            <div>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value as PromotionStatus)}
                className="px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent"
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex items-center gap-2 px-5 py-4 border-t border-border sticky bottom-0 bg-surface">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-btn transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Promotion'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border bg-surface hover:bg-surface-2 text-sm font-semibold text-muted rounded-btn transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STATUS_TABS: { key: PromotionStatus | 'ALL'; label: string }[] = [
  { key: 'ALL',     label: 'All' },
  { key: 'ACTIVE',  label: 'Active' },
  { key: 'DRAFT',   label: 'Drafts' },
  { key: 'PAUSED',  label: 'Paused' },
  { key: 'EXPIRED', label: 'Expired' },
]

export default function PromotionsPage() {
  const { restaurant }             = useMyRestaurant()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<PromotionStatus | 'ALL'>('ALL')
  const [modal, setModal]           = useState<null | 'new' | Promotion>(null)

  async function load() {
    if (!restaurant?.id) return
    setLoading(true)
    try {
      const data = await apiFetch<{ promotions: Promotion[] }>(`/restaurants/${restaurant.id}/promotions`)
      setPromotions(Array.isArray(data.promotions) ? data.promotions : [])
    } catch { setPromotions([]) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [restaurant?.id])

  async function handleStatusChange(promo: Promotion, status: PromotionStatus) {
    try {
      await apiFetch(`/restaurants/${restaurant!.id}/promotions/${promo.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      load()
    } catch { /* ignore */ }
  }

  async function handleDelete(promo: Promotion) {
    if (!confirm(`Delete "${promo.title}"?`)) return
    try {
      await apiFetch(`/restaurants/${restaurant!.id}/promotions/${promo.id}`, { method: 'DELETE' })
      load()
    } catch { /* ignore */ }
  }

  const visible = tab === 'ALL' ? promotions : promotions.filter(p => p.status === tab)

  const counts = promotions.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div>
      <PageHeader
        title="Promotions"
        description="Manage discounts, happy hours, events and special offers"
        actions={
          <button
            onClick={() => setModal('new')}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-btn transition-colors"
          >
            <Plus size={14} /> New Promotion
          </button>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto pb-px">
        {STATUS_TABS.map(t => {
          const count = t.key === 'ALL' ? promotions.length : counts[t.key] ?? 0
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-text'
              }`}
            >
              {t.label}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                  tab === t.key ? 'bg-accent/20 text-accent' : 'bg-surface-2 text-muted'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-48 animate-pulse bg-surface-2 rounded-card" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon={Tag} title="No promotions" description="Create your first promotion to attract more guests" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map(promo => (
            <PromotionCard
              key={promo.id}
              promo={promo}
              onEdit={() => setModal(promo)}
              onDelete={() => handleDelete(promo)}
              onStatusChange={s => handleStatusChange(promo, s)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal !== null && restaurant?.id && (
        <PromoModal
          initial={modal === 'new' ? null : {
            ...modal,
            startDate:       modal.startDate ? modal.startDate.slice(0, 10) : '',
            endDate:         modal.endDate   ? modal.endDate.slice(0, 10)   : '',
            discountPercent: modal.discountPercent ?? '',
            discountAmount:  modal.discountAmount  ?? '',
            timeStart:       modal.timeStart  ?? '',
            timeEnd:         modal.timeEnd    ?? '',
            conditions:      modal.conditions ?? '',
            promoCode:       modal.promoCode  ?? '',
            titleEn:         modal.titleEn    ?? '',
            titlePl:         modal.titlePl    ?? '',
            titleUk:         modal.titleUk    ?? '',
            descriptionEn:   modal.descriptionEn  ?? '',
            descriptionPl:   modal.descriptionPl  ?? '',
            descriptionUk:   modal.descriptionUk  ?? '',
          }}
          restaurantId={restaurant.id}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
