'use client'
import { useEffect, useState } from 'react'
import { Calendar, Users, TrendingUp, Star } from 'lucide-react'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatsCardSkeleton } from '@/components/shared/LoadingSkeleton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { api } from '@/lib/api'
import { useMyRestaurant } from '@/hooks/useRestaurant'
import { useT } from '@/lib/i18n'

interface OverviewData {
  todayBookings: number
  yesterdayBookings: number
  trend: number | null
  guestsExpected: number
  pendingCount: number
  monthBookings: number
  avgRating: number
}

interface Booking {
  id: string
  bookingRef: string
  guestName: string
  guestPhone: string
  time: string
  date: string
  guestCount: number
  status: string
  notes?: string
}

export default function DashboardPage() {
  const { restaurant, loading: restLoading } = useMyRestaurant()
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [todayBookings, setTodayBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const t = useT()

  useEffect(() => {
    if (!restaurant?.id) return
    const today = new Date().toISOString().split('T')[0]

    Promise.all([
      api.get<OverviewData>('/api/dashboard/overview', { restaurantId: restaurant.id }),
      api.get<{ bookings: Booking[] } | Booking[]>('/api/bookings', {
        restaurantId: restaurant.id,
        from: today,
        to: today,
      }),
    ]).then(([ov, bk]) => {
      setOverview(ov)
      setTodayBookings(Array.isArray(bk) ? bk : ((bk as { bookings: Booking[] }).bookings ?? []))
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [restaurant?.id])

  const isLoading = restLoading || loading

  return (
    <div>
      <PageHeader
        title={t.overview}
        description={restaurant
          ? `${restaurant.name} · ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
          : t.loading}
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />)
        ) : (
          <>
            <StatsCard
              title={t.bookingsToday}
              value={overview?.todayBookings ?? 0}
              trend={overview?.trend}
              subtitle={t.vsYesterday}
              icon={Calendar}
            />
            <StatsCard
              title={t.guestsExpected}
              value={overview?.guestsExpected ?? 0}
              subtitle={t.todaySubtitle}
              icon={Users}
              iconColor="text-blue-400"
            />
            <StatsCard
              title={t.thisMonth}
              value={overview?.monthBookings ?? 0}
              subtitle={t.total.toLowerCase()}
              icon={TrendingUp}
              iconColor="text-amber"
            />
            <StatsCard
              title={t.avgRatingLabel}
              value={overview?.avgRating ? overview.avgRating.toFixed(1) : '—'}
              icon={Star}
              iconColor="text-amber"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's bookings */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-text">{t.bookingsToday}</h2>
            {overview?.pendingCount ? (
              <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-chip font-semibold">
                {overview.pendingCount} {t.pending.toLowerCase()}
              </span>
            ) : null}
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[0, 1, 2].map(i => <div key={i} className="animate-pulse h-14 bg-surface-2 rounded-btn" />)}
            </div>
          ) : todayBookings.length === 0 ? (
            <EmptyState icon={Calendar} title={t.noBookingsToday} description={t.bookingsTodayWillAppear} />
          ) : (
            <div className="divide-y divide-border">
              {todayBookings.map(b => (
                <div key={b.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-2/50 transition-colors">
                  <div className="text-sm font-mono text-accent font-semibold w-12">{b.time}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate">{b.guestName}</p>
                    <p className="text-xs text-muted">{b.guestCount} guests · {b.bookingRef}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-surface border border-border rounded-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-text">{t.quickActions}</h2>
          </div>
          <div className="p-4 space-y-2">
            <a href="/dashboard/bookings" className="flex items-center gap-3 p-3 rounded-btn hover:bg-surface-2 transition-colors">
              <Calendar size={18} className="text-success flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text">{t.manageBookingsLabel}</p>
                <p className="text-xs text-muted">{t.confirmOrCancelDesc}</p>
              </div>
            </a>
            <a href="/dashboard/calendar" className="flex items-center gap-3 p-3 rounded-btn hover:bg-surface-2 transition-colors">
              <Calendar size={18} className="text-accent flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text">{t.viewCalendarLabel}</p>
                <p className="text-xs text-muted">{t.seeWeeklyDesc}</p>
              </div>
            </a>
            <a href="/dashboard/analytics" className="flex items-center gap-3 p-3 rounded-btn hover:bg-surface-2 transition-colors">
              <TrendingUp size={18} className="text-amber flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text">{t.analyticsLabel}</p>
                <p className="text-xs text-muted">{t.revenueBookingTrends}</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
