'use client'
import { useEffect, useState } from 'react'
import {
  BookOpen, Users, XCircle, Clock,
  TrendingDown,
} from 'lucide-react'
import {
  AreaChart, Area, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatsCardSkeleton, Skeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { api } from '@/lib/api'
import { useMyRestaurant } from '@/hooks/useRestaurant'

// ---- Types ----------------------------------------------------------------

interface KPIs {
  totalBookings:         number
  totalBookingsChange?:  number
  uniqueGuests:          number
  uniqueGuestsChange?:   number
  avgPartySize:          number
  avgPartySizeChange?:   number
  noShowRate:            number
  noShowRateChange?:     number
  cancellationRate:      number
  cancellationRateChange?: number
  avgLeadTimeDays:       number
  avgLeadTimeDaysChange?: number
}

interface BookingsOverTimeItem {
  date:      string
  confirmed: number
  cancelled: number
  noShow:    number
  total?:    number
}

interface BookingsByStatusItem {
  name:  string
  value: number
  color: string
}

interface PeakHoursItem {
  day:   number
  hour:  number
  count: number
}

interface GuestDistItem {
  label: string
  count: number
}

interface TableUtilItem {
  name:        string
  utilization: number
}

interface TopGuestItem {
  name:      string
  visits:    number
  lastVisit: string
}

interface Analytics {
  kpis?:                KPIs
  // Fallback flat fields (existing API)
  totalBookings?:       number
  uniqueGuests?:        number
  avgPartySize?:        number | string
  noShowRate?:          number | string
  cancellationRate?:    number | string
  bookingsOverTime?:    BookingsOverTimeItem[]
  bookingsByDay?:       { date: string; count: number }[]
  bookingsByStatus?:    BookingsByStatusItem[]
  statusBreakdown?:     Record<string, number>
  peakHoursHeatmap?:    PeakHoursItem[]
  peakHours?:           { hour: number; count: number }[]
  guestDistribution?:   GuestDistItem[]
  tableUtilization?:    TableUtilItem[]
  topGuests?:           TopGuestItem[]
}

// ---- Constants ------------------------------------------------------------

const PRESETS = [
  { label: 'Today',   days: 0  },
  { label: '7 days',  days: 7  },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#1B7A4A',
  cancelled: '#E53E3E',
  pending:   '#F5A623',
  no_show:   '#9CA3AF',
  completed: '#6366F1',
}

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const TOOLTIP_STYLE = {
  background: '#1f2937',
  border: '1px solid #374151',
  borderRadius: 8,
  fontSize: 12,
  color: '#f9fafb',
}

// ---- Helpers --------------------------------------------------------------

function dateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function formatVisitDate(s: string) {
  try { return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return s }
}

// ---- Sub-components -------------------------------------------------------

function SectionCard({ title, children, fullWidth = false }: {
  title: string
  children: React.ReactNode
  fullWidth?: boolean
}) {
  return (
    <div className={`bg-surface border border-border rounded-card p-5 ${fullWidth ? 'lg:col-span-2' : ''}`}>
      <h3 className="font-semibold text-text mb-4">{title}</h3>
      {children}
    </div>
  )
}

function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      className="animate-pulse bg-surface-2 rounded-btn w-full"
      style={{ height }}
    />
  )
}

// ---- Heatmap --------------------------------------------------------------

function PeakHoursHeatmap({ data }: { data: PeakHoursItem[] }) {
  const HOURS = Array.from({ length: 13 }, (_, i) => i + 10)
  const maxCount = Math.max(...data.map(d => d.count), 1)

  return (
    <div>
      {/* Hour labels */}
      <div className="flex gap-px mb-1 pl-10">
        {HOURS.map(h => (
          <div key={h} className="flex-1 text-center text-[9px] text-muted">{h}</div>
        ))}
      </div>
      {/* Rows */}
      {DAYS_SHORT.map((day, dayIdx) => (
        <div key={day} className="flex items-center gap-px mb-px">
          <span className="w-10 text-[10px] text-muted text-right pr-2">{day}</span>
          {HOURS.map(hour => {
            const item  = data.find(d => d.day === dayIdx && d.hour === hour)
            const count = item?.count ?? 0
            const opacity = count > 0 ? count / maxCount * 0.9 + 0.1 : 0
            return (
              <div
                key={hour}
                className="flex-1 h-6 rounded-sm transition-opacity cursor-default"
                style={{
                  background: count > 0 ? `rgba(27,122,74,${opacity})` : 'rgb(var(--surface-2)/0.6)',
                }}
                title={`${day} ${hour}:00 — ${count} bookings`}
              />
            )
          })}
        </div>
      ))}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-[10px] text-muted">Less</span>
        {[0.1, 0.3, 0.55, 0.75, 1].map(o => (
          <div key={o} className="w-4 h-4 rounded-sm" style={{ background: `rgba(27,122,74,${o})` }} />
        ))}
        <span className="text-[10px] text-muted">More</span>
      </div>
    </div>
  )
}

// ---- Table Utilization ----------------------------------------------------

function TableUtilizationChart({ data }: { data: TableUtilItem[] }) {
  if (!data.length) return <p className="text-sm text-muted text-center py-8">No table data</p>

  return (
    <div className="space-y-3">
      {data.map(row => {
        const pct   = Math.min(Math.round(row.utilization), 100)
        const color = pct >= 70 ? '#1B7A4A' : pct >= 40 ? '#F5A623' : '#E53E3E'
        return (
          <div key={row.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-text font-medium">{row.name}</span>
              <span className="text-xs text-muted">{pct}%</span>
            </div>
            <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---- Top Guests table -----------------------------------------------------

function TopGuestsTable({ data }: { data: TopGuestItem[] }) {
  if (!data.length) return <p className="text-sm text-muted text-center py-8">No guest data</p>

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border">
          <th className="text-left text-xs text-muted font-semibold pb-2 w-8">#</th>
          <th className="text-left text-xs text-muted font-semibold pb-2">Name</th>
          <th className="text-right text-xs text-muted font-semibold pb-2">Visits</th>
          <th className="text-right text-xs text-muted font-semibold pb-2">Last visit</th>
        </tr>
      </thead>
      <tbody>
        {data.slice(0, 10).map((g, i) => (
          <tr key={i} className="border-b border-border/50 last:border-0">
            <td className="py-2 text-xs text-muted">{i + 1}</td>
            <td className="py-2 font-semibold text-text">{g.name}</td>
            <td className="py-2 text-right text-accent font-bold">{g.visits}</td>
            <td className="py-2 text-right text-xs text-muted">{formatVisitDate(g.lastVisit)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---- Main page ------------------------------------------------------------

export default function AnalyticsPage() {
  const { restaurant } = useMyRestaurant()
  const [data, setData]       = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [preset, setPreset]   = useState(30)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate]     = useState('')
  const [customMode, setCustomMode] = useState(false)

  async function fetchAnalytics(from: string, to: string) {
    if (!restaurant?.id) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<Analytics>('/api/dashboard/analytics', {
        restaurantId: restaurant.id,
        from,
        to,
      })
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!restaurant?.id) return
    const to   = new Date()
    const from = new Date()
    if (preset > 0) from.setDate(from.getDate() - preset)
    const f = dateStr(from)
    const t = dateStr(to)
    setFromDate(f)
    setToDate(t)
    fetchAnalytics(f, t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id, preset])

  function handleCustomApply() {
    if (fromDate && toDate) fetchAnalytics(fromDate, toDate)
  }

  // Resolve KPI values — support both new kpis object and flat legacy fields
  const kpis = data?.kpis
  const totalBookings      = kpis?.totalBookings     ?? data?.totalBookings     ?? 0
  const uniqueGuests       = kpis?.uniqueGuests      ?? data?.uniqueGuests      ?? 0
  const avgPartySize       = kpis?.avgPartySize      ?? Number(data?.avgPartySize ?? 0)
  const noShowRate         = kpis?.noShowRate        ?? Number(data?.noShowRate     ?? 0)
  const cancellationRate   = kpis?.cancellationRate  ?? Number(data?.cancellationRate ?? 0)
  const avgLeadTimeDays    = kpis?.avgLeadTimeDays   ?? 0

  // Resolve chart data
  const bookingsOverTime: BookingsOverTimeItem[] = data?.bookingsOverTime
    ?? (data?.bookingsByDay ?? []).map(d => ({
        date:      d.date,
        confirmed: d.count,
        cancelled: 0,
        noShow:    0,
      }))

  const bookingsByStatus: BookingsByStatusItem[] = data?.bookingsByStatus
    ?? Object.entries(data?.statusBreakdown ?? {}).map(([name, value]) => ({
        name,
        value,
        color: STATUS_COLORS[name] ?? '#6b7280',
      }))

  const peakHoursData: PeakHoursItem[] = data?.peakHoursHeatmap
    ?? (data?.peakHours ?? []).map(p => ({ day: 0, hour: p.hour, count: p.count }))

  const guestDistribution: GuestDistItem[] = data?.guestDistribution ?? []
  const tableUtilization: TableUtilItem[]  = data?.tableUtilization   ?? []
  const topGuests: TopGuestItem[]          = data?.topGuests           ?? []

  // Pie total for center label
  const pieTotal = bookingsByStatus.reduce((s, d) => s + d.value, 0)

  return (
    <div>
      <PageHeader title="Analytics" description="Booking performance and trends" />

      {/* Preset row */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {PRESETS.map(p => (
          <button
            key={p.days}
            onClick={() => { setCustomMode(false); setPreset(p.days) }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-btn transition-colors ${
              !customMode && preset === p.days
                ? 'bg-accent text-white'
                : 'border border-border bg-surface hover:bg-surface-2 text-muted hover:text-text'
            }`}
          >
            {p.label}
          </button>
        ))}

        {/* Custom range */}
        <button
          onClick={() => setCustomMode(true)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-btn transition-colors ${
            customMode
              ? 'bg-accent text-white'
              : 'border border-border bg-surface hover:bg-surface-2 text-muted hover:text-text'
          }`}
        >
          Custom
        </button>
        {customMode && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="px-2 py-1.5 text-xs bg-surface border border-border rounded-btn text-text focus:outline-none focus:border-accent"
            />
            <span className="text-xs text-muted">–</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="px-2 py-1.5 text-xs bg-surface border border-border rounded-btn text-text focus:outline-none focus:border-accent"
            />
            <button
              onClick={handleCustomApply}
              className="px-3 py-1.5 text-xs font-semibold bg-accent hover:bg-accent-hover text-white rounded-btn transition-colors"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6">
          <EmptyState
            icon={BookOpen}
            title="Failed to load analytics"
            description={error}
            action={
              <button
                onClick={() => fetchAnalytics(fromDate, toDate)}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-btn transition-colors"
              >
                Retry
              </button>
            }
          />
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <StatsCardSkeleton key={i} />)
        ) : (
          <>
            <StatsCard
              title="Total Bookings"
              value={totalBookings}
              trend={kpis?.totalBookingsChange}
              icon={BookOpen}
            />
            <StatsCard
              title="Unique Guests"
              value={uniqueGuests}
              trend={kpis?.uniqueGuestsChange}
              icon={Users}
              iconColor="text-blue-400"
            />
            <StatsCard
              title="Avg Party Size"
              value={typeof avgPartySize === 'number' ? avgPartySize.toFixed(1) : avgPartySize}
              trend={kpis?.avgPartySizeChange}
              icon={Users}
              iconColor="text-amber"
            />
            <StatsCard
              title="No-show Rate"
              value={`${typeof noShowRate === 'number' ? noShowRate.toFixed(1) : noShowRate}%`}
              trend={kpis?.noShowRateChange}
              icon={XCircle}
              iconColor="text-error"
            />
            <StatsCard
              title="Cancellation Rate"
              value={`${typeof cancellationRate === 'number' ? cancellationRate.toFixed(1) : cancellationRate}%`}
              trend={kpis?.cancellationRateChange}
              icon={TrendingDown}
              iconColor="text-warning"
            />
            <StatsCard
              title="Avg Lead Time"
              value={`${avgLeadTimeDays} days`}
              trend={kpis?.avgLeadTimeDaysChange}
              icon={Clock}
              iconColor="text-indigo-400"
            />
          </>
        )}
      </div>

      {/* Charts */}
      {!loading && !error && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 1. Bookings over time — full width */}
          <SectionCard title="Bookings Over Time" fullWidth>
            {bookingsOverTime.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No data for this period</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={bookingsOverTime} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="gradConfirmed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#1B7A4A" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#1B7A4A" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCancelled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#E53E3E" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#E53E3E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border)/0.5)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickFormatter={d => d.slice(5)}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={v => String(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="confirmed"
                    stroke="#1B7A4A"
                    strokeWidth={2}
                    fill="url(#gradConfirmed)"
                    name="Confirmed"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="cancelled"
                    stroke="#E53E3E"
                    strokeWidth={1.5}
                    fill="url(#gradCancelled)"
                    name="Cancelled"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="noShow"
                    stroke="#9CA3AF"
                    strokeWidth={1.5}
                    name="No-show"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          {/* 2. Bookings by Status — pie chart */}
          <SectionCard title="Bookings by Status">
            {bookingsByStatus.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No data</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="relative">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={bookingsByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {bookingsByStatus.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.color ?? STATUS_COLORS[entry.name ?? ''] ?? '#6b7280'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(v: number) => [v, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-lg font-bold text-text">{pieTotal}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {bookingsByStatus.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: item.color ?? STATUS_COLORS[item.name] ?? '#6b7280' }}
                        />
                        <span className="text-xs text-muted capitalize">{((item.name || (item as any).status || 'unknown') as string).replace(/_/g, ' ')}</span>
                      </div>
                      <span className="text-xs font-semibold text-text">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          {/* 3. Peak Hours Heatmap — full width */}
          <SectionCard title="Peak Hours Heatmap" fullWidth>
            {peakHoursData.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No peak hours data</p>
            ) : (
              <PeakHoursHeatmap data={peakHoursData} />
            )}
          </SectionCard>

          {/* 4. Guest Distribution */}
          <SectionCard title="Guest Distribution">
            {guestDistribution.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={guestDistribution} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border)/0.5)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="#1B7A4A" radius={[4, 4, 0, 0]} name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          {/* 5. Table Utilization */}
          <SectionCard title="Table Utilization">
            <TableUtilizationChart data={tableUtilization} />
          </SectionCard>

          {/* 6. Top Guests */}
          <SectionCard title="Top Guests">
            <TopGuestsTable data={topGuests} />
          </SectionCard>

        </div>
      )}

      {/* Loading skeletons for charts */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2 bg-surface border border-border rounded-card p-5">
            <Skeleton className="h-4 w-40 mb-4" />
            <ChartSkeleton height={220} />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-card p-5">
              <Skeleton className="h-4 w-32 mb-4" />
              <ChartSkeleton height={200} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
