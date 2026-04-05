'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Building2, Users, Calendar, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { api } from '@/lib/api'

interface GrowthPoint { date: string; count: number }
interface TopRestaurant { name: string; bookings: number; rating: number }
interface TopDistrict { district: string; restaurantCount: number; bookingCount: number }
interface DistributionItem { plan?: string; source?: string; role?: string; count: number }

interface Statistics {
  overview: {
    totalRestaurants: number
    activeRestaurants: number
    totalUsers: number
    totalBookings: number
    todayBookings: number
    mrr: number
  }
  growth: {
    restaurants: GrowthPoint[]
    users: GrowthPoint[]
    bookings: GrowthPoint[]
  }
  topRestaurants: TopRestaurant[]
  topDistricts: TopDistrict[]
  planDistribution: DistributionItem[]
  bookingSourceDistribution: DistributionItem[]
  userRoleDistribution: DistributionItem[]
}

const PLAN_COLORS: Record<string, string> = {
  free: '#9CA3AF',
  pro: '#1B7A4A',
  business: '#F5A623',
}

const SOURCE_COLORS: Record<string, string> = {
  app: '#1B7A4A',
  widget: '#3B82F6',
  dashboard: '#F5A623',
  phone: '#9CA3AF',
  manual: '#6366F1',
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: '#E53E3E',
  admin: '#F5A623',
  restaurant_owner: '#1B7A4A',
  manager: '#3B82F6',
  staff: '#6366F1',
  guest: '#9CA3AF',
}

const PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
] as const

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function HorizontalBar({ label, value, max, color, sublabel }: {
  label: string
  value: number
  max: number
  color: string
  sublabel?: string
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-36 text-sm text-text truncate flex-shrink-0">{label}</div>
      <div className="flex-1 bg-surface-2 rounded-full h-2 overflow-hidden">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="text-xs text-muted w-16 text-right flex-shrink-0">
        {value}{sublabel ? ` · ${sublabel}` : ''}
      </div>
    </div>
  )
}

export default function AdminStatisticsPage() {
  const [stats, setStats] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState<30 | 7 | 90 | 365>(30)

  const load = useCallback(() => {
    setLoading(true)
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - preset)

    api.get<Statistics>('/api/admin/statistics', {
      from: toDateStr(from),
      to: toDateStr(to),
    })
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [preset])

  useEffect(() => { load() }, [load])

  // Merge growth arrays into combined chart data
  const growthData = (() => {
    if (!stats) return []
    const map: Record<string, { date: string; restaurants: number; users: number; bookings: number }> = {}
    stats.growth.restaurants.forEach(p => {
      map[p.date] = { ...map[p.date], date: p.date, restaurants: p.count, users: 0, bookings: 0 }
    })
    stats.growth.users.forEach(p => {
      if (map[p.date]) map[p.date].users = p.count
      else map[p.date] = { date: p.date, restaurants: 0, users: p.count, bookings: 0 }
    })
    stats.growth.bookings.forEach(p => {
      if (map[p.date]) map[p.date].bookings = p.count
      else map[p.date] = { date: p.date, restaurants: 0, users: 0, bookings: p.count }
    })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  })()

  const planData = stats?.planDistribution.map(d => ({ name: d.plan ?? 'unknown', value: d.count })) ?? []
  const sourceData = stats?.bookingSourceDistribution.map(d => ({ name: d.source ?? 'unknown', value: d.count })) ?? []

  const maxBookings = Math.max(...(stats?.topRestaurants.map(r => r.bookings) ?? [1]), 1)
  const maxDistrictBookings = Math.max(...(stats?.topDistricts.map(d => d.bookingCount) ?? [1]), 1)
  const maxRoleCount = Math.max(...(stats?.userRoleDistribution.map(d => d.count) ?? [1]), 1)

  return (
    <div>
      {/* Header with preset buttons */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <PageHeader title="Platform Statistics" description="Revenue, growth, and platform metrics" />
        <div className="flex gap-1.5">
          {PRESETS.map(({ label, days }) => (
            <button
              key={label}
              onClick={() => setPreset(days as 7 | 30 | 90 | 365)}
              className={`px-3 py-1.5 rounded-btn text-xs font-medium transition-colors ${
                preset === days
                  ? 'bg-accent text-white'
                  : 'bg-surface border border-border text-muted hover:text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <span className="text-muted animate-pulse text-sm">Loading statistics...</span>
        </div>
      )}

      {!loading && stats && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="Total Restaurants"
              value={stats.overview.totalRestaurants}
              subtitle={`active: ${stats.overview.activeRestaurants}`}
              icon={Building2}
            />
            <StatsCard
              title="Total Users"
              value={stats.overview.totalUsers}
              icon={Users}
              iconColor="text-blue-500"
            />
            <StatsCard
              title="Total Bookings"
              value={stats.overview.totalBookings}
              subtitle={`today: ${stats.overview.todayBookings}`}
              icon={Calendar}
              iconColor="text-amber"
            />
            <StatsCard
              title="MRR"
              value={`${stats.overview.mrr.toLocaleString('pl-PL')} zł`}
              icon={TrendingUp}
            />
          </div>

          {/* Growth chart — full width */}
          <div className="bg-surface border border-border rounded-card p-5 shadow-card mb-6">
            <h3 className="font-semibold text-text mb-4">Growth Over Time</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData} margin={{ top: 4, right: 12, bottom: 4, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #E5E7EB)" strokeOpacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-muted, #9CA3AF)' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted, #9CA3AF)' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="restaurants" name="Restaurants" stroke="#1B7A4A" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="users" name="Users" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="bookings" name="Bookings" stroke="#F5A623" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2-column charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Plan distribution */}
            <div className="bg-surface border border-border rounded-card p-5 shadow-card">
              <h3 className="font-semibold text-text mb-4">Plan Distribution</h3>
              {planData.length > 0 ? (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={planData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false}>
                        {planData.map((entry, i) => (
                          <Cell key={i} fill={PLAN_COLORS[entry.name] ?? '#9CA3AF'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${v} restaurants`, '']} contentStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted py-8 text-center">No data</p>
              )}
            </div>

            {/* Booking sources */}
            <div className="bg-surface border border-border rounded-card p-5 shadow-card">
              <h3 className="font-semibold text-text mb-4">Booking Sources</h3>
              {sourceData.length > 0 ? (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sourceData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false}>
                        {sourceData.map((entry, i) => (
                          <Cell key={i} fill={SOURCE_COLORS[entry.name] ?? '#9CA3AF'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${v} bookings`, '']} contentStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted py-8 text-center">No data</p>
              )}
            </div>
          </div>

          {/* 2-column bar lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top restaurants */}
            <div className="bg-surface border border-border rounded-card p-5 shadow-card">
              <h3 className="font-semibold text-text mb-4">Top Restaurants</h3>
              {stats.topRestaurants.length > 0 ? (
                <div className="space-y-3">
                  {stats.topRestaurants.slice(0, 10).map((r, i) => (
                    <HorizontalBar
                      key={i}
                      label={r.name}
                      value={r.bookings}
                      max={maxBookings}
                      color="#1B7A4A"
                      sublabel={`★ ${r.rating?.toFixed(1) ?? '—'}`}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted py-4 text-center">No data</p>
              )}
            </div>

            {/* Top districts */}
            <div className="bg-surface border border-border rounded-card p-5 shadow-card">
              <h3 className="font-semibold text-text mb-4">Top Districts</h3>
              {stats.topDistricts.length > 0 ? (
                <div className="space-y-3">
                  {stats.topDistricts.map((d, i) => (
                    <HorizontalBar
                      key={i}
                      label={d.district}
                      value={d.bookingCount}
                      max={maxDistrictBookings}
                      color="#3B82F6"
                      sublabel={`${d.restaurantCount} restaurants`}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted py-4 text-center">No data</p>
              )}
            </div>
          </div>

          {/* User roles */}
          <div className="bg-surface border border-border rounded-card p-5 shadow-card">
            <h3 className="font-semibold text-text mb-4">User Roles</h3>
            {stats.userRoleDistribution.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stats.userRoleDistribution.map((d, i) => {
                  const roleName = d.role ?? 'unknown'
                  return (
                    <HorizontalBar
                      key={i}
                      label={roleName.replace(/_/g, ' ')}
                      value={d.count}
                      max={maxRoleCount}
                      color={ROLE_COLORS[roleName] ?? '#9CA3AF'}
                    />
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted py-4 text-center">No data</p>
            )}
          </div>
        </>
      )}

      {!loading && !stats && (
        <div className="flex items-center justify-center h-48">
          <p className="text-muted text-sm">Failed to load statistics</p>
        </div>
      )}
    </div>
  )
}
