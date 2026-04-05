'use client'
import { useState, useEffect, useCallback } from 'react'
import { Calendar, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/shared/LoadingSkeleton'
import { CalendarHeader } from '@/components/calendar/CalendarHeader'
import { CalendarMonthView } from '@/components/calendar/CalendarMonthView'
import { CalendarWeekView } from '@/components/calendar/CalendarWeekView'
import { CalendarDayView } from '@/components/calendar/CalendarDayView'
import { BookingDetailModal } from '@/components/calendar/BookingDetailModal'
import { api } from '@/lib/api'
import { useMyRestaurant } from '@/hooks/useRestaurant'

export interface BookingData {
  id: string
  bookingCode: string
  guestName: string
  guestPhone: string
  partySize: number
  time: string
  endTime: string
  tableName: string | null
  status: string
}

export interface DayData {
  date: string
  bookingCount: number
  guestCount: number
  bookings: BookingData[]
}

type CalendarView = 'month' | 'week' | 'day'

function getWeekMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function navigateDate(view: CalendarView, current: Date, dir: -1 | 1): Date {
  const d = new Date(current)
  if (view === 'month') {
    d.setMonth(d.getMonth() + dir)
    d.setDate(1)
  } else if (view === 'week') {
    d.setDate(d.getDate() + dir * 7)
  } else {
    d.setDate(d.getDate() + dir)
  }
  return d
}

function formatMonthParam(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function CalendarSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="py-2.5 px-2">
            <Skeleton className="h-3 w-8 mx-auto" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className={`min-h-[84px] p-2 ${i % 7 !== 6 ? 'border-r border-border' : ''} ${i < 28 ? 'border-b border-border' : ''}`}
          >
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-2 w-6 mt-2" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const { restaurant } = useMyRestaurant()

  const [view, setView] = useState<CalendarView>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [days, setDays] = useState<DayData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null)

  const fetchDays = useCallback(async () => {
    if (!restaurant?.id) return
    setLoading(true)
    setError(null)
    try {
      const monthParam = formatMonthParam(currentDate)
      const data = await api.get<{ days: DayData[] }>('/api/dashboard/calendar', {
        restaurantId: restaurant.id,
        month: monthParam,
      })
      setDays(data.days ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }, [restaurant?.id, currentDate])

  useEffect(() => {
    fetchDays()
  }, [fetchDays])

  function handleNavigate(dir: -1 | 1) {
    setCurrentDate(prev => navigateDate(view, prev, dir))
  }

  function handleToday() {
    setCurrentDate(new Date())
  }

  function handleDayClick(date: Date) {
    setSelectedDate(date)
    setCurrentDate(date)
    setView('day')
  }

  function handleViewChange(v: CalendarView) {
    setView(v)
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await api.patch(`/api/bookings/${id}/status`, { status })
      setDays(prev =>
        prev.map(d => ({
          ...d,
          bookings: d.bookings.map(b => (b.id === id ? { ...b, status } : b)),
        }))
      )
    } catch (e) {
      console.error('Status update failed', e)
    }
  }

  const weekStart = getWeekMonday(currentDate)
  const selectedDateStr = (selectedDate ?? currentDate).toISOString().split('T')[0]
  const dayData = days.find(d => d.date === selectedDateStr)

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Monthly and weekly booking view"
      />

      <CalendarHeader
        view={view}
        onViewChange={handleViewChange}
        currentDate={currentDate}
        onNavigate={handleNavigate}
        onToday={handleToday}
      />

      {loading ? (
        <CalendarSkeleton />
      ) : error ? (
        <div className="bg-surface border border-border rounded-card">
          <EmptyState
            icon={Calendar}
            title="Failed to load calendar"
            description={error}
            action={
              <button
                onClick={fetchDays}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-btn transition-colors"
              >
                <RefreshCw size={14} /> Retry
              </button>
            }
          />
        </div>
      ) : (
        <>
          {view === 'month' && (
            <CalendarMonthView
              days={days}
              currentDate={currentDate}
              onDayClick={handleDayClick}
            />
          )}

          {view === 'week' && (
            <CalendarWeekView
              days={days}
              weekStart={weekStart}
              onBookingClick={setSelectedBooking}
            />
          )}

          {view === 'day' && (
            <CalendarDayView
              dayData={dayData}
              date={selectedDate ?? currentDate}
              onStatusChange={handleStatusChange}
            />
          )}
        </>
      )}

      <BookingDetailModal
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}
