'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Search, ChevronLeft, ChevronRight, BookOpen,
  Users, Phone, Globe, Layout, MoreVertical, Check, X, Clock, AlertTriangle,
  Download, Bell, List,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableRowSkeleton } from '@/components/shared/LoadingSkeleton'
import { NewBookingModal } from '@/components/bookings/NewBookingModal'
import { api } from '@/lib/api'
import { useMyRestaurant } from '@/hooks/useRestaurant'
import { exportToCSV } from '@/lib/export'
import { useT } from '@/lib/i18n'

interface Booking {
  id: string
  bookingRef: string
  guestName: string
  guestPhone: string
  guestEmail?: string
  date: string
  time: string
  guestCount: number
  partySize?: number
  status: string
  notes?: string
  specialRequests?: string
  seatingPreference?: string
  allergies?: string[]
  isBirthdayBooking?: boolean
  source: string
  table?: { name: string; zone?: string }
}

interface Stats {
  confirmed: number
  pending:   number
  cancelled: number
  noShow:    number
  completed: number
}

interface ApiResponse {
  bookings: Booking[]
  total:    number
  page:     number
  pages:    number
  stats?:   Stats
}

const STATUS_CHIPS = [
  { key: '',          label: 'All',       statKey: null },
  { key: 'confirmed', label: 'Confirmed', statKey: 'confirmed' as keyof Stats },
  { key: 'pending',   label: 'Pending',   statKey: 'pending'   as keyof Stats },
  { key: 'cancelled', label: 'Cancelled', statKey: 'cancelled' as keyof Stats },
  { key: 'no_show',   label: 'No-show',   statKey: 'noShow'    as keyof Stats },
  { key: 'completed', label: 'Completed', statKey: 'completed' as keyof Stats },
]

const SORT_OPTIONS = [
  { value: 'date_desc',  label: 'Date (newest)' },
  { value: 'date_asc',   label: 'Date (oldest)' },
  { value: 'name_asc',   label: 'Guest name A–Z' },
  { value: 'status_asc', label: 'Status' },
]

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  phone:     <Phone size={13} />,
  web:       <Globe size={13} />,
  widget:    <Layout size={13} />,
  dashboard: <Users size={13} />,
  mobile:    <Phone size={13} />,
}

function formatDateShort(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    })
  } catch { return dateStr }
}

function DropdownMenu({
  bookingId,
  status,
  onAction,
}: {
  bookingId: string
  status: string
  onAction: (id: string, newStatus: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const t = useT()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const actions = [
    status !== 'confirmed' && { label: t.confirm,      next: 'confirmed', icon: <Check size={13} />,         cls: 'text-accent' },
    status !== 'cancelled' && { label: t.cancel,        next: 'cancelled', icon: <X size={13} />,             cls: 'text-error' },
    status !== 'no_show'   && { label: t.markNoShow,    next: 'no_show',   icon: <AlertTriangle size={13} />, cls: 'text-amber' },
    status !== 'completed' && { label: t.completed,     next: 'completed', icon: <Clock size={13} />,         cls: 'text-muted' },
  ].filter(Boolean) as { label: string; next: string; icon: React.ReactNode; cls: string }[]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded hover:bg-surface-2 text-muted hover:text-text transition-colors"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border rounded-card shadow-md z-20 py-1">
          {actions.map(action => (
            <button
              key={action.next}
              onClick={() => { onAction(bookingId, action.next); setOpen(false) }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-surface-2 transition-colors ${action.cls}`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface WaitlistEntry {
  id: string
  guestName: string
  guestPhone: string
  guestEmail?: string
  date: string
  timeSlot: string
  partySize: number
  status: string
  notifiedAt?: string
  createdAt: string
}

const PER_PAGE = 20

function WaitlistTab({ restaurantId }: { restaurantId: string }) {
  const t = useT()
  const [entries, setEntries]     = useState<WaitlistEntry[]>([])
  const [loading, setLoading]     = useState(true)
  const [notifying, setNotifying] = useState<string | null>(null)
  const [date, setDate]           = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('stolik_token') || localStorage.getItem('token')
      const url = `/api/restaurants/${restaurantId}/waitlist` + (date ? `?date=${date}` : '')
      const apiBase = process.env.NEXT_PUBLIC_API_URL || ''
      const res = await fetch(apiBase + url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed')
      setEntries(await res.json())
    } catch { setEntries([]) } finally { setLoading(false) }
  }, [restaurantId, date])

  useEffect(() => { load() }, [load])

  async function handleNotify(entryId: string) {
    setNotifying(entryId)
    try {
      const token = localStorage.getItem('stolik_token') || localStorage.getItem('token')
      const apiBase = process.env.NEXT_PUBLIC_API_URL || ''
      await fetch(`${apiBase}/api/restaurants/${restaurantId}/waitlist/${entryId}/notify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: 'notified', notifiedAt: new Date().toISOString() } : e))
    } finally { setNotifying(null) }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="px-2 py-2 text-xs bg-surface border border-border rounded-btn text-text focus:outline-none focus:border-accent"
        />
        <button onClick={load} className="px-3 py-2 text-xs bg-surface border border-border rounded-btn text-muted hover:text-text transition-colors">
          {t.refresh}
        </button>
      </div>

      <div className="bg-surface border border-border rounded-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2/40">
              {[t.guest, 'Date / Time', t.waitlistPartySize, t.waitlistStatus, t.waitlistJoinedAt, ''].map((h, i) => (
                <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">{t.loading}</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">{t.waitlistEmpty}</td></tr>
            ) : entries.map(e => (
              <tr key={e.id} className="border-b border-border hover:bg-surface-2/40 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-semibold text-text">{e.guestName}</p>
                  <p className="text-xs text-muted">{e.guestPhone}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-text">{new Date(e.date).toLocaleDateString()}</p>
                  <p className="text-xs text-muted">{e.timeSlot}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-text">
                    <Users size={13} className="text-muted" />
                    <span>{e.partySize}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-chip text-xs font-semibold ${
                    e.status === 'notified' ? 'bg-accent/15 text-accent' :
                    e.status === 'expired'  ? 'bg-surface-2 text-muted' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {e.status === 'notified' ? t.waitlistNotified : e.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {new Date(e.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-3">
                  {e.status === 'waiting' && (
                    <button
                      onClick={() => handleNotify(e.id)}
                      disabled={notifying === e.id}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-accent hover:bg-accent-hover text-white rounded-btn transition-colors disabled:opacity-50"
                    >
                      <Bell size={11} />
                      {notifying === e.id ? t.waitlistNotifying : t.waitlistNotify}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function BookingsPage() {
  const { restaurant } = useMyRestaurant()
  const t = useT()
  const [activeTab, setActiveTab] = useState<'bookings' | 'waitlist'>('bookings')

  const [bookings, setBookings]       = useState<Booking[]>([])
  const [stats, setStats]             = useState<Stats | null>(null)
  const [total, setTotal]             = useState(0)
  const [pages, setPages]             = useState(1)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [page, setPage]               = useState(1)
  const [status, setStatus]           = useState('')
  const [search, setSearch]           = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [from, setFrom]               = useState('')
  const [to, setTo]                   = useState('')
  const [sort, setSort]               = useState('date_desc')
  const [hasAllergies, setHasAllergies] = useState(false)
  const [showModal, setShowModal]     = useState(false)
  const [updating, setUpdating]       = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!restaurant?.id) return
    setLoading(true)
    setError(null)
    try {
      const parts = sort.split('_')
      const sortOrder = parts[parts.length - 1] === 'asc' ? 'asc' : 'desc'
      const sortBy    = parts.slice(0, -1).join('_') || 'date'

      const res = await api.get<ApiResponse | Booking[]>('/api/bookings', {
        restaurantId: restaurant.id,
        status:    status || undefined,
        from:      from   || undefined,
        to:        to     || undefined,
        search:    search || undefined,
        page,
        limit:     PER_PAGE,
        sortBy,
        sortOrder,
      })

      if (Array.isArray(res)) {
        setBookings(res)
        setTotal(res.length)
        setPages(1)
      } else {
        setBookings((res as ApiResponse).bookings ?? [])
        setTotal((res as ApiResponse).total ?? 0)
        setPages((res as ApiResponse).pages ?? 1)
        const s = (res as ApiResponse).stats
        if (s) setStats(s)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [restaurant?.id, status, from, to, search, page, sort])

  useEffect(() => { load() }, [load])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  async function handleStatusChange(id: string, newStatus: string) {
    setUpdating(id)
    try {
      await api.patch(`/api/bookings/${id}/status`, { status: newStatus })
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b))
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(null)
    }
  }

  const rowStart = (page - 1) * PER_PAGE + 1
  const rowEnd   = Math.min(page * PER_PAGE, total)

  return (
    <div>
      <PageHeader
        title={t.bookings}
        description={total > 0 ? t.bookingsCount(total) : undefined}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToCSV(
                bookings.map(b => ({
                  ref: b.bookingRef,
                  guest: b.guestName,
                  phone: b.guestPhone,
                  email: b.guestEmail ?? '',
                  date: b.date,
                  time: b.time,
                  guests: b.guestCount ?? b.partySize ?? 0,
                  status: b.status,
                  table: b.table?.name ?? '',
                  source: b.source,
                })),
                'bookings',
                [
                  { key: 'ref', label: 'Booking Ref' },
                  { key: 'guest', label: 'Guest' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'email', label: 'Email' },
                  { key: 'date', label: 'Date' },
                  { key: 'time', label: 'Time' },
                  { key: 'guests', label: 'Guests' },
                  { key: 'status', label: 'Status' },
                  { key: 'table', label: 'Table' },
                  { key: 'source', label: 'Source' },
                ],
              )}
              className="flex items-center gap-1.5 px-3 py-2 border border-border bg-surface hover:bg-surface-2 text-muted hover:text-text text-sm font-semibold rounded-btn transition-colors"
            >
              <Download size={14} /> {t.exportCsv}
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-btn transition-colors"
            >
              + {t.newBooking}
            </button>
          </div>
        }
      />

      {/* Tab switcher */}
      <div className="flex items-center gap-1 mb-5 border-b border-border">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${activeTab === 'bookings' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-text'}`}
        >
          <List size={14} /> {t.bookings}
        </button>
        <button
          onClick={() => setActiveTab('waitlist')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${activeTab === 'waitlist' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-text'}`}
        >
          <Bell size={14} /> {t.waitlistTab}
        </button>
      </div>

      {activeTab === 'waitlist' && restaurant?.id && (
        <WaitlistTab restaurantId={restaurant.id} />
      )}

      {activeTab === 'bookings' && <>

      {/* Status filter chips */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {STATUS_CHIPS.map(chip => {
          const count  = chip.statKey && stats ? stats[chip.statKey] : null
          const active = status === chip.key
          return (
            <button
              key={chip.key}
              onClick={() => { setStatus(chip.key); setPage(1) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-chip transition-colors ${
                active
                  ? 'bg-accent text-white'
                  : 'border border-border bg-surface hover:bg-surface-2 text-muted hover:text-text'
              }`}
            >
              {chip.label}
              {count !== null && count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                    active ? 'bg-white/25' : 'bg-surface-2'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
        <button
          onClick={() => { setHasAllergies(a => !a); setPage(1) }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-chip transition-colors ${
            hasAllergies
              ? 'bg-red-500 text-white'
              : 'border border-border bg-surface hover:bg-surface-2 text-muted hover:text-text'
          }`}
        >
          <AlertTriangle size={11} />
          Has allergies
        </button>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border rounded-btn text-text placeholder:text-muted focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted whitespace-nowrap">From</label>
          <input
            type="date"
            value={from}
            onChange={e => { setFrom(e.target.value); setPage(1) }}
            className="px-2 py-2 text-xs bg-surface border border-border rounded-btn text-text focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted whitespace-nowrap">To</label>
          <input
            type="date"
            value={to}
            onChange={e => { setTo(e.target.value); setPage(1) }}
            className="px-2 py-2 text-xs bg-surface border border-border rounded-btn text-text focus:outline-none focus:border-accent"
          />
        </div>

        <select
          value={sort}
          onChange={e => { setSort(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm bg-surface border border-border rounded-btn text-text focus:outline-none focus:border-accent"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-card bg-error/10 border border-error/30 text-sm text-error flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="text-xs underline">{t.refresh}</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface border border-border rounded-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2/40">
              {['Code', t.guest, 'Date & Time', t.persons, t.table, 'Source', t.status, ''].map((h, i) => (
                <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={8} />)
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    icon={BookOpen}
                    title={t.noResults}
                    description="Try adjusting your filters or date range"
                  />
                </td>
              </tr>
            ) : (
              bookings
              .filter(b => !hasAllergies || (b.allergies && b.allergies.length > 0))
              .map(b => {
                const partySize = b.partySize ?? b.guestCount
                const isPending = b.status === 'pending'
                const isDimmed  = b.status === 'cancelled' || b.status === 'no_show'
                return (
                  <tr
                    key={b.id}
                    className={[
                      'border-b border-border last:border-0 transition-colors hover:bg-surface-2/60',
                      isPending && 'border-l-2 border-l-warning',
                      isDimmed  && 'opacity-55',
                      updating === b.id && 'opacity-40 pointer-events-none',
                    ].filter(Boolean).join(' ')}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted">{b.bookingRef}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-text">{b.guestName}</p>
                        {b.isBirthdayBooking && (
                          <span title={t.birthdayBookingBadge}
                            className="flex items-center gap-0.5 px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-chip text-[10px] font-bold">
                            🎂 {t.birthdayBookingBadge}
                          </span>
                        )}
                        {b.allergies && b.allergies.length > 0 && (
                          <span title={b.allergies.join(', ')}
                            className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 text-red-600 rounded-chip text-[10px] font-bold">
                            <AlertTriangle size={9} />
                            {b.allergies.length}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-0.5">{b.guestPhone}</p>
                      {(b.specialRequests || b.seatingPreference) && (
                        <p className="text-xs text-accent mt-0.5 truncate max-w-[180px]">
                          {[b.seatingPreference, b.specialRequests].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-text">{formatDateShort(b.date)}</p>
                      <p className="text-xs text-muted">{b.time}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-text">
                        <Users size={13} className="text-muted" />
                        <span>{partySize}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {b.table ? (
                        <div>
                          <p className="text-xs text-text">{b.table.name}</p>
                          {b.table.zone && (
                            <span className="text-[10px] text-muted bg-surface-2 px-1.5 py-0.5 rounded-chip">
                              {b.table.zone}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-muted text-xs capitalize">
                        {SOURCE_ICONS[b.source] ?? <Phone size={13} />}
                        {b.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-3 py-3">
                      <DropdownMenu
                        bookingId={b.id}
                        status={b.status}
                        onAction={handleStatusChange}
                      />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted">
            {loading ? t.loading : `Showing ${rowStart}–${rowEnd} of ${total}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-2 rounded-btn border border-border hover:bg-surface-2 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-text font-medium px-2">
              {page} / {pages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page >= pages || loading}
              className="p-2 rounded-btn border border-border hover:bg-surface-2 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      </> /* end bookings tab */}

      {showModal && restaurant?.id && (
        <NewBookingModal
          restaurantId={restaurant.id}
          onClose={() => setShowModal(false)}
          onCreated={load}
        />
      )}
    </div>
  )
}
