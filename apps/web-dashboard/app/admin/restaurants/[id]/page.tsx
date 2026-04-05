'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, Calendar, Star, LayoutGrid, Check, Ban } from 'lucide-react'
import { StatsCard } from '@/components/shared/StatsCard'
import { TableRowSkeleton } from '@/components/shared/LoadingSkeleton'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface Table {
  id: string
  name: string
  capacity: number
}

interface Owner {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface Booking {
  id: string
  date: string
  guestName?: string
  guestFirstName?: string
  guestLastName?: string
  partySize: number
  status: string
}

interface Restaurant {
  id: string
  name: string
  slug: string
  status: string
  plan: string
  address: string
  district: string
  city: string
  phone?: string
  email?: string
  website?: string
  cuisine?: string
  rating: number
  reviewCount: number
  isPublished: boolean
  createdAt: string
  tables: Table[]
  owner: Owner
  bookings?: Booking[]
}

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-success/20 text-success',
  draft:     'bg-muted/20 text-muted',
  suspended: 'bg-error/20 text-error',
}

const PLAN_BADGE: Record<string, string> = {
  free:     'bg-muted/20 text-muted',
  pro:      'bg-accent/20 text-accent',
  business: 'bg-amber/20 text-amber',
}

const BOOKING_STATUS: Record<string, string> = {
  pending:   'bg-warning/20 text-warning',
  confirmed: 'bg-success/20 text-success',
  cancelled: 'bg-error/20 text-error',
  completed: 'bg-muted/20 text-muted',
  no_show:   'bg-amber/20 text-amber',
}

const TABS = ['Overview', 'Bookings', 'Settings'] as const
type Tab = typeof TABS[number]

export default function AdminRestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.get<Restaurant>(`/api/restaurants/${id}`)
      .then(res => setRestaurant(res))
      .catch(e => setError(e.message ?? 'Failed to load restaurant'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (activeTab === 'Bookings') {
      setBookingsLoading(true)
      api.get<unknown>('/api/bookings', { restaurantId: id, limit: 20, sortBy: 'date', sortOrder: 'desc' })
        .then(res => {
          const r = res as { bookings?: Booking[] }
          setBookings(r.bookings ?? (Array.isArray(res) ? (res as Booking[]) : []))
        })
        .catch(console.error)
        .finally(() => setBookingsLoading(false))
    }
  }, [activeTab, id])

  const handleToggleStatus = async () => {
    if (!restaurant) return
    const newStatus = restaurant.status === 'active' ? 'suspended' : 'active'
    setToggling(true)
    try {
      await api.put(`/api/admin/restaurants/${id}/status`, { status: newStatus })
      setRestaurant(prev => prev ? { ...prev, status: newStatus } : prev)
    } catch (e) {
      console.error(e)
    } finally {
      setToggling(false)
    }
  }

  const handleForceActivate = async () => {
    if (!restaurant) return
    setToggling(true)
    try {
      await api.put(`/api/admin/restaurants/${id}/status`, { status: 'active', isPublished: true })
      setRestaurant(prev => prev ? { ...prev, status: 'active', isPublished: true } : prev)
    } catch (e) {
      console.error(e)
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-muted animate-pulse text-sm">Loading restaurant...</span>
      </div>
    )
  }

  if (error || !restaurant) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Building2 size={32} className="text-muted" />
        <p className="text-muted text-sm">{error ?? 'Restaurant not found'}</p>
        <Link href="/admin/restaurants" className="text-accent text-sm hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to restaurants
        </Link>
      </div>
    )
  }

  const guestName = (b: Booking) =>
    (b.guestName ?? (`${b.guestFirstName ?? ''} ${b.guestLastName ?? ''}`).trim()) || '—'

  return (
    <div>
      {/* Back link */}
      <Link
        href="/admin/restaurants"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors mb-4"
      >
        <ArrowLeft size={14} /> Back to restaurants
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-2xl font-bold text-text">{restaurant.name}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-chip text-xs font-semibold capitalize ${STATUS_BADGE[restaurant.status] ?? 'bg-muted/20 text-muted'}`}>
              {restaurant.status}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-chip text-xs font-semibold capitalize ${PLAN_BADGE[restaurant.plan] ?? 'bg-muted/20 text-muted'}`}>
              {restaurant.plan}
            </span>
          </div>
          <p className="text-sm text-muted">{restaurant.address}</p>
        </div>
        <button
          onClick={handleToggleStatus}
          disabled={toggling}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-btn text-sm font-medium transition-colors disabled:opacity-50 ${
            restaurant.status === 'active'
              ? 'bg-error/10 text-error hover:bg-error/20 border border-error/30'
              : 'bg-success/10 text-success hover:bg-success/20 border border-success/30'
          }`}
        >
          {restaurant.status === 'active' ? <><Ban size={14} /> Suspend</> : <><Check size={14} /> Activate</>}
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Bookings"
          value={restaurant.bookings?.length ?? '—'}
          icon={Calendar}
        />
        <StatsCard
          title="Rating"
          value={restaurant.rating ? `★ ${restaurant.rating.toFixed(1)}` : '—'}
          subtitle={restaurant.reviewCount ? `${restaurant.reviewCount} reviews` : undefined}
          icon={Star}
          iconColor="text-amber"
        />
        <StatsCard
          title="Tables"
          value={restaurant.tables?.length ?? 0}
          icon={LayoutGrid}
        />
        <StatsCard
          title="Created"
          value={formatDate(restaurant.createdAt)}
          icon={Building2}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border mb-6">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'Overview' && (
        <div className="space-y-5">
          {/* Info grid */}
          <div className="bg-surface border border-border rounded-card p-5 shadow-card">
            <h3 className="font-semibold text-text mb-4">Restaurant Info</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
              {[
                { label: 'Address', value: restaurant.address },
                { label: 'District', value: restaurant.district },
                { label: 'City', value: restaurant.city },
                { label: 'Cuisine', value: restaurant.cuisine ?? '—' },
                { label: 'Phone', value: restaurant.phone ?? '—' },
                { label: 'Email', value: restaurant.email ?? '—' },
                { label: 'Website', value: restaurant.website ?? '—' },
                { label: 'Owner', value: `${restaurant.owner?.firstName} ${restaurant.owner?.lastName}` },
                { label: 'Owner email', value: restaurant.owner?.email },
                { label: 'Published', value: restaurant.isPublished ? 'Yes' : 'No' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted mb-0.5">{label}</p>
                  <p className="text-sm text-text font-medium break-all">{value ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tables */}
          {restaurant.tables?.length > 0 && (
            <div className="bg-surface border border-border rounded-card p-5 shadow-card">
              <h3 className="font-semibold text-text mb-3">Tables ({restaurant.tables.length})</h3>
              <div className="flex flex-wrap gap-2">
                {restaurant.tables.map(t => (
                  <span key={t.id} className="px-3 py-1.5 bg-surface-2 border border-border rounded-btn text-sm text-text">
                    {t.name} · {t.capacity}p
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent bookings */}
          <div className="bg-surface border border-border rounded-card shadow-card">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-text">Recent Bookings</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2/50">
                  {['Date', 'Guest', 'Party Size', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(restaurant.bookings ?? []).slice(0, 5).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted">No recent bookings</td>
                  </tr>
                ) : (
                  (restaurant.bookings ?? []).slice(0, 5).map(b => (
                    <tr key={b.id} className="border-b border-border last:border-0 hover:bg-surface-2/30">
                      <td className="px-4 py-3 text-muted text-xs">{formatDate(b.date)}</td>
                      <td className="px-4 py-3 text-text">{guestName(b)}</td>
                      <td className="px-4 py-3 text-muted">{b.partySize}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-chip text-xs font-semibold capitalize ${BOOKING_STATUS[b.status] ?? 'bg-muted/20 text-muted'}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bookings tab */}
      {activeTab === 'Bookings' && (
        <div className="bg-surface border border-border rounded-card shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/50">
                {['Date', 'Guest', 'Party Size', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookingsLoading
                ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={4} />)
                : bookings.length === 0
                  ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted">No bookings found</td>
                    </tr>
                  )
                  : bookings.map(b => (
                    <tr key={b.id} className="border-b border-border last:border-0 hover:bg-surface-2/30">
                      <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">{formatDate(b.date)}</td>
                      <td className="px-4 py-3 text-text">{guestName(b)}</td>
                      <td className="px-4 py-3 text-muted">{b.partySize}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-chip text-xs font-semibold capitalize ${BOOKING_STATUS[b.status] ?? 'bg-muted/20 text-muted'}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Settings tab */}
      {activeTab === 'Settings' && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-card p-5 shadow-card">
            <h3 className="font-semibold text-text mb-4">Restaurant Settings (read-only)</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {[
                { label: 'Plan', value: restaurant.plan },
                { label: 'Status', value: restaurant.status },
                { label: 'Published', value: restaurant.isPublished ? 'Yes' : 'No' },
                { label: 'Slug', value: restaurant.slug },
                { label: 'Created', value: formatDate(restaurant.createdAt) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted mb-0.5">{label}</p>
                  <p className="text-sm text-text font-medium">{value ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-surface border border-border rounded-card p-5 shadow-card">
            <h3 className="font-semibold text-text mb-2">Admin Actions</h3>
            <p className="text-xs text-muted mb-4">Force-activate sets status to active and marks restaurant as published.</p>
            <button
              onClick={handleForceActivate}
              disabled={toggling}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-btn text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              <Check size={14} /> Force activate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
