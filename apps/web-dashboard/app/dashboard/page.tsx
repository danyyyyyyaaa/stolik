'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, Users, TrendingUp, Star, BookOpen, BarChart3, Clock } from 'lucide-react'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatsCardSkeleton, ListRowSkeleton } from '@/components/shared/LoadingSkeleton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { api } from '@/lib/api'
import { useRestaurant } from '@/context/RestaurantContext'
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

const QUICK_ACTIONS = [
  {
    href: '/dashboard/bookings',
    icon: BookOpen,
    color: 'text-accent',
    bg: 'bg-accent/10',
    labelKey: 'manageBookingsLabel' as const,
    descKey: 'confirmOrCancelDesc' as const,
  },
  {
    href: '/dashboard/calendar',
    icon: Calendar,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    labelKey: 'viewCalendarLabel' as const,
    descKey: 'seeWeeklyDesc' as const,
  },
  {
    href: '/dashboard/analytics',
    icon: BarChart3,
    color: 'text-amber',
    bg: 'bg-amber/10',
    labelKey: 'analyticsLabel' as const,
    descKey: 'revenueBookingTrends' as const,
  },
]

export default function DashboardPage() {
  const { restaurant, loading: restLoading } = useRestaurant()
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

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div>
      <PageHeader
        title={t.overview}
        description={restaurant ? `${restaurant.name} · ${dateLabel}` : dateLabel}
      />

      {/* KPI grid */}
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
              iconColor="text-accent"
              accentColor="bg-accent"
            />
            <StatsCard
              title={t.guestsExpected}
              value={overview?.guestsExpected ?? 0}
              subtitle={t.todaySubtitle}
              icon={Users}
              iconColor="text-blue-400"
              accentColor="bg-blue-400"
            />
            <StatsCard
              title={t.thisMonth}
              value={overview?.monthBookings ?? 0}
              subtitle={t.total.toLowerCase()}
              icon={TrendingUp}
              iconColor="text-amber"
              accentColor="bg-amber"
            />
            <StatsCard
              title={t.avgRatingLabel}
              value={overview?.avgRating ? overview.avgRating.toFixed(1) : '—'}
              icon={Star}
              iconColor="text-amber"
              accentColor="bg-amber"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's bookings list */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-card shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-muted" />
              <h2 className="font-semibold text-text">{t.bookingsToday}</h2>
            </div>
            <div className="flex items-center gap-2">
              {(overview?.pendingCount ?? 0) > 0 && (
                <span className="text-xs bg-warning/15 text-warning px-2 py-1 rounded-chip font-semibold border border-warning/20">
                  {overview!.pendingCount} {t.pending.toLowerCase()}
                </span>
              )}
              <Link href="/dashboard/bookings" className="text-xs text-accent hover:underline font-medium">
                View all →
              </Link>
            </div>
          </div>

          {isLoading ? (
            <ListRowSkeleton rows={4} />
          ) : todayBookings.length === 0 ? (
            <EmptyState icon={Calendar} title={t.noBookingsToday} description={t.bookingsTodayWillAppear} />
          ) : (
            <div className="divide-y divide-border">
              {todayBookings.map(b => (
                <div
                  key={b.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2/50 transition-colors cursor-default"
                >
                  {/* Time */}
                  <div className="text-sm font-mono text-accent font-bold w-12 flex-shrink-0">{b.time}</div>

                  {/* Guest info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate">{b.guestName}</p>
                    <p className="text-xs text-muted mt-0.5">{b.guestCount} {b.guestCount === 1 ? 'guest' : 'guests'} · {b.bookingRef}</p>
                  </div>

                  {/* Status */}
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-surface border border-border rounded-card shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-text">{t.quickActions}</h2>
          </div>
          <div className="p-3 space-y-1.5">
            {QUICK_ACTIONS.map(({ href, icon: Icon, color, bg, labelKey, descKey }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3.5 p-3.5 rounded-btn hover:bg-surface-2 transition-all duration-150 hover:scale-[1.01] group"
              >
                <div className={`p-2 rounded-btn ${bg} ${color} flex-shrink-0 group-hover:scale-105 transition-transform duration-150`}>
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text group-hover:text-accent transition-colors">{t[labelKey]}</p>
                  <p className="text-xs text-muted truncate">{t[descKey]}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Restaurant quick stats */}
          {!isLoading && restaurant && (
            <div className="px-5 py-4 border-t border-border mt-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-xs text-muted mb-1">Plan</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-chip text-xs font-bold capitalize bg-accent/10 text-accent">
                    {restaurant.plan}
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted mb-1">Rating</p>
                  <p className="text-sm font-bold text-amber">
                    {restaurant.rating > 0 ? `★ ${restaurant.rating.toFixed(1)}` : '—'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
