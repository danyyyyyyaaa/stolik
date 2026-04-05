'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type CalendarView = 'month' | 'week' | 'day'

interface Props {
  view: CalendarView
  onViewChange: (v: CalendarView) => void
  currentDate: Date
  onNavigate: (dir: -1 | 1) => void
  onToday: () => void
}

function getLabel(view: CalendarView, date: Date): string {
  if (view === 'month') {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  if (view === 'week') {
    const mon = new Date(date)
    const day = mon.getDay()
    const diff = day === 0 ? -6 : 1 - day
    mon.setDate(mon.getDate() + diff)
    const sun = new Date(mon)
    sun.setDate(sun.getDate() + 6)
    const weekNum = getWeekNumber(mon)
    const monStr = mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const sunStr = sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `Week ${weekNum} · ${monStr} – ${sunStr}`
  }
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: 'month', label: 'Month' },
  { key: 'week',  label: 'Week' },
  { key: 'day',   label: 'Day' },
]

export function CalendarHeader({ view, onViewChange, currentDate, onNavigate, onToday }: Props) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
      {/* Left: navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate(-1)}
          className="p-1.5 rounded-btn border border-border hover:bg-surface-2 text-muted hover:text-text transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-base font-semibold text-text min-w-[200px] text-center">
          {getLabel(view, currentDate)}
        </span>
        <button
          onClick={() => onNavigate(1)}
          className="p-1.5 rounded-btn border border-border hover:bg-surface-2 text-muted hover:text-text transition-colors"
          aria-label="Next"
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={onToday}
          className="ml-1 px-3 py-1.5 text-xs font-semibold border border-border rounded-btn hover:bg-surface-2 text-muted hover:text-text transition-colors"
        >
          Today
        </button>
      </div>

      {/* Right: view toggle */}
      <div className="flex items-center gap-1 bg-surface-2/60 border border-border rounded-btn p-0.5">
        {VIEWS.map(v => (
          <button
            key={v.key}
            onClick={() => onViewChange(v.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
              view === v.key
                ? 'bg-accent text-white shadow-sm'
                : 'text-muted hover:text-text hover:bg-surface-2'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  )
}
