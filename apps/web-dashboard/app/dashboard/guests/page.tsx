'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  Search, Star, ShieldOff, X, Phone, Mail, Tag,
  CalendarDays, Users, ChevronRight, StickyNote, RefreshCw,
} from 'lucide-react'
import clsx from 'clsx'

const API = 'http://localhost:3001'

// ─── Types ────────────────────────────────────────────────────────────────────

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

type Restaurant = { id: string; name: string; emoji?: string }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'text-green-400 bg-green-400/10',
  pending:   'text-yellow-400 bg-yellow-400/10',
  cancelled: 'text-red-400 bg-red-400/10',
  completed: 'text-[#6B8F6E] bg-[#2A3D2C]/60',
  no_show:   'text-red-500 bg-red-500/10',
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Potwierdzona',
  pending:   'Oczekuje',
  cancelled: 'Anulowana',
  completed: 'Zakończona',
  no_show:   'No-show',
}

function NoShowRate({ visits, noShows }: { visits: number; noShows: number }) {
  if (visits === 0) return <span className="text-[#6B8F6E]">—</span>
  const rate = Math.round((noShows / visits) * 100)
  return (
    <span className={rate > 25 ? 'text-red-400' : 'text-[#6B8F6E]'}>
      {noShows} {rate > 0 && <span className="text-xs">({rate}%)</span>}
    </span>
  )
}

// ─── Side panel ──────────────────────────────────────────────────────────────

function GuestPanel({
  guest,
  restaurantId,
  token,
  onClose,
  onUpdated,
}: {
  guest: Guest
  restaurantId: string
  token: string
  onClose: () => void
  onUpdated: (g: Guest) => void
}) {
  const [detail,  setDetail]  = useState<GuestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [notes,   setNotes]   = useState(guest.notes ?? '')
  const [isVip,   setIsVip]   = useState(guest.isVip)
  const [isBlocked, setIsBlocked] = useState(guest.isBlocked)

  useEffect(() => {
    fetch(`${API}/api/guests/${restaurantId}/${guest.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((d: GuestDetail) => { setDetail(d); setNotes(d.notes ?? ''); setIsVip(d.isVip); setIsBlocked(d.isBlocked) })
      .finally(() => setLoading(false))
  }, [guest.id, restaurantId, token])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/guests/${restaurantId}/${guest.id}`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ notes, isVip, isBlocked }),
      })
      const updated = await res.json()
      onUpdated(updated)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <aside className="relative z-10 w-full max-w-md h-full bg-[#1C2B1E] border-l border-[#2A3D2C] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#2A3D2C]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-[#E8F0E9] text-lg">
                {guest.name ?? 'Nieznany gość'}
              </h2>
              {isVip && <Star size={14} className="text-yellow-400 fill-yellow-400" />}
              {isBlocked && <ShieldOff size={14} className="text-red-400" />}
            </div>
            <p className="text-sm text-[#6B8F6E] mt-0.5">{guest.phone}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#6B8F6E] hover:text-[#E8F0E9] hover:bg-[#2A3D2C] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Info */}
          <div className="px-6 py-4 space-y-3 border-b border-[#2A3D2C]">
            {guest.email && (
              <div className="flex items-center gap-2 text-sm text-[#6B8F6E]">
                <Mail size={13} className="shrink-0" />
                <span className="text-[#E8F0E9]">{guest.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-[#6B8F6E]">
              <Phone size={13} className="shrink-0" />
              <span className="text-[#E8F0E9]">{guest.phone}</span>
            </div>
            {guest.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag size={13} className="text-[#6B8F6E] shrink-0" />
                {guest.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-[#2A3D2C] text-[#6B8F6E] rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { label: 'Wizyty',   value: guest.visitCount },
                { label: 'No-show',  value: guest.noShowCount },
                { label: 'Ostatnia', value: guest.lastVisit
                    ? format(parseISO(guest.lastVisit), 'd MMM', { locale: pl })
                    : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#131A14] rounded-lg p-3 text-center">
                  <p className="text-base font-semibold text-[#E8F0E9]">{value}</p>
                  <p className="text-xs text-[#6B8F6E]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="px-6 py-4 border-b border-[#2A3D2C] space-y-3">
            {[
              { label: 'VIP',     icon: Star,      state: isVip,      set: setIsVip,      activeClass: 'border-yellow-400/40 bg-yellow-400/5' },
              { label: 'Zablokowany', icon: ShieldOff, state: isBlocked, set: setIsBlocked, activeClass: 'border-red-400/40 bg-red-400/5' },
            ].map(({ label, icon: Icon, state, set, activeClass }) => (
              <button
                key={label}
                type="button"
                onClick={() => set(v => !v)}
                className={clsx(
                  'w-full flex items-center justify-between px-4 py-2.5 rounded-lg border transition-colors text-sm',
                  state ? activeClass : 'border-[#2A3D2C] bg-transparent hover:bg-[#2A3D2C]/40',
                )}
              >
                <span className="flex items-center gap-2 text-[#E8F0E9]">
                  <Icon size={14} className={state ? (label === 'VIP' ? 'text-yellow-400' : 'text-red-400') : 'text-[#6B8F6E]'} />
                  {label}
                </span>
                <div className={clsx(
                  'w-9 h-5 rounded-full transition-colors relative',
                  state ? (label === 'VIP' ? 'bg-yellow-400' : 'bg-red-500') : 'bg-[#2A3D2C]'
                )}>
                  <div className={clsx(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                    state ? 'translate-x-4' : 'translate-x-0.5'
                  )} />
                </div>
              </button>
            ))}
          </div>

          {/* Notes */}
          <div className="px-6 py-4 border-b border-[#2A3D2C]">
            <label className="flex items-center gap-1.5 text-xs font-medium text-[#6B8F6E] uppercase tracking-wider mb-2">
              <StickyNote size={11} /> Notatka
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Preferencje, alergie, ważne informacje…"
              className="w-full bg-[#131A14] border border-[#2A3D2C] rounded-lg px-3 py-2 text-sm text-[#E8F0E9] placeholder-[#6B8F6E] focus:outline-none focus:border-[#2D6A35] transition-colors resize-none"
            />
          </div>

          {/* Booking history */}
          <div className="px-6 py-4">
            <p className="text-xs font-medium text-[#6B8F6E] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CalendarDays size={11} /> Historia rezerwacji
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-[#6B8F6E]">
                <RefreshCw size={16} className="animate-spin mr-2" /> Ładowanie…
              </div>
            ) : !detail?.bookings.length ? (
              <p className="text-sm text-[#6B8F6E] text-center py-6">Brak historii rezerwacji</p>
            ) : (
              <div className="space-y-2">
                {detail.bookings.map(b => (
                  <div key={b.id} className="bg-[#131A14] rounded-lg px-4 py-3 flex items-center gap-3">
                    <div className="text-center shrink-0 w-12">
                      <p className="text-xs font-semibold text-[#E8F0E9]">
                        {format(parseISO(b.date), 'd MMM', { locale: pl })}
                      </p>
                      <p className="text-xs text-[#6B8F6E]">{b.time}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={clsx('text-xs px-1.5 py-0.5 rounded', STATUS_COLORS[b.status])}>
                          {STATUS_LABELS[b.status] ?? b.status}
                        </span>
                        {b.table && (
                          <span className="text-xs text-[#6B8F6E]">Stół {b.table.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-[#6B8F6E]">
                        <Users size={10} /> {b.guestCount} os.
                        {b.notes && <span className="ml-1 italic truncate text-yellow-500/70">· {b.notes}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-[#2A3D2C]">{b.bookingRef}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Save button */}
        <div className="px-6 py-4 border-t border-[#2A3D2C]">
          <button
            onClick={save}
            disabled={saving}
            className="w-full py-2.5 bg-[#2D6A35] hover:bg-[#378040] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
          </button>
        </div>
      </aside>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GuestsPage() {
  const router = useRouter()

  const [token,       setToken]       = useState<string | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [activeId,    setActiveId]    = useState<string | null>(null)
  const [guests,      setGuests]      = useState<Guest[]>([])
  const [search,      setSearch]      = useState('')
  const [loading,     setLoading]     = useState(false)
  const [selected,    setSelected]    = useState<Guest | null>(null)

  // ── auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = localStorage.getItem('stolik_token')
    if (!t) { router.push('/login'); return }
    setToken(t)
  }, [router])

  // ── restaurants ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return
    fetch(`${API}/api/restaurants`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: Restaurant[]) => {
        setRestaurants(data)
        if (data.length > 0) setActiveId(data[0].id)
      })
  }, [token])

  // ── guests ────────────────────────────────────────────────────────────────
  const fetchGuests = useCallback(async (restaurantId: string, q = '') => {
    if (!token) return
    setLoading(true)
    try {
      const params = q ? `?search=${encodeURIComponent(q)}` : ''
      const res = await fetch(`${API}/api/guests/${restaurantId}${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setGuests(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (activeId) fetchGuests(activeId, search)
  }, [activeId, fetchGuests]) // intentionally omit search — triggered via input

  // debounced search
  useEffect(() => {
    if (!activeId) return
    const id = setTimeout(() => fetchGuests(activeId, search), 300)
    return () => clearTimeout(id)
  }, [search, activeId, fetchGuests])

  function handleGuestUpdated(updated: Guest) {
    setGuests(prev => prev.map(g => g.id === updated.id ? { ...g, ...updated } : g))
    setSelected(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
  }

  if (!token) return null

  const activeRestaurant = restaurants.find(r => r.id === activeId)

  return (
    <div className="min-h-screen bg-[#131A14] text-[#E8F0E9]">

      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-[#2A3D2C] bg-[#1C2B1E] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-[#6B8F6E] hover:text-[#E8F0E9] transition-colors text-sm"
          >
            ← Dashboard
          </button>
          <div className="w-px h-4 bg-[#2A3D2C]" />
          <h1 className="font-semibold">
            {activeRestaurant?.emoji} {activeRestaurant?.name} — Goście
          </h1>
        </div>

        {restaurants.length > 1 && (
          <div className="flex gap-1">
            {restaurants.map(r => (
              <button
                key={r.id}
                onClick={() => { setActiveId(r.id); setSearch('') }}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm transition-colors',
                  activeId === r.id
                    ? 'bg-[#2D6A35] text-white'
                    : 'text-[#6B8F6E] hover:text-[#E8F0E9] hover:bg-[#2A3D2C]'
                )}
              >
                {r.emoji} {r.name}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* ── Search ─────────────────────────────────────────────────────── */}
        <div className="relative mb-6">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B8F6E]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj po imieniu lub telefonie…"
            className="w-full bg-[#1C2B1E] border border-[#2A3D2C] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#E8F0E9] placeholder-[#6B8F6E] focus:outline-none focus:border-[#2D6A35] transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B8F6E] hover:text-[#E8F0E9]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-[#6B8F6E]">
            <RefreshCw size={18} className="animate-spin mr-2" /> Ładowanie…
          </div>
        ) : guests.length === 0 ? (
          <div className="text-center py-24 text-[#6B8F6E]">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-sm">{search ? 'Brak wyników wyszukiwania' : 'Brak gości w bazie'}</p>
          </div>
        ) : (
          <div className="bg-[#1C2B1E] border border-[#2A3D2C] rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto_auto] gap-4 px-5 py-3 border-b border-[#2A3D2C] text-xs font-medium text-[#6B8F6E] uppercase tracking-wider">
              <span>Gość</span>
              <span>Telefon</span>
              <span className="text-center">Wizyty</span>
              <span className="text-center">No-show</span>
              <span>Status</span>
              <span />
            </div>

            {/* Rows */}
            <div className="divide-y divide-[#2A3D2C]">
              {guests.map(guest => (
                <button
                  key={guest.id}
                  onClick={() => setSelected(guest)}
                  className="w-full grid grid-cols-[2fr_1.5fr_1fr_1fr_auto_auto] gap-4 px-5 py-3.5 text-left hover:bg-[#2A3D2C]/40 transition-colors items-center group"
                >
                  {/* Name */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#2D6A35]/20 border border-[#2D6A35]/30 flex items-center justify-center text-xs font-semibold text-[#2D6A35] shrink-0">
                      {(guest.name ?? guest.phone)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#E8F0E9] truncate">
                        {guest.name ?? <span className="text-[#6B8F6E] italic">Brak nazwiska</span>}
                      </p>
                      {guest.lastVisit && (
                        <p className="text-xs text-[#6B8F6E]">
                          Ostatnia: {format(parseISO(guest.lastVisit), 'd MMM yyyy', { locale: pl })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Phone */}
                  <span className="text-sm text-[#6B8F6E] font-mono">{guest.phone}</span>

                  {/* Visits */}
                  <span className="text-sm text-[#E8F0E9] text-center font-medium">{guest.visitCount}</span>

                  {/* No-show */}
                  <div className="text-sm text-center">
                    <NoShowRate visits={guest.visitCount} noShows={guest.noShowCount} />
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5">
                    {guest.isVip && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                        <Star size={10} className="fill-yellow-400" /> VIP
                      </span>
                    )}
                    {guest.isBlocked && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                        <ShieldOff size={10} /> Zablok.
                      </span>
                    )}
                  </div>

                  <ChevronRight size={14} className="text-[#2A3D2C] group-hover:text-[#6B8F6E] transition-colors" />
                </button>
              ))}
            </div>

            {/* Footer count */}
            <div className="px-5 py-3 border-t border-[#2A3D2C] text-xs text-[#6B8F6E]">
              {guests.length} {guests.length === 1 ? 'gość' : 'gości'}
            </div>
          </div>
        )}
      </main>

      {/* ── Side panel ─────────────────────────────────────────────────────── */}
      {selected && token && activeId && (
        <GuestPanel
          guest={selected}
          restaurantId={activeId}
          token={token}
          onClose={() => setSelected(null)}
          onUpdated={handleGuestUpdated}
        />
      )}
    </div>
  )
}
