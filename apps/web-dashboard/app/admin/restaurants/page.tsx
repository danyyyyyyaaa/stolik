'use client'
import { useEffect, useState, useCallback } from 'react'
import { Search, Building2, Check, Ban } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableRowSkeleton } from '@/components/shared/LoadingSkeleton'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get<unknown>('/api/admin/restaurants', { search: search || undefined })
      .then(res => {
        const list = Array.isArray(res) ? res : ((res as { restaurants?: unknown[] })?.restaurants ?? (res as { data?: unknown[] })?.data ?? [])
        setRestaurants(list as Record<string, unknown>[])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [search])

  useEffect(() => { load() }, [load])

  async function toggleStatus(id: string, isActive: boolean) {
    setUpdating(id)
    try {
      await api.patch(`/api/admin/restaurants/${id}/${isActive ? 'deactivate' : 'approve'}`)
      setRestaurants(prev => prev.map(r => r.id === id ? { ...r, isActive: !isActive } : r))
    } catch (e) { console.error(e) }
    finally { setUpdating(null) }
  }

  const filtered = statusFilter
    ? restaurants.filter(r => statusFilter === 'active' ? r.isActive : !r.isActive)
    : restaurants

  return (
    <div>
      <PageHeader title="Restaurants" description={`${restaurants.length} total`} />

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
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
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="bg-surface border border-border rounded-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2/50">
              {['Restaurant', 'District', 'Plan', 'Rating', 'Status', 'Created', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />) :
              filtered.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={Building2} title="No restaurants found" /></td></tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id as string} className="border-b border-border hover:bg-surface-2/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-text">{r.name as string}</p>
                      <p className="text-xs text-muted">{r.cuisine as string}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{r.district as string}</td>
                    <td className="px-4 py-3"><span className="text-xs font-semibold text-accent capitalize">{r.plan as string}</span></td>
                    <td className="px-4 py-3 text-amber font-semibold">★ {(r.rating as number)?.toFixed(1)}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.isActive ? 'confirmed' : 'cancelled'} /></td>
                    <td className="px-4 py-3 text-xs text-muted">{formatDate(r.createdAt as string)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleStatus(r.id as string, r.isActive as boolean)}
                          disabled={updating === r.id}
                          className={`p-1.5 rounded transition-colors ${r.isActive ? 'hover:bg-error/20 text-error' : 'hover:bg-success/20 text-success'}`}
                          title={r.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {r.isActive ? <Ban size={14} /> : <Check size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
