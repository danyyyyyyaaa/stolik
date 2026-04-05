'use client'
import { useEffect, useState } from 'react'
import { Users, Percent, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatsCardSkeleton } from '@/components/shared/LoadingSkeleton'
import { api } from '@/lib/api'
import { useMyRestaurant } from '@/hooks/useRestaurant'

const COLORS = ['#1b7a4a', '#f5a623', '#e53e3e', '#6b7280', '#38a169']

const PERIODS = [
  { label: '7d',  days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

interface Analytics {
  bookingsByDay: { date: string; count: number }[]
  statusBreakdown: Record<string, number>
  peakHours: { hour: number; count: number }[]
  totalBookings: number
  totalGuests: number
  uniqueGuests: number
  avgPartySize: number | string
  noShowRate: number | string
  cancellationRate: number | string
}

export default function AnalyticsPage() {
  const { restaurant } = useMyRestaurant()
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(30)

  useEffect(() => {
    if (!restaurant?.id) return
    setLoading(true)
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - period)

    api.get<Analytics>('/api/dashboard/analytics', {
      restaurantId: restaurant.id,
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    }).then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [restaurant?.id, period])

  const statusData = data ? Object.entries(data.statusBreakdown).map(([name, value]) => ({ name, value })) : []

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Booking performance and trends"
        actions={
          <div className="flex gap-1 bg-surface border border-border rounded-btn p-1">
            {PERIODS.map(p => (
              <button
                key={p.days}
                onClick={() => setPeriod(p.days)}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  period === p.days ? 'bg-accent text-white' : 'text-muted hover:text-text'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />) : (
          <>
            <StatsCard title="Total bookings" value={data?.totalBookings ?? 0} icon={Calendar} />
            <StatsCard title="Unique guests"  value={data?.uniqueGuests ?? 0}  icon={Users}   iconColor="text-blue-400" />
            <StatsCard title="Avg party size" value={data?.avgPartySize ?? 0}  icon={Users}   iconColor="text-amber" />
            <StatsCard title="No-show rate"   value={`${data?.noShowRate ?? 0}%`} icon={Percent} iconColor="text-error" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings over time */}
        <div className="bg-surface border border-border rounded-card p-5">
          <h3 className="font-semibold text-text mb-4">Bookings over time</h3>
          {!loading && data && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.bookingsByDay.slice(-30)}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#1b7a4a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status breakdown */}
        <div className="bg-surface border border-border rounded-card p-5">
          <h3 className="font-semibold text-text mb-4">Booking status breakdown</h3>
          {!loading && statusData.length > 0 && (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [v, '']} contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {statusData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-muted capitalize">{item.name.replace('_', ' ')}</span>
                    </div>
                    <span className="text-xs font-semibold text-text">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Peak hours */}
        <div className="bg-surface border border-border rounded-card p-5 lg:col-span-2">
          <h3 className="font-semibold text-text mb-4">Peak hours</h3>
          {!loading && data && (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={Array.from({ length: 14 }, (_, i) => {
                const h = i + 10
                const found = data.peakHours.find(p => p.hour === h)
                return { hour: `${h}:00`, count: found?.count ?? 0 }
              })}>
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#f5a623" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
