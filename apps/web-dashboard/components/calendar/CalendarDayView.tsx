'use client'
import { Users, Phone, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'

interface BookingData {
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

interface DayData {
  date: string
  bookingCount: number
  guestCount: number
  bookings: BookingData[]
}

interface Props {
  dayData: DayData | undefined
  date: Date
  onStatusChange: (id: string, status: string) => void
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 9) // 09:00–22:00

function getHourFromTime(time: string): number {
  return parseInt(time.split(':')[0], 10)
}

const STATUS_ACTIONS: Record<string, { label: string; next: string; icon: React.ReactNode; cls: string }[]> = {
  pending: [
    { label: 'Confirm',  next: 'confirmed', icon: <CheckCircle size={13} />, cls: 'text-accent hover:bg-accent/10' },
    { label: 'Cancel',   next: 'cancelled', icon: <XCircle size={13} />,     cls: 'text-error hover:bg-error/10' },
  ],
  confirmed: [
    { label: 'Complete', next: 'completed', icon: <CheckCircle size={13} />, cls: 'text-accent hover:bg-accent/10' },
    { label: 'No-show',  next: 'no_show',   icon: <AlertCircle size={13} />, cls: 'text-amber hover:bg-amber/10' },
    { label: 'Cancel',   next: 'cancelled', icon: <XCircle size={13} />,     cls: 'text-error hover:bg-error/10' },
  ],
}

export function CalendarDayView({ dayData, date, onStatusChange }: Props) {
  const bookings = dayData?.bookings ?? []

  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const pendingCount   = bookings.filter(b => b.status === 'pending').length
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length
  const totalGuests    = bookings.reduce((sum, b) => sum + b.partySize, 0)

  return (
    <div className="flex gap-5 items-start">
      {/* Timeline */}
      <div className="flex-1 bg-surface border border-border rounded-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-text text-sm">{dateLabel}</h2>
          <p className="text-xs text-muted mt-0.5">{bookings.length} bookings · {totalGuests} guests</p>
        </div>

        {bookings.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted">No bookings for this day</div>
        ) : (
          <div>
            {HOURS.map(hour => {
              const hourStr = `${String(hour).padStart(2, '0')}:00`
              const hourBookings = bookings.filter(b => getHourFromTime(b.time) === hour)
              return (
                <div key={hour} className="flex border-b border-border/60 last:border-b-0 min-h-[56px]">
                  {/* Time label */}
                  <div className="w-16 flex-shrink-0 flex items-start justify-end pr-3 pt-3">
                    <span className="text-[11px] text-muted">{hourStr}</span>
                  </div>

                  {/* Booking cards for this hour */}
                  <div className="flex-1 py-1.5 pr-3 space-y-1.5">
                    {hourBookings.map(b => (
                      <div
                        key={b.id}
                        className={`rounded-btn border px-3 py-2 ${
                          b.status === 'pending'
                            ? 'border-amber-300 bg-amber-50/60'
                            : b.status === 'confirmed'
                            ? 'border-green-200 bg-green-50/60'
                            : b.status === 'cancelled' || b.status === 'no_show'
                            ? 'border-border bg-surface-2/40 opacity-70'
                            : 'border-border bg-surface'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm text-text truncate">{b.guestName}</p>
                              <StatusBadge status={b.status} />
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock size={11} /> {b.time}–{b.endTime}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users size={11} /> {b.partySize}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone size={11} /> {b.guestPhone}
                              </span>
                              {b.tableName && (
                                <span className="font-medium text-text">{b.tableName}</span>
                              )}
                            </div>
                            <p className="text-[10px] font-mono text-muted/70 mt-0.5">{b.bookingCode}</p>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {(STATUS_ACTIONS[b.status] ?? []).map(action => (
                              <button
                                key={action.next}
                                onClick={() => onStatusChange(b.id, action.next)}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${action.cls}`}
                                title={action.label}
                              >
                                {action.icon}
                                <span className="hidden sm:inline">{action.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sidebar summary */}
      <div className="w-52 flex-shrink-0 space-y-3">
        <div className="bg-surface border border-border rounded-card p-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Day Summary</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Total bookings</span>
              <span className="text-sm font-bold text-text">{bookings.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Total guests</span>
              <span className="text-sm font-bold text-text">{totalGuests}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Confirmed</span>
              <span className="text-sm font-bold text-accent">{confirmedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Pending</span>
              <span className="text-sm font-bold text-amber">{pendingCount}</span>
            </div>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-card p-3">
            <p className="text-xs font-semibold text-amber-700">
              {pendingCount} booking{pendingCount > 1 ? 's' : ''} need confirmation
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
