'use client'
import { useEffect, useState, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight, Check, X, Clock, BookOpen } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableRowSkeleton } from '@/components/shared/LoadingSkeleton'
import { api } from '@/lib/api'
import { useMyRestaurant } from '@/hooks/useRestaurant'
import { formatDate } from '@/lib/utils'

const STATUSES = ['', 'pending', 'confirmed', 'cancelled', 'completed', 'no_show']

interface Booking {
  id: string
  bookingRef: string
  guestName: string
  guestPhone: string
  guestEmail?: string
  date: string
  time: string
  guestCount: number
  status: string
  notes?: string
  source: string
  table?: { name: string }
}

export default function BookingsPage() {
  const { restaurant } = useMyRestaurant()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const PER_PAGE = 20

  const load = useCallback(() => {
    if (!restaurant?.id) return
    setLoading(true)
    api.get<{ bookings: Booking[]; total: number } | Booking[]>('/api/bookings', {
      restaurantId: restaurant.id,
      status: status || undefined,
      page,
    }).then(res => {
      if (Array.isArray(res)) { setBookings(res); setTotal(res.length) }
      else {
        setBookings((res as { bookings: Booking[]; total: number }).bookings ?? [])
        setTotal((res as { bookings: Booking[]; total: number }).total ?? 0)
      }
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [restaurant?.id, status, page])

  useEffect(() => { load() }, [load])

  async function updateStatus(id: string, newStatus: string) {
    setUpdating(id)
    try {
      await api.patch(`/api/bookings/${id}/status`, { status: newStatus })
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b))
    } catch (e) { console.error(e) }
    finally { setUpdating(null) }
  }

  const filtered = search
    ? bookings.filter(b =>
        b.guestName.toLowerCase().includes(search.toLowerCase()) ||
        b.guestPhone.includes(search) ||
        b.bookingRef.toLowerCase().includes(search.toLowerCase())
      )
    : bookings

  const pages = Math.ceil(total / PER_PAGE)

  return (
    <div>
      <PageHeader
        title="Bookings"
        description={`${total} total bookings`}
        actions={
          <button
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-btn transition-colors"
          >
            + New booking
          </button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search guest, phone, ref..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border rounded-btn text-text placeholder:text-muted focus:outline-none focus:border-accent"
          />
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm bg-surface border border-border rounded-btn text-text focus:outline-none focus:border-accent"
        >
          <option value="">All statuses</option>
          {STATUSES.filter(Boolean).map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', '-')}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2/50">
              {['Ref', 'Guest', 'Date & Time', 'Party', 'Table', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7}><EmptyState icon={BookOpen} title="No bookings found" /></td></tr>
            ) : (
              filtered.map(b => (
                <tr key={b.id} className="border-b border-border hover:bg-surface-2/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-accent font-semibold">{b.bookingRef}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-text">{b.guestName}</p>
                    <p className="text-xs text-muted">{b.guestPhone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-text">{formatDate(b.date)}</p>
                    <p className="text-xs text-muted">{b.time}</p>
                  </td>
                  <td className="px-4 py-3 text-text">{b.guestCount}</td>
                  <td className="px-4 py-3 text-muted text-xs">{b.table?.name ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {b.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateStatus(b.id, 'confirmed')}
                            disabled={updating === b.id}
                            className="p-1.5 rounded hover:bg-success/20 text-success transition-colors"
                            title="Confirm"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => updateStatus(b.id, 'cancelled')}
                            disabled={updating === b.id}
                            className="p-1.5 rounded hover:bg-error/20 text-error transition-colors"
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </>
                      )}
                      {b.status === 'confirmed' && (
                        <button
                          onClick={() => updateStatus(b.id, 'completed')}
                          disabled={updating === b.id}
                          className="p-1.5 rounded hover:bg-accent/20 text-accent transition-colors"
                          title="Mark completed"
                        >
                          <Clock size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-btn border border-border hover:bg-surface-2 disabled:opacity-40 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-2 rounded-btn border border-border hover:bg-surface-2 disabled:opacity-40 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
