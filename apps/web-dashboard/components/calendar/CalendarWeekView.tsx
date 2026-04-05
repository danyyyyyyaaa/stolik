'use client'

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
  days: DayData[]
  weekStart: Date
  onBookingClick: (booking: BookingData) => void
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 9) // 09:00–22:00
const ROW_HEIGHT = 60 // px per hour
const START_HOUR = 9

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-green-50 border-l-4 border-accent text-accent',
  pending:   'bg-amber-50 border-l-4 border-amber-500 text-amber-700',
  cancelled: 'bg-red-50 border-l-4 border-red-500 text-red-700 opacity-60',
  no_show:   'bg-gray-50 border-l-4 border-gray-400 text-gray-600 opacity-60',
  completed: 'bg-indigo-50 border-l-4 border-indigo-400 text-indigo-700',
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m ?? 0)
}

function getDuration(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime)
  const end   = parseTimeToMinutes(endTime)
  const diff  = end - start
  return diff > 0 ? diff : 60
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
}

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function CalendarWeekView({ days, weekStart, onBookingClick }: Props) {
  const weekDays = getWeekDays(weekStart)
  const today = new Date()

  const dayMap = new Map<string, DayData>()
  days.forEach(d => dayMap.set(d.date, d))

  const totalHeight = HOURS.length * ROW_HEIGHT

  return (
    <div className="bg-surface border border-border rounded-card overflow-hidden">
      {/* Header row */}
      <div className="flex border-b border-border">
        {/* Time gutter */}
        <div className="w-14 flex-shrink-0 border-r border-border" />
        {weekDays.map((day, i) => {
          const isToday =
            day.getFullYear() === today.getFullYear() &&
            day.getMonth()    === today.getMonth() &&
            day.getDate()     === today.getDate()
          const dateStr = day.toISOString().split('T')[0]
          const dayData = dayMap.get(dateStr)
          return (
            <div
              key={i}
              className={`flex-1 py-2 text-center border-r border-border last:border-r-0 ${isToday ? 'bg-accent/5' : ''}`}
            >
              <p className="text-[10px] text-muted uppercase tracking-wide">{WEEKDAY_SHORT[i]}</p>
              <p className={`text-sm font-bold mt-0.5 ${isToday ? 'text-accent' : 'text-text'}`}>
                {day.getDate()}
              </p>
              {dayData && dayData.bookingCount > 0 && (
                <span className="text-[10px] text-muted">{dayData.bookingCount} bookings</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="flex overflow-y-auto" style={{ maxHeight: '600px' }}>
        {/* Time gutter */}
        <div className="w-14 flex-shrink-0 border-r border-border">
          {HOURS.map(h => (
            <div key={h} style={{ height: ROW_HEIGHT }} className="border-b border-border flex items-start justify-end pr-2 pt-1">
              <span className="text-[10px] text-muted">{String(h).padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map((day, colIdx) => {
          const isToday =
            day.getFullYear() === today.getFullYear() &&
            day.getMonth()    === today.getMonth() &&
            day.getDate()     === today.getDate()
          const dateStr = day.toISOString().split('T')[0]
          const dayData = dayMap.get(dateStr)

          return (
            <div
              key={colIdx}
              className={`flex-1 relative border-r border-border last:border-r-0 ${isToday ? 'bg-accent/5' : ''}`}
              style={{ height: totalHeight }}
            >
              {/* Hour grid lines */}
              {HOURS.map(h => (
                <div
                  key={h}
                  className="absolute w-full border-b border-border/50"
                  style={{ top: (h - START_HOUR) * ROW_HEIGHT, height: ROW_HEIGHT }}
                />
              ))}

              {/* Booking blocks */}
              {dayData?.bookings.map(booking => {
                const startMins = parseTimeToMinutes(booking.time)
                const duration  = getDuration(booking.time, booking.endTime)
                const topPx = (startMins - START_HOUR * 60) / 60 * ROW_HEIGHT
                const heightPx = Math.max(duration / 60 * ROW_HEIGHT, 24)

                if (topPx < 0 || topPx >= totalHeight) return null

                const style = STATUS_STYLES[booking.status] ?? 'bg-gray-50 border-l-4 border-gray-400 text-gray-700'

                return (
                  <button
                    key={booking.id}
                    onClick={() => onBookingClick(booking)}
                    className={`absolute inset-x-0.5 rounded-sm px-1.5 py-1 text-left overflow-hidden hover:opacity-90 transition-opacity shadow-sm ${style}`}
                    style={{ top: topPx, height: heightPx }}
                    title={`${booking.guestName} · ${booking.time}`}
                  >
                    <p className="text-[10px] font-bold leading-tight truncate">{booking.guestName}</p>
                    {heightPx > 32 && (
                      <p className="text-[9px] leading-tight truncate opacity-70">
                        {booking.partySize}p {booking.tableName ? `· ${booking.tableName}` : ''}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
