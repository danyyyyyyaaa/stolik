'use client'
import { useEffect, useState } from 'react'
import { Building2, Users, Calendar, TrendingUp } from 'lucide-react'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatsCardSkeleton } from '@/components/shared/LoadingSkeleton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageHeader } from '@/components/shared/PageHeader'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface AdminStats {
  totalRestaurants: number
  activeRestaurants: number
  totalUsers: number
  totalBookings: number
  todayBookings: number
  bookingsToday: number
  monthBookings: number
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [restaurants, setRestaurants] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<AdminStats>('/api/admin/stats').catch(() => null),
      api.get<unknown>('/api/admin/restaurants').catch(() => ({ restaurants: [] })),
    ]).then(([s, r]) => {
      setStats(s)
      const list = Array.isArray(r) ? r : ((r as { restaurants?: unknown[] })?.restaurants ?? (r as { data?: unknown[] })?.data ?? [])
      setRestaurants((list as Record<string, unknown>[]).slice(0, 5))
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <PageHeader title="Admin Dashboard" description="Platform overview and management" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />) : (
          <>
            <StatsCard title="Restaurants"    value={stats?.totalRestaurants ?? 0}                    icon={Building2} accentColor="bg-accent" />
            <StatsCard title="Total users"    value={stats?.totalUsers ?? 0}                          icon={Users}       iconColor="text-blue-400" accentColor="bg-blue-400" />
            <StatsCard title="Today bookings" value={stats?.todayBookings ?? stats?.bookingsToday ?? 0} icon={Calendar}    iconColor="text-amber" accentColor="bg-amber" />
            <StatsCard title="Month bookings" value={stats?.monthBookings ?? 0}                        icon={TrendingUp} accentColor="bg-accent" />
          </>
        )}
      </div>

      {/* Recent restaurants */}
      <div className="bg-surface border border-border rounded-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-text">Recent restaurants</h2>
          <a href="/admin/restaurants" className="text-xs text-accent hover:underline flex items-center gap-1">
            View all →
          </a>
        </div>
        {restaurants.length === 0 && !loading ? (
          <p className="px-5 py-8 text-center text-muted text-sm">No restaurants yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Name', 'District', 'Plan', 'Status', 'Created'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {restaurants.map(r => (
                <tr key={r.id as string} className="border-b border-border hover:bg-surface-2/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-text">{r.name as string}</td>
                  <td className="px-4 py-3 text-muted">{r.district as string}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-accent capitalize">{r.plan as string}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.isActive ? 'confirmed' : 'cancelled'} />
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{formatDate(r.createdAt as string)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
