'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Search, ChevronLeft, ChevronRight, BookOpen,
  Users, Phone, Globe, Layout, MoreVertical, Check, X, Clock, AlertTriangle,
  Download,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableRowSkeleton } from '@/components/shared/LoadingSkeleton'
import { NewBookingModal } from '@/components/bookings/NewBookingModal'
import { api } from '@/lib/api'
import { useMyRestaurant } from '@/hooks/useRestaurant'
import { exportToCSV } from '@/lib/export'

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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const actions = [
    status !== 'confirmed' && { label: 'Confirm',      next: 'confirmed', icon: <Check size={13} />,         cls: 'text-accent' },
    status !== 'cancelled' && { label: 'Cancel',        next: 'cancelled', icon: <X size={13} />,             cls: 'text-error' },
    status !== 'no_show'   && { label: 'Mark No-show',  next: 'no_show',   icon: <AlertTriangle size={13} />, cls: 'text-amber' },
    status !== 'completed' && { label: 'Mark Complete', next: 'completed', icon: <Clock size={13} />,         cls: 'text-muted' },
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

const PER_PAGE = 20

export default function BookingsPage() {
  const { restaurant } = useMyRestaurant()

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
        title="Bookings"
        description={total > 0 ? `${total} total bookings` : undefined}
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
              <Download size={14} /> Export CSV
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-btn transition-colors"
            >
              + New Booking
            </button>
          </div>
        }
      />

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
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search guest, phone, ref..."
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
          <button onClick={load} className="text-xs underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface border border-border rounded-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2/40">
              {['Code', 'Guest', 'Date & Time', 'Party', 'Table', 'Source', 'Status', ''].map((h, i) => (
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
                    title="No bookings found"
                    description="Try adjusting your filters or date range"
                  />
                </td>
              </tr>
            ) : (
              bookings.map(b => {
                const partySize = b.partySize ?? b.guestCount
                const isPending = b.status === 'pending'
                const isDimmed  = b.status === 'cancelled' || b.status === 'no_show'
                return (
                  <tr
                    key={b.id}
                    className={[
                      'border-b border-border transition-colors hover:bg-green-50/40',
                      isPending && 'border-l-2 border-l-amber-400',
                      isDimmed  && 'opacity-60',
                      updating === b.id && 'opacity-40 pointer-events-none',
                    ].filter(Boolean).join(' ')}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted">{b.bookingRef}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-text">{b.guestName}</p>
                      <p className="text-xs text-muted mt-0.5">{b.guestPhone}</p>
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
            {loading ? 'Loading...' : `Showing ${rowStart}–${rowEnd} of ${total}`}
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
