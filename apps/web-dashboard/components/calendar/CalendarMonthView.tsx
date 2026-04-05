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
  currentDate: Date
  onDayClick: (date: Date) => void
}

const DOT_COLORS: Record<string, string> = {
  confirmed: 'bg-accent',
  pending:   'bg-amber',
  cancelled: 'bg-red-500',
  no_show:   'bg-gray-400',
  completed: 'bg-indigo-400',
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate()
}

function buildCalendarGrid(currentDate: Date): Date[] {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)

  // Monday-based: getDay() returns 0=Sun,1=Mon,...,6=Sat → we want Mon=0
  const startDow = (firstDay.getDay() + 6) % 7
  const endDow   = (lastDay.getDay() + 6) % 7

  const cells: Date[] = []

  // Pad from previous month
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    cells.push(d)
  }
  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month, d))
  }
  // Pad to next month to fill 6 rows
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push(new Date(year, month + 1, d))
  }
  return cells
}

export function CalendarMonthView({ days, currentDate, onDayClick }: Props) {
  const today = new Date()
  const cells = buildCalendarGrid(currentDate)
  const currentMonth = currentDate.getMonth()

  const dayMap = new Map<string, DayData>()
  days.forEach(d => dayMap.set(d.date, d))

  return (
    <div className="bg-surface border border-border rounded-card overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map(w => (
          <div key={w} className="py-2.5 text-center text-xs font-semibold text-muted uppercase tracking-wide">
            {w}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const isCurrentMonth = cell.getMonth() === currentMonth
          const isToday = isSameDay(cell, today)
          const dateStr = cell.toISOString().split('T')[0]
          const dayData = dayMap.get(dateStr)
          const isLastRow = idx >= 35

          // Collect unique status dots (max 3)
          const statusSet = new Set<string>()
          dayData?.bookings.forEach(b => statusSet.add(b.status))
          const dots = Array.from(statusSet).slice(0, 3)

          return (
            <button
              key={idx}
              onClick={() => onDayClick(cell)}
              className={[
                'relative p-2 min-h-[84px] text-left transition-colors group',
                !isLastRow && 'border-b border-border',
                (idx % 7) < 6 && 'border-r border-border',
                isCurrentMonth ? 'hover:bg-green-50/60' : 'hover:bg-surface-2/40',
                !isCurrentMonth && 'bg-surface-2/20',
              ].filter(Boolean).join(' ')}
            >
              {/* Date number */}
              <span
                className={[
                  'inline-flex items-center justify-center w-7 h-7 text-sm font-semibold rounded-full transition-colors',
                  isToday
                    ? 'bg-accent text-white ring-2 ring-accent ring-offset-1'
                    : isCurrentMonth
                    ? 'text-text group-hover:bg-accent/10'
                    : 'text-muted/50',
                ].filter(Boolean).join(' ')}
              >
                {cell.getDate()}
              </span>

              {/* Booking count badge */}
              {dayData && dayData.bookingCount > 0 && (
                <span className="absolute top-2 right-2 text-[10px] font-bold text-accent bg-accent/10 rounded-chip px-1.5 py-0.5 leading-none">
                  {dayData.bookingCount}
                </span>
              )}

              {/* Status dots */}
              {dots.length > 0 && (
                <div className="flex items-center gap-0.5 mt-1.5 flex-wrap">
                  {dots.map(status => (
                    <span
                      key={status}
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_COLORS[status] ?? 'bg-gray-400'}`}
                    />
                  ))}
                  {dayData && dayData.bookingCount > 3 && (
                    <span className="text-[9px] text-muted leading-none ml-0.5">+{dayData.bookingCount - 3}</span>
                  )}
                </div>
              )}

              {/* Guest count (only for current month days with data) */}
              {isCurrentMonth && dayData && dayData.guestCount > 0 && (
                <p className="text-[10px] text-muted mt-1 leading-tight">
                  {dayData.guestCount} guests
                </p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
