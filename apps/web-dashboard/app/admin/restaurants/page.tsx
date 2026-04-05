'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, Building2, ExternalLink, Ban, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableRowSkeleton } from '@/components/shared/LoadingSkeleton'
import { api } from '@/lib/api'
import { formatRelative } from '@/lib/utils'

interface Owner {
  firstName: string
  lastName: string
  email: string
}

interface Restaurant {
  id: string
  name: string
  slug: string
  district: string
  city: string
  plan: string
  status: string
  rating: number
  reviewCount: number
  isPublished: boolean
  createdAt: string
  owner: Owner
}

const PLAN_BADGE: Record<string, string> = {
  free:     'bg-muted/20 text-muted',
  pro:      'bg-accent/20 text-accent',
  business: 'bg-amber/20 text-amber',
}

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-success/20 text-success',
  draft:     'bg-muted/20 text-muted',
  suspended: 'bg-error/20 text-error',
}

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder] = useState('desc')
  const [updating, setUpdating] = useState<string | null>(null)
  const LIMIT = 20

  const load = useCallback(() => {
    setLoading(true)
    api.get<unknown>('/api/admin/restaurants', {
      page,
      limit: LIMIT,
      search: search || undefined,
      status: statusFilter || undefined,
      sortBy,
      sortOrder,
    })
      .then(res => {
        const r = res as { restaurants?: Restaurant[]; total?: number; page?: number; pages?: number }
        setRestaurants(r.restaurants ?? [])
        setTotal(r.total ?? 0)
        setPage(r.page ?? 1)
        setPages(r.pages ?? 1)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, search, statusFilter, sortBy, sortOrder])

  useEffect(() => { load() }, [load])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [search, statusFilter, sortBy])

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
    setUpdating(id)
    try {
      await api.put(`/api/admin/restaurants/${id}/status`, { status: newStatus })
      setRestaurants(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div>
      <PageHeader title="Restaurants" description={`${total} total`} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search restaurants..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border rounded-btn text-text placeholder:text-muted focus:outline-none focus:border-accent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-surface border border-border rounded-btn text-text focus:outline-none focus:border-accent"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="px-3 py-2 text-sm bg-surface border border-border rounded-btn text-text focus:outline-none focus:border-accent"
        >
          <option value="createdAt">Sort: Newest</option>
          <option value="name">Sort: Name</option>
          <option value="rating">Sort: Rating</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-card overflow-hidden shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2/50">
              {['Restaurant', 'Owner', 'Plan', 'Status', 'Rating', 'Created', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
              : restaurants.length === 0
                ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState icon={Building2} title="No restaurants found" description="Try adjusting your filters or search query." />
                    </td>
                  </tr>
                )
                : restaurants.map(r => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-2/30 transition-colors">
                    {/* Restaurant */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-text">{r.name}</p>
                      <p className="text-xs text-muted mt-0.5">{r.district}{r.city ? `, ${r.city}` : ''}</p>
                    </td>
                    {/* Owner */}
                    <td className="px-4 py-3">
                      <p className="text-text">{r.owner?.firstName} {r.owner?.lastName}</p>
                      <p className="text-xs text-muted mt-0.5">{r.owner?.email}</p>
                    </td>
                    {/* Plan */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-chip text-xs font-semibold capitalize ${PLAN_BADGE[r.plan] ?? 'bg-muted/20 text-muted'}`}>
                        {r.plan}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-chip text-xs font-semibold capitalize ${STATUS_BADGE[r.status] ?? 'bg-muted/20 text-muted'}`}>
                        {r.status}
                      </span>
                    </td>
                    {/* Rating */}
                    <td className="px-4 py-3">
                      <span className="text-amber font-semibold">★ {r.rating?.toFixed(1) ?? '—'}</span>
                    </td>
                    {/* Created */}
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                      {r.createdAt ? formatRelative(r.createdAt) : '—'}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/restaurants/${r.id}`}
                          className="p-1.5 rounded hover:bg-surface-2 text-muted hover:text-text transition-colors"
                          title="View"
                        >
                          <ExternalLink size={14} />
                        </Link>
                        <button
                          onClick={() => handleToggleStatus(r.id, r.status)}
                          disabled={updating === r.id}
                          className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
                            r.status === 'active'
                              ? 'hover:bg-error/20 text-error'
                              : 'hover:bg-success/20 text-success'
                          }`}
                          title={r.status === 'active' ? 'Suspend' : 'Activate'}
                        >
                          {r.status === 'active' ? <Ban size={14} /> : <Check size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted">
            Page {page} of {pages} · {total} restaurants
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded hover:bg-surface-2 text-muted disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(pages, 7) }).map((_, i) => {
              const p = i + 1
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                    p === page ? 'bg-accent text-white' : 'hover:bg-surface-2 text-muted'
                  }`}
                >
                  {p}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="p-1.5 rounded hover:bg-surface-2 text-muted disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
