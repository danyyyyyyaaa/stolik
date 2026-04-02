'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

type Booking = {
  id:         string
  bookingRef: string
  status:     string
  time:       string
  guestCount: number
  guestName:  string
  guestPhone: string
  notes?:     string
  date:       string
  table?:     { name: string } | null
}

type View = 'day' | 'week'

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
  confirmed: 'bg-green-500/20 border-green-500/40 text-green-300',
  cancelled: 'bg-surface-2 border-border text-muted line-through',
  completed: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  no_show:   'bg-red-500/20 border-red-500/40 text-red-300',
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 10) // 10:00 – 22:00

interface Props {
  restaurantId: string
  token:        string
}

export default function BookingsCalendarView({ restaurantId, token }: Props) {
  const [view,       setView]       = useState<View>('day')
  const [currentDay, setCurrentDay] = useState(new Date())
  const [weekStart,  setWeekStart]  = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [bookings,   setBookings]   = useState<Booking[]>([])
  const [loading,    setLoading]    = useState(false)
  const [selected,   setSelected]   = useState<Booking | null>(null)

  const fetchBookings = useCallback(async (from: string, to: string) => {
    setLoading(true)
    try {
      const res = await fetch(
        `${API}/api/bookings?restaurantId=${restaurantId}&from=${from}&to=${to}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (res.ok) setBookings(await res.json())
    } catch {}
    finally { setLoading(false) }
  }, [restaurantId, token])

  useEffect(() => {
    if (view === 'day') {
      const d = format(currentDay, 'yyyy-MM-dd')
      fetchBookings(d, d)
    } else {
      const from = format(weekStart, 'yyyy-MM-dd')
      const to   = format(addDays(weekStart, 6), 'yyyy-MM-dd')
      fetchBookings(from, to)
    }
  }, [view, currentDay, weekStart, fetchBookings])

  // ── Day view ──────────────────────────────────────────────────────────────
  function DayView() {
    return (
      <div className="relative overflow-y-auto max-h-[calc(100vh-240px)]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/60 z-10">
            <span className="text-muted text-sm animate-pulse">Loading…</span>
          </div>
        )}
        {HOURS.map(h => {
          const timeStr = `${h.toString().padStart(2, '0')}:00`
          const halfStr = `${h.toString().padStart(2, '0')}:30`
          const booksAtHour = bookings.filter(b => b.time === timeStr || b.time === halfStr)
          return (
            <div key={h} className="flex border-b border-border/40 min-h-[56px]">
              <div className="w-14 shrink-0 px-2 py-2 text-right text-xs text-muted font-mono select-none">
                {timeStr}
              </div>
              <div className="flex-1 p-1 flex flex-wrap gap-1 items-start">
                {booksAtHour.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelected(b)}
                    className={clsx(
                      'text-left px-2 py-1 rounded-lg border text-xs font-medium transition-all hover:opacity-80',
                      STATUS_COLORS[b.status] ?? STATUS_COLORS.pending,
                    )}
                  >
                    <span className="font-semibold">{b.time}</span>
                    {' · '}{b.guestName}
                    {' · '}{b.guestCount}p.
                  </button>
                ))}
              </div>
            </div>
          )
        })}
        {!loading && bookings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted gap-2">
            <span className="text-3xl">📅</span>
            <span className="text-sm">No bookings for this day</span>
          </div>
        )}
      </div>
    )
  }

  // ── Week view ─────────────────────────────────────────────────────────────
  function WeekView() {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    return (
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-px bg-border/30 min-w-[560px]">
          {days.map(day => {
            const dayStr    = format(day, 'yyyy-MM-dd')
            const dayBooks  = bookings.filter(b => b.date?.startsWith(dayStr))
            const isToday   = isSameDay(day, new Date())
            return (
              <div key={dayStr} className="bg-bg min-h-[180px] p-2 flex flex-col gap-1">
                <div className={clsx('text-center text-xs font-semibold mb-1 py-1 rounded-lg', isToday ? 'bg-accent/15 text-accent' : 'text-muted')}>
                  <div>{format(day, 'EEE')}</div>
                  <div className="text-sm font-bold">{format(day, 'd')}</div>
                </div>
                {dayBooks.slice(0, 4).map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelected(b)}
                    className={clsx(
                      'w-full text-left px-1.5 py-0.5 rounded border text-[10px] font-medium truncate transition-all hover:opacity-80',
                      STATUS_COLORS[b.status] ?? STATUS_COLORS.pending,
                    )}
                  >
                    {b.time} {b.guestName}
                  </button>
                ))}
                {dayBooks.length > 4 && (
                  <span className="text-[10px] text-muted text-center">+{dayBooks.length - 4} more</span>
                )}
              </div>
            )
          })}
        </div>
        {!loading && bookings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted gap-2">
            <span className="text-3xl">📅</span>
            <span className="text-sm">No bookings this week</span>
          </div>
        )}
      </div>
    )
  }

  // ── Booking detail modal ──────────────────────────────────────────────────
  function BookingModal() {
    if (!selected) return null
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSelected(null)} />
        <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-surface border border-border rounded-2xl shadow-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-text">{selected.bookingRef}</span>
            <span className={clsx('text-xs px-2 py-0.5 rounded-full border font-medium', STATUS_COLORS[selected.status])}>
              {selected.status}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Guest</span><span className="text-text font-medium">{selected.guestName}</span></div>
            <div className="flex justify-between"><span className="text-muted">Phone</span><span className="text-text">{selected.guestPhone}</span></div>
            <div className="flex justify-between"><span className="text-muted">Time</span><span className="text-text">{selected.time}</span></div>
            <div className="flex justify-between"><span className="text-muted">Guests</span><span className="text-text">{selected.guestCount}</span></div>
            {selected.table && <div className="flex justify-between"><span className="text-muted">Table</span><span className="text-text">{selected.table.name}</span></div>}
            {selected.notes && <div className="mt-2 p-2 bg-surface-2 rounded-lg text-muted text-xs">{selected.notes}</div>}
          </div>
          <button
            onClick={() => setSelected(null)}
            className="mt-4 w-full py-2 rounded-xl border border-border text-sm text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            Close
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* View toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden text-sm">
          {(['day', 'week'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={clsx(
                'px-3 py-1.5 font-medium transition-colors',
                view === v ? 'bg-accent text-white' : 'text-muted hover:text-text hover:bg-surface-2',
              )}
            >
              {v === 'day' ? 'Day' : 'Week'}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => view === 'day' ? setCurrentDay(d => addDays(d, -1)) : setWeekStart(w => subWeeks(w, 1))}
            className="p-1.5 rounded-lg border border-border text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => view === 'day' ? setCurrentDay(new Date()) : setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="px-3 py-1 text-sm rounded-lg border border-border text-muted hover:text-text hover:bg-surface-2 transition-colors font-medium"
          >
            Today
          </button>
          <button
            onClick={() => view === 'day' ? setCurrentDay(d => addDays(d, 1)) : setWeekStart(w => addWeeks(w, 1))}
            className="p-1.5 rounded-lg border border-border text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Current date label */}
        <span className="text-sm font-semibold text-text ml-1">
          {view === 'day'
            ? format(currentDay, 'EEEE, d MMMM yyyy')
            : `${format(weekStart, 'd MMM')} – ${format(addDays(weekStart, 6), 'd MMM yyyy')}`}
        </span>
      </div>

      {/* Calendar grid */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {view === 'day' ? <DayView /> : <WeekView />}
      </div>

      <BookingModal />
    </div>
  )
}
