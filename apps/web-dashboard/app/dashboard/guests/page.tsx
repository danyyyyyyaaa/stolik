'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  Search, Star, ShieldOff, X, Phone, Mail, Tag,
  CalendarDays, Users, ChevronRight, StickyNote, RefreshCw,
  Download, ChevronDown,
} from 'lucide-react'
import clsx from 'clsx'
import { useT } from '@/lib/i18n'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

type Guest = {
  id:          string
  name:        string | null
  phone:       string
  email:       string | null
  tags:        string[]
  visitCount:  number
  noShowCount: number
  isVip:       boolean
  isBlocked:   boolean
  lastVisit:   string | null
  notes:       string | null
}

type GuestStats = {
  totalGuests: number
  vipCount:    number
  repeatRate:  number
  avgVisits:   string
}

type BookingHistoryItem = {
  id:         string
  bookingRef: string
  date:       string
  time:       string
  guestCount: number
  status:     string
  notes:      string | null
  table:      { id: string; name: string } | null
}

type GuestDetail = Guest & { bookings: BookingHistoryItem[] }

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'text-green-400  bg-green-400/10',
  pending:   'text-yellow-400 bg-yellow-400/10',
  cancelled: 'text-red-400    bg-red-400/10',
  completed: 'text-muted      bg-surface-2',
  no_show:   'text-red-500    bg-red-500/10',
}

const SORT_OPTIONS = [
  { value: 'recent',       label: 'Recent' },
  { value: 'visits_desc',  label: 'Most visits' },
  { value: 'visits_asc',   label: 'Fewest visits' },
  { value: 'noshows_desc', label: 'Most no-shows' },
  { value: 'name_asc',     label: 'Alphabetical' },
]

const AVAILABLE_TAGS = ['regular', 'new', 'birthday', 'allergies', 'window-seat', 'quiet-table', 'high-spender', 'group-booker', 'no-show-risk']

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl px-5 py-4">
      <p className="text-2xl font-bold text-text">{value}</p>
      <p className="text-xs text-muted mt-1 font-medium">{label}</p>
      {sub && <p className="text-xs text-muted/60 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto_auto] gap-4 px-5 py-4 border-b border-border animate-pulse">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-surface-2 shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="w-28 h-3.5 bg-surface-2 rounded-md" />
          <div className="w-20 h-3 bg-surface-2/70 rounded-md" />
        </div>
      </div>
      <div className="w-28 h-4 bg-surface-2 rounded-md self-center" />
      <div className="w-8 h-4 bg-surface-2 rounded-md self-center mx-auto" />
      <div className="w-8 h-4 bg-surface-2 rounded-md self-center mx-auto" />
      <div className="w-16 h-5 bg-surface-2 rounded-full self-center" />
      <div className="w-4 h-4 bg-surface-2 rounded self-center" />
    </div>
  )
}

// ─── Guest side panel ─────────────────────────────────────────────────────────

function GuestPanel({
  guest, token, onClose, onUpdated,
}: {
  guest: Guest
  token: string
  onClose:   () => void
  onUpdated: (g: Guest) => void
}) {
  const t = useT()
  const [detail,    setDetail]    = useState<GuestDetail | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [notes,     setNotes]     = useState(guest.notes ?? '')
  const [isVip,     setIsVip]     = useState(guest.isVip)
  const [isBlocked, setIsBlocked] = useState(guest.isBlocked)
  const [tags,      setTags]      = useState<string[]>(guest.tags)
  const [tagInput,  setTagInput]  = useState('')

  const restaurantId = (() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('stolik_active_restaurant') : null
    if (raw) { try { return JSON.parse(raw)?.id ?? null } catch {} }
    return null
  })()

  useEffect(() => {
    if (!restaurantId) return
    fetch(`${API}/api/guests/${restaurantId}/${guest.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((d: GuestDetail) => {
        setDetail(d)
        setNotes(d.notes ?? '')
        setIsVip(d.isVip)
        setIsBlocked(d.isBlocked)
        setTags(d.tags ?? [])
      })
      .finally(() => setLoading(false))
  }, [guest.id, restaurantId, token])

  async function save() {
    if (!restaurantId) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/guests/${restaurantId}/${guest.id}`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ notes, isVip, isBlocked, tags }),
      })
      const updated = await res.json()
      onUpdated(updated)
    } finally { setSaving(false) }
  }

  function addTag(tag: string) {
    const t = tag.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag))
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-10 w-full max-w-[440px] h-full bg-surface border-l border-border flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-text text-lg">{guest.name ?? t.noName}</h2>
              {isVip     && <Star     size={14} className="text-yellow-400 fill-yellow-400 shrink-0" />}
              {isBlocked && <ShieldOff size={14} className="text-red-400 shrink-0" />}
            </div>
            <p className="text-sm text-muted mt-0.5 font-mono">{guest.phone}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Contact */}
          <div className="px-6 py-4 border-b border-border space-y-2.5">
            {guest.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail size={13} className="text-muted shrink-0" />
                <span className="text-text">{guest.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Phone size={13} className="text-muted shrink-0" />
              <span className="text-text font-mono">{guest.phone}</span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { label: t.visits,    value: guest.visitCount },
                { label: t.noShowStat, value: guest.noShowCount },
                { label: t.lastVisit, value: guest.lastVisit
                    ? format(parseISO(guest.lastVisit), 'd MMM', { locale: pl })
                    : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface-2 border border-border rounded-lg p-3 text-center">
                  <p className="text-base font-bold text-text">{value}</p>
                  <p className="text-xs text-muted mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* VIP / Blocked toggles */}
          <div className="px-6 py-4 border-b border-border space-y-2">
            {([
              { label: t.vip, icon: Star, state: isVip, toggle: () => setIsVip(v => !v),
                activeClass: 'border-yellow-400/30 bg-yellow-400/5', dotClass: 'bg-yellow-400', iconClass: 'text-yellow-400' },
              { label: t.blocked, icon: ShieldOff, state: isBlocked, toggle: () => setIsBlocked(v => !v),
                activeClass: 'border-red-400/30 bg-red-400/5', dotClass: 'bg-red-500', iconClass: 'text-red-400' },
            ] as const).map(({ label, icon: Icon, state, toggle, activeClass, dotClass, iconClass }) => (
              <button
                key={label}
                type="button"
                onClick={toggle}
                className={clsx(
                  'w-full flex items-center justify-between px-4 py-2.5 rounded-lg border transition-colors text-sm',
                  state ? activeClass : 'border-border hover:bg-surface-2'
                )}
              >
                <span className="flex items-center gap-2 text-text font-medium">
                  <Icon size={14} className={state ? iconClass : 'text-muted'} />
                  {label}
                </span>
                <div className={clsx(
                  'w-9 h-5 rounded-full transition-colors relative shrink-0',
                  state ? dotClass : 'bg-surface-2 border border-border'
                )}>
                  <div className={clsx(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                    state ? 'translate-x-4' : 'translate-x-0.5'
                  )} />
                </div>
              </button>
            ))}
          </div>

          {/* Tags */}
          <div className="px-6 py-4 border-b border-border">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              <Tag size={11} /> Tags
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-1 text-xs px-2 py-0.5 bg-accent/10 text-accent border border-accent/20 rounded-full"
                >
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            {/* Quick-add standard tags */}
            <div className="flex flex-wrap gap-1 mb-2">
              {AVAILABLE_TAGS.filter(t => !tags.includes(t)).map(tag => (
                <button
                  key={tag}
                  onClick={() => addTag(tag)}
                  className="text-xs px-2 py-0.5 bg-surface-2 border border-border text-muted hover:text-text hover:border-accent/40 rounded-full transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
            {/* Custom tag input */}
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }}
              placeholder="Custom tag, press Enter"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Notes */}
          <div className="px-6 py-4 border-b border-border">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              <StickyNote size={11} /> {t.note}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder={t.notePlaceholder}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder-muted focus:outline-none focus:border-accent transition-colors resize-none"
            />
          </div>

          {/* Booking history */}
          <div className="px-6 py-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              <CalendarDays size={11} /> {t.bookingHistory}
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-10 text-muted gap-2">
                <RefreshCw size={14} className="animate-spin" /> {t.loading}
              </div>
            ) : !detail?.bookings.length ? (
              <p className="text-sm text-muted text-center py-8">{t.noHistory}</p>
            ) : (
              <div className="space-y-2">
                {detail.bookings.map(b => (
                  <div key={b.id} className="bg-surface-2 border border-border rounded-lg px-4 py-3 flex items-center gap-3">
                    <div className="text-center shrink-0 w-12">
                      <p className="text-xs font-bold text-text">
                        {format(parseISO(b.date), 'd MMM', { locale: pl })}
                      </p>
                      <p className="text-xs text-muted">{b.time}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={clsx('text-xs px-1.5 py-0.5 rounded font-medium', STATUS_COLORS[b.status])}>
                          {({
                            confirmed: t.confirmed,
                            pending:   t.pending,
                            cancelled: t.cancelled,
                            completed: t.completed,
                            no_show:   t.no_show,
                          } as Record<string, string>)[b.status] ?? b.status}
                        </span>
                        {b.table && <span className="text-xs text-muted">{t.table} {b.table.name}</span>}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-muted">
                        <Users size={10} /> {b.guestCount} os.
                        {b.notes && <span className="ml-1 italic truncate text-yellow-500/70">· {b.notes}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-border font-mono">{b.bookingRef}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Save */}
        <div className="px-6 py-4 border-t border-border">
          <button
            onClick={save}
            disabled={saving}
            className="w-full py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {saving ? t.saving : t.save}
          </button>
        </div>
      </aside>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GuestsPage() {
  const router = useRouter()
  const t      = useT()

  const [token,    setToken]    = useState<string | null>(null)
  const [guests,   setGuests]   = useState<Guest[]>([])
  const [stats,    setStats]    = useState<GuestStats | null>(null)
  const [search,   setSearch]   = useState('')
  const [vipOnly,  setVipOnly]  = useState(false)
  const [sortBy,   setSortBy]   = useState('recent')
  const [tagFilter, setTagFilter] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [selected, setSelected] = useState<Guest | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showSort, setShowSort] = useState(false)

  useEffect(() => {
    const tok = localStorage.getItem('stolik_token')
    if (!tok) { router.push('/login'); return }
    setToken(tok)
    const stored = localStorage.getItem('stolik_active_restaurant')
    if (stored) { try { setActiveId(JSON.parse(stored)?.id) } catch {} }
  }, [router])

  const fetchGuests = useCallback(async (restaurantId: string, q = '', vip = false, sort = 'recent', tag = '') => {
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q)    params.set('search', q)
      if (vip)  params.set('vip', 'true')
      if (sort) params.set('sort', sort)
      if (tag)  params.set('tag', tag)
      const res  = await fetch(`${API}/api/guests/${restaurantId}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.guests) {
        setGuests(data.guests)
        setStats(data.stats)
      } else {
        // legacy flat array
        setGuests(Array.isArray(data) ? data : [])
      }
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    if (activeId) fetchGuests(activeId, search, vipOnly, sortBy, tagFilter)
  }, [activeId, fetchGuests]) // eslint-disable-line

  // debounce search / filters
  useEffect(() => {
    if (!activeId) return
    const id = setTimeout(() => fetchGuests(activeId, search, vipOnly, sortBy, tagFilter), 300)
    return () => clearTimeout(id)
  }, [search, vipOnly, sortBy, tagFilter, activeId, fetchGuests])

  function handleGuestUpdated(updated: Guest) {
    setGuests(prev => prev.map(g => g.id === updated.id ? { ...g, ...updated } : g))
    setSelected(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
  }

  function exportCSV() {
    const headers = ['Name', 'Phone', 'Email', 'VIP', 'Visits', 'No-shows', 'Tags', 'Last Visit']
    const rows = guests.map(g => [
      g.name ?? '',
      g.phone,
      g.email ?? '',
      g.isVip ? 'Yes' : 'No',
      g.visitCount,
      g.noShowCount,
      g.tags.join(';'),
      g.lastVisit ? format(parseISO(g.lastVisit), 'yyyy-MM-dd') : '',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'guests.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Sort'

  if (!token) return null

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-border bg-surface px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-text">Guests</h1>
          <p className="text-sm text-muted mt-0.5">Guest database and CRM</p>
        </div>
        {guests.length > 0 && (
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-surface-2 border border-border rounded-lg text-sm text-text hover:bg-surface-2/80 transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
        )}
      </header>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-8 py-6">

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Guests"  value={stats.totalGuests} />
            <StatCard label="VIP Guests"    value={stats.vipCount} sub="⭐ marked as VIP" />
            <StatCard label="Repeat Rate"   value={`${stats.repeatRate}%`} sub="guests with 2+ visits" />
            <StatCard label="Avg Visits"    value={stats.avgVisits} sub="per guest" />
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name, phone, or email..."
              className="w-full bg-surface border border-border rounded-lg pl-9 pr-9 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors">
                <X size={14} />
              </button>
            )}
          </div>

          {/* VIP toggle */}
          <button
            onClick={() => setVipOnly(v => !v)}
            className={clsx(
              'flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border text-sm transition-colors',
              vipOnly
                ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400'
                : 'bg-surface border-border text-muted hover:text-text'
            )}
          >
            <Star size={13} className={vipOnly ? 'fill-yellow-400' : ''} />
            VIP only
          </button>

          {/* Tag filter */}
          <select
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-accent transition-colors"
          >
            <option value="">All tags</option>
            {AVAILABLE_TAGS.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setShowSort(v => !v)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-surface border border-border rounded-lg text-sm text-text hover:bg-surface-2 transition-colors"
            >
              {sortLabel} <ChevronDown size={13} className="text-muted" />
            </button>
            {showSort && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border rounded-xl shadow-xl z-20 py-1">
                {SORT_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => { setSortBy(o.value); setShowSort(false) }}
                    className={clsx(
                      'w-full text-left px-4 py-2 text-sm transition-colors',
                      sortBy === o.value ? 'text-accent bg-accent/8' : 'text-text hover:bg-surface-2'
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto_auto] gap-4 px-5 py-3 border-b border-border bg-surface-2/40">
            {[t.guest, t.phone, t.visits, t.noShowStat, t.status, ''].map((h, i) => (
              <span key={i} className={clsx(
                'text-xs font-semibold text-muted uppercase tracking-wider',
                i >= 2 && i <= 3 && 'text-center'
              )}>
                {h}
              </span>
            ))}
          </div>

          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
          ) : guests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted gap-3">
              <p className="text-4xl">👥</p>
              <p className="text-sm">{search || vipOnly || tagFilter ? t.noResults : t.noGuests}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {guests.map(guest => (
                <button
                  key={guest.id}
                  onClick={() => setSelected(guest)}
                  className="w-full grid grid-cols-[2fr_1.5fr_1fr_1fr_auto_auto] gap-4 px-5 py-3.5 text-left hover:bg-surface-2/40 transition-colors items-center group"
                >
                  {/* Name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-accent/12 border border-accent/20 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                      {(guest.name ?? guest.phone)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text truncate">
                        {guest.name ?? <span className="text-muted italic font-normal">{t.noName}</span>}
                      </p>
                      {guest.lastVisit && (
                        <p className="text-xs text-muted">
                          {format(parseISO(guest.lastVisit), 'd MMM yyyy', { locale: pl })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Phone */}
                  <span className="text-sm text-muted font-mono">{guest.phone}</span>

                  {/* Visits */}
                  <span className="text-sm font-bold text-text text-center">{guest.visitCount}</span>

                  {/* No-show */}
                  <div className="text-sm text-center">
                    {guest.noShowCount > 0 ? (
                      <span className="text-red-400 font-semibold">{guest.noShowCount}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5">
                    {guest.isVip && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 font-medium">
                        <Star size={10} className="fill-yellow-400" /> {t.vip}
                      </span>
                    )}
                    {guest.isBlocked && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                        <ShieldOff size={10} /> {t.blocked}
                      </span>
                    )}
                    {guest.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 rounded-full bg-surface-2 border border-border text-muted">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <ChevronRight size={14} className="text-border group-hover:text-muted transition-colors" />
                </button>
              ))}
            </div>
          )}

          {/* Footer */}
          {guests.length > 0 && (
            <div className="px-5 py-3 border-t border-border bg-surface-2/20 text-xs text-muted">
              {t.guestsCount(guests.length)}
            </div>
          )}
        </div>
      </div>

      {/* Panel */}
      {selected && token && (
        <GuestPanel
          guest={selected}
          token={token}
          onClose={() => setSelected(null)}
          onUpdated={handleGuestUpdated}
        />
      )}
    </div>
  )
}
