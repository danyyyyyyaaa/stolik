'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { pl, enUS, ru, uk } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  CheckCircle, XCircle, RefreshCw, Plus,
  Users, Clock, CalendarCheck, AlertCircle, ChevronDown, Download,
  Code2, Copy, X, TrendingUp, TrendingDown, Minus,
  Camera, LayoutGrid, Bookmark, ChevronRight,
} from 'lucide-react'
import clsx from 'clsx'
import CreateBookingModal from '@/components/CreateBookingModal'
import { useT, useLang } from '@/lib/i18n'

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
  table?:     { id: string; name: string } | null
}

type Restaurant = {
  id: string; name: string; emoji?: string; slug?: string
  coverImage?: string | null
  openMonday?: string | null; openTuesday?: string | null
  openWednesday?: string | null; openThursday?: string | null
  openFriday?: string | null; openSaturday?: string | null
  openSunday?: string | null
  tables?: { id: string }[]
}

type DailyPoint = { date: string; count: number }
type YesterdayCounts = { total: number; confirmed: number; pending: number; noShow: number }

// ─── Embed Widget Modal ───────────────────────────────────────────────────────

function EmbedModal({ restaurant, onClose }: { restaurant: Restaurant; onClose: () => void }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const slug = restaurant.slug ?? restaurant.id
  const code = `<script src="https://stolik-production.up.railway.app/widget/stolik.js" data-restaurant="${slug}"></script>`

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-accent/10 border border-accent/20 rounded-lg">
              <Code2 size={16} className="text-accent" />
            </div>
            <h2 className="font-bold text-text">{t.embedWidgetTitle}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface-2 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted leading-relaxed">{t.embedWidgetDesc}</p>
          <div className="relative group">
            <pre className="bg-surface-2 border border-border rounded-xl px-4 py-4 text-xs font-mono text-accent overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
              {code}
            </pre>
            <button
              onClick={handleCopy}
              className={clsx(
                'absolute top-2.5 right-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                copied
                  ? 'bg-accent text-white'
                  : 'bg-surface border border-border text-muted hover:text-text hover:border-muted/50'
              )}
            >
              <Copy size={12} />
              {copied ? t.copied : t.copy}
            </button>
          </div>
          <div className="flex items-start gap-2.5 p-3.5 bg-surface-2 border border-border rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
            <p className="text-xs text-muted leading-relaxed">
              {restaurant.emoji} <span className="font-semibold text-text">{restaurant.name}</span>
              {' — '}
              <span className="font-mono text-accent/80">{slug}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Trend badge ──────────────────────────────────────────────────────────────

function TrendBadge({ current, yesterday }: { current: number; yesterday: number }) {
  if (yesterday === 0 && current === 0) return null
  if (yesterday === 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-green-400">
        <TrendingUp size={11} /> new
      </span>
    )
  }
  const pct = Math.round(((current - yesterday) / yesterday) * 100)
  if (pct === 0) return (
    <span className="flex items-center gap-0.5 text-xs font-medium text-muted">
      <Minus size={11} /> 0%
    </span>
  )
  const up = pct > 0
  return (
    <span className={clsx('flex items-center gap-0.5 text-xs font-semibold', up ? 'text-green-400' : 'text-red-400')}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {up ? '+' : ''}{pct}%
    </span>
  )
}

// ─── Weekly chart ─────────────────────────────────────────────────────────────

function WeeklyChart({ data }: { data: DailyPoint[] }) {
  const formatted = data.map(d => ({
    ...d,
    label: format(parseISO(d.date), 'EEE', { locale: enUS }),
    isToday: d.date === new Date().toISOString().slice(0, 10),
  }))

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-text mb-4">Last 7 days</h3>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={formatted} barSize={22} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }}
            axisLine={false} tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            contentStyle={{
              background: 'rgb(var(--surface-2))',
              border: '1px solid rgb(var(--border))',
              borderRadius: 8,
              fontSize: 12,
              color: 'rgb(var(--text))',
            }}
            labelStyle={{ color: 'rgb(var(--muted))' }}
            formatter={(v: number) => [v, 'Bookings']}
          />
          <Bar
            dataKey="count"
            radius={[4, 4, 0, 0]}
            fill="rgb(var(--accent))"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Timeline heatmap ─────────────────────────────────────────────────────────

function TimelineBar({ bookings }: { bookings: Booking[] }) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 12) // 12–23
  const slotMap: Record<number, number> = {}
  const maxSlot = { count: 0 }

  bookings.forEach(b => {
    const h = parseInt(b.time.split(':')[0], 10)
    if (h >= 12 && h <= 23) {
      slotMap[h] = (slotMap[h] ?? 0) + 1
      if (slotMap[h] > maxSlot.count) maxSlot.count = slotMap[h]
    }
  })

  const peakHour = Object.entries(slotMap).sort((a, b) => b[1] - a[1])[0]?.[0]

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text">Today's timeline</h3>
        {peakHour && (
          <span className="text-xs text-muted">
            Peak: <span className="text-accent font-semibold">{peakHour}:00</span>
          </span>
        )}
      </div>
      <div className="flex gap-1 items-end h-12">
        {hours.map(h => {
          const count = slotMap[h] ?? 0
          const intensity = maxSlot.count > 0 ? count / maxSlot.count : 0
          const now = new Date().getHours()
          const isCurrent = h === now
          return (
            <div key={h} className="flex-1 flex flex-col items-center gap-1" title={`${h}:00 — ${count} booking${count !== 1 ? 's' : ''}`}>
              <div
                className={clsx('w-full rounded-sm transition-all', isCurrent && 'ring-1 ring-accent/60')}
                style={{
                  height: `${Math.max(4, intensity * 40)}px`,
                  background: count === 0
                    ? 'rgba(255,255,255,0.06)'
                    : `rgb(var(--accent) / ${Math.round((0.25 + intensity * 0.75) * 100)}%)`,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {hours.map(h => (
          <div key={h} className="flex-1 text-center text-[9px] text-muted/60 tabular-nums">
            {h}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Quick stats ──────────────────────────────────────────────────────────────

function QuickStats({
  bookings, tableCount, weekData,
}: {
  bookings: Booking[]
  tableCount: number
  weekData: DailyPoint[]
}) {
  // Most popular time slot today
  const slotMap: Record<string, number> = {}
  bookings.forEach(b => { slotMap[b.time] = (slotMap[b.time] ?? 0) + 1 })
  const popularSlot = Object.entries(slotMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  // Avg party size this week
  const weekBookingsCount = weekData.reduce((s, d) => s + d.count, 0)
  const totalPeople = bookings.reduce((s, b) => s + b.guestCount, 0)
  const avgParty = bookings.length > 0 ? (totalPeople / bookings.length).toFixed(1) : '—'

  // Occupancy: today's peak concurrent vs table count
  const peakCount = Math.max(0, ...Object.values(slotMap))
  const occupancy = tableCount > 0 ? Math.min(100, Math.round((peakCount / tableCount) * 100)) : 0

  const items = [
    { label: 'Popular slot', value: popularSlot === '—' ? '—' : `${popularSlot}`, icon: Clock, color: 'text-purple-400 bg-purple-400/10' },
    { label: 'Avg. party size', value: avgParty, icon: Users, color: 'text-blue-400 bg-blue-400/10' },
    { label: 'Peak occupancy', value: tableCount > 0 ? `${occupancy}%` : '—', icon: LayoutGrid, color: 'text-amber-400 bg-amber-400/10' },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-surface border border-border rounded-xl px-4 py-3.5 flex items-center gap-3">
          <div className={clsx('p-2 rounded-lg shrink-0', color)}>
            <Icon size={15} />
          </div>
          <div>
            <p className="text-lg font-bold text-text tabular-nums leading-tight">{value}</p>
            <p className="text-xs text-muted mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Onboarding checklist ─────────────────────────────────────────────────────

function OnboardingChecklist({ restaurant, bookingsCount, onDismiss }: {
  restaurant: Restaurant
  bookingsCount: number
  onDismiss: () => void
}) {
  const hasPhoto   = !!restaurant.coverImage
  const hasHours   = !!(restaurant.openMonday || restaurant.openFriday || restaurant.openSaturday)
  const hasTables  = (restaurant.tables?.length ?? 0) > 0
  const hasBooking = bookingsCount > 0

  const items = [
    { done: hasPhoto,   icon: Camera,   label: 'Add a cover photo',        hint: 'Upload in restaurant settings' },
    { done: hasHours,   icon: Clock,    label: 'Set opening hours',        hint: 'So guests know when to book' },
    { done: hasTables,  icon: LayoutGrid, label: 'Add your tables',        hint: 'Go to Tables tab' },
    { done: hasBooking, icon: Bookmark, label: 'Receive your first booking', hint: 'Share your widget link' },
  ]

  const completed = items.filter(i => i.done).length
  if (completed === items.length) return null

  const pct = Math.round((completed / items.length) * 100)

  return (
    <div className="bg-surface border border-border rounded-xl p-5 relative">
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface-2 transition-colors"
        title="Dismiss"
      >
        <X size={14} />
      </button>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-accent/10 border border-accent/20 rounded-lg">
          <ChevronRight size={15} className="text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text">Set up your restaurant</h3>
          <p className="text-xs text-muted mt-0.5">{completed} of {items.length} done</p>
        </div>
        <div className="ml-auto text-sm font-bold text-accent">{pct}%</div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-surface-2 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-2">
        {items.map(({ done, icon: Icon, label, hint }) => (
          <div key={label} className={clsx('flex items-center gap-3 py-2 px-3 rounded-lg', done ? 'opacity-50' : 'bg-surface-2')}>
            <div className={clsx('shrink-0 w-5 h-5 rounded-full flex items-center justify-center',
              done ? 'bg-green-500/20 text-green-400' : 'bg-surface border border-border text-muted'
            )}>
              {done ? <CheckCircle size={13} /> : <Icon size={11} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={clsx('text-xs font-medium', done ? 'line-through text-muted' : 'text-text')}>{label}</p>
              {!done && <p className="text-xs text-muted/60 mt-0.5">{hint}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const DATE_LOCALES = { PL: pl, EN: enUS, RU: ru, UK: uk }

function SkeletonRow() {
  return (
    <tr className="border-b border-border animate-pulse">
      <td className="px-6 py-4"><div className="w-14 h-4 bg-surface-2 rounded-md" /></td>
      <td className="px-6 py-4">
        <div className="w-36 h-4 bg-surface-2 rounded-md mb-1.5" />
        <div className="w-20 h-3 bg-surface-2/70 rounded-md" />
      </td>
      <td className="px-6 py-4"><div className="w-8 h-4 bg-surface-2 rounded-md" /></td>
      <td className="px-6 py-4"><div className="w-24 h-5 bg-surface-2 rounded-full" /></td>
      <td className="px-6 py-4"><div className="w-10 h-4 bg-surface-2 rounded-md" /></td>
      <td className="px-6 py-4">
        <div className="flex justify-end gap-2">
          <div className="w-24 h-7 bg-surface-2 rounded-lg" />
          <div className="w-20 h-7 bg-surface-2 rounded-lg" />
        </div>
      </td>
    </tr>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'confirmed' | 'pending' | 'no_show' | 'cancelled'

export default function DashboardPage() {
  const router   = useRouter()
  const t        = useT()
  const { lang } = useLang()

  const [token,           setToken]           = useState<string | null>(null)
  const [restaurants,     setRestaurants]     = useState<Restaurant[]>([])
  const [activeId,        setActiveId]        = useState<string | null>(null)
  const [bookings,        setBookings]        = useState<Booking[]>([])
  const [loading,         setLoading]         = useState(false)
  const [updating,        setUpdating]        = useState<string | null>(null)
  const [showModal,       setShowModal]       = useState(false)
  const [showRestDrop,    setShowRestDrop]    = useState(false)
  const [showEmbed,       setShowEmbed]       = useState(false)
  const [statusFilter,    setStatusFilter]    = useState<StatusFilter>('all')
  const [weekData,        setWeekData]        = useState<DailyPoint[]>([])
  const [yesterday,       setYesterday]       = useState<YesterdayCounts>({ total: 0, confirmed: 0, pending: 0, noShow: 0 })
  const [checklistDismissed, setChecklistDismissed] = useState(false)

  // ── auth ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const tok = localStorage.getItem('stolik_token')
    if (!tok) { router.push('/login'); return }
    setToken(tok)
    const dismissed = localStorage.getItem('stolik_checklist_dismissed')
    if (dismissed) setChecklistDismissed(true)
  }, [router])

  // ── restaurants ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return
    fetch(`${API}/api/restaurants`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: Restaurant[]) => {
        if (!Array.isArray(data)) return
        setRestaurants(data)
        const stored   = localStorage.getItem('stolik_active_restaurant')
        const storedId = stored ? JSON.parse(stored)?.id : null
        const initial  = data.find(r => r.id === storedId) ?? data[0]
        if (initial) setActiveId(initial.id)
      })
      .catch(console.error)
  }, [token])

  // ── bookings + stats ─────────────────────────────────────────────────────────
  const fetchBookings = useCallback(async (restaurantId: string) => {
    if (!token) return
    setLoading(true)
    try {
      const [bookingsRes, statsRes] = await Promise.all([
        fetch(`${API}/api/bookings/today/${restaurantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/bookings/stats/${restaurantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])
      const [bookingsData, statsData] = await Promise.all([bookingsRes.json(), statsRes.json()])
      setBookings(Array.isArray(bookingsData) ? bookingsData : [])
      if (statsData?.daily) setWeekData(statsData.daily)
      if (statsData?.yesterday) setYesterday(statsData.yesterday)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { if (activeId) fetchBookings(activeId) }, [activeId, fetchBookings])

  // ── export CSV ───────────────────────────────────────────────────────────────
  function exportCsv() {
    if (!bookings.length) return
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const headers  = ['Ref', 'Time', 'Guest', 'Phone', 'Persons', 'Status', 'Table', 'Notes']
    const rows     = bookings
      .sort((a, b) => a.time.localeCompare(b.time))
      .map(b => [b.bookingRef, b.time, b.guestName, b.guestPhone, b.guestCount, b.status, b.table?.name ?? '', b.notes ?? ''])
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `bookings-${todayStr}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── update status ─────────────────────────────────────────────────────────────
  async function updateStatus(bookingId: string, status: string) {
    if (!token) return
    setUpdating(bookingId)
    try {
      await fetch(`${API}/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
    } finally { setUpdating(null) }
  }

  if (!token) return null

  const dateLocale       = DATE_LOCALES[lang] ?? pl
  const today            = format(new Date(), 'EEEE, d MMMM yyyy', { locale: dateLocale })
  const activeRestaurant = restaurants.find(r => r.id === activeId)

  const counts = {
    total:     bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    pending:   bookings.filter(b => b.status === 'pending').length,
    noShow:    bookings.filter(b => b.status === 'no_show').length,
  }

  const filteredBookings = statusFilter === 'all'
    ? bookings
    : bookings.filter(b => b.status === statusFilter)

  const statusCfg: Record<string, { label: string; cls: string }> = {
    pending:   { label: t.pending,   cls: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/25' },
    confirmed: { label: t.confirmed, cls: 'text-green-400  bg-green-400/10  border-green-400/25'  },
    cancelled: { label: t.cancelled, cls: 'text-red-400    bg-red-400/10    border-red-400/25'    },
    completed: { label: t.completed, cls: 'text-muted      bg-surface-2     border-border'        },
    no_show:   { label: t.no_show,   cls: 'text-red-500    bg-red-500/10    border-red-500/25'    },
  }

  const filterTabs: { key: StatusFilter; label: string; count?: number }[] = [
    { key: 'all',       label: 'All',       count: counts.total     },
    { key: 'confirmed', label: t.confirmed, count: counts.confirmed },
    { key: 'pending',   label: t.pending,   count: counts.pending   },
    { key: 'no_show',   label: t.no_show,   count: counts.noShow    },
  ]

  const tableCount = activeRestaurant?.tables?.length ?? 0

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Page header ────────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-border bg-surface px-8 py-5 flex items-center justify-between">
        <div>
          {restaurants.length > 1 ? (
            <div className="relative">
              <button
                onClick={() => setShowRestDrop(v => !v)}
                className="flex items-center gap-2 text-lg font-bold text-text hover:opacity-80 transition-opacity"
              >
                <span>{activeRestaurant?.emoji}</span>
                <span>{activeRestaurant?.name ?? '…'}</span>
                <ChevronDown size={16} className={clsx('text-muted transition-transform mt-0.5', showRestDrop && 'rotate-180')} />
              </button>
              {showRestDrop && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowRestDrop(false)} />
                  <div className="absolute top-full left-0 mt-2 bg-surface-2 border border-border rounded-xl shadow-2xl py-1 min-w-48 z-20">
                    {restaurants.map(r => (
                      <button
                        key={r.id}
                        onClick={() => { setActiveId(r.id); setShowRestDrop(false) }}
                        className={clsx(
                          'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors',
                          r.id === activeId ? 'text-accent bg-accent/8' : 'text-text hover:bg-border/40'
                        )}
                      >
                        <span>{r.emoji}</span>
                        <span className="flex-1">{r.name}</span>
                        {r.id === activeId && <span className="text-accent">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <h1 className="text-lg font-bold text-text">
              {activeRestaurant?.emoji} {activeRestaurant?.name ?? 'Panel'}
            </h1>
          )}
          <p className="text-sm text-muted mt-0.5 capitalize">{today}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => activeId && fetchBookings(activeId)}
            disabled={loading}
            className="p-2 rounded-lg text-muted hover:text-text hover:bg-surface-2 transition-colors disabled:opacity-40"
            title={t.refresh}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          {bookings.length > 0 && (
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-3.5 py-2 bg-surface-2 hover:bg-border/60 text-text border border-border hover:border-muted/50 text-sm font-semibold rounded-lg transition-colors"
            >
              <Download size={15} />
              {t.exportCsv}
            </button>
          )}
          {activeRestaurant && (
            <button
              onClick={() => setShowEmbed(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-surface-2 hover:bg-border/60 text-text border border-border hover:border-muted/50 text-sm font-semibold rounded-lg transition-colors"
            >
              <Code2 size={15} />
              {t.embedWidget}
            </button>
          )}
          {activeId && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Plus size={15} />
              {t.newBooking}
            </button>
          )}
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-8 py-7 space-y-5">

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: t.total,      value: counts.total,     yest: yesterday.total,     icon: CalendarCheck, color: 'text-blue-400   bg-blue-400/10'   },
            { label: t.confirmed,  value: counts.confirmed, yest: yesterday.confirmed, icon: CheckCircle,   color: 'text-green-400  bg-green-400/10'  },
            { label: t.pending,    value: counts.pending,   yest: yesterday.pending,   icon: Clock,         color: 'text-yellow-400 bg-yellow-400/10' },
            { label: t.noShowStat, value: counts.noShow,    yest: yesterday.noShow,    icon: AlertCircle,   color: 'text-red-400    bg-red-400/10'    },
          ].map(({ label, value, yest, icon: Icon, color }) => (
            <button
              key={label}
              onClick={() => {
                const map: Record<string, StatusFilter> = {
                  [t.confirmed]: 'confirmed', [t.pending]: 'pending', [t.noShowStat]: 'no_show',
                }
                setStatusFilter(map[label] ?? 'all')
              }}
              className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4 hover:border-muted/40 transition-colors text-left"
            >
              <div className={clsx('p-2.5 rounded-lg shrink-0', color)}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-bold text-text tabular-nums">{value}</p>
                <p className="text-xs text-muted mt-0.5">{label}</p>
              </div>
              <TrendBadge current={value} yesterday={yest} />
            </button>
          ))}
        </div>

        {/* Chart row */}
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-3">
            <WeeklyChart data={weekData} />
          </div>
          <div className="col-span-2">
            <TimelineBar bookings={bookings} />
          </div>
        </div>

        {/* Quick stats */}
        <QuickStats bookings={bookings} tableCount={tableCount} weekData={weekData} />

        {/* Onboarding checklist */}
        {activeRestaurant && !checklistDismissed && (
          <OnboardingChecklist
            restaurant={activeRestaurant}
            bookingsCount={counts.total}
            onDismiss={() => {
              setChecklistDismissed(true)
              localStorage.setItem('stolik_checklist_dismissed', '1')
            }}
          />
        )}

        {/* Bookings table */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-1">
              {filterTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    statusFilter === tab.key
                      ? 'bg-accent/15 text-accent border border-accent/25'
                      : 'text-muted hover:text-text hover:bg-surface-2'
                  )}
                >
                  {tab.label}
                  <span className={clsx(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                    statusFilter === tab.key ? 'bg-accent/20 text-accent' : 'bg-surface-2 text-muted'
                  )}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            <span className="text-xs text-muted px-2.5 py-1 bg-surface-2 rounded-full border border-border">
              {t.bookingsCount(filteredBookings.length)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-2/40">
                  {[t.time, t.guest, t.persons, t.status, t.table, t.actions].map((h, i) => (
                    <th
                      key={h}
                      className={clsx(
                        'px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap',
                        i === 5 ? 'text-right' : 'text-left'
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-24 text-center">
                      <p className="text-4xl mb-3">🗓️</p>
                      <p className="text-sm text-muted">{t.noBookingsToday}</p>
                    </td>
                  </tr>
                ) : (
                  filteredBookings
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map(booking => {
                      const cfg  = statusCfg[booking.status] ?? { label: booking.status, cls: 'text-muted border-border' }
                      const busy = updating === booking.id
                      return (
                        <tr key={booking.id} className="hover:bg-surface-2/40 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-text text-sm">{booking.time}</span>
                          </td>
                          <td className="px-6 py-4 max-w-[220px]">
                            <p className="font-medium text-text text-sm truncate">{booking.guestName}</p>
                            {booking.notes && (
                              <p className="text-xs text-yellow-500/70 mt-0.5 italic truncate">💬 {booking.notes}</p>
                            )}
                            <p className="text-xs text-muted mt-0.5 font-mono">{booking.bookingRef}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5 text-sm text-muted">
                              <Users size={13} />
                              {booking.guestCount}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={clsx('inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border', cfg.cls)}>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-muted">{booking.table?.name ?? '—'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {booking.status === 'pending' && (
                                <button
                                  onClick={() => updateStatus(booking.id, 'confirmed')}
                                  disabled={busy}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                                >
                                  <CheckCircle size={12} />
                                  {t.confirm}
                                </button>
                              )}
                              {(booking.status === 'pending' || booking.status === 'confirmed') && (
                                <>
                                  <button
                                    onClick={() => updateStatus(booking.id, 'cancelled')}
                                    disabled={busy}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 hover:bg-red-500/10 disabled:opacity-50 text-muted hover:text-red-400 border border-border hover:border-red-500/20 text-xs font-semibold rounded-lg transition-colors"
                                  >
                                    <X size={12} />
                                    {t.cancel}
                                  </button>
                                  <button
                                    onClick={() => updateStatus(booking.id, 'no_show')}
                                    disabled={busy}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 text-red-400 border border-red-500/20 text-xs font-semibold rounded-lg transition-colors"
                                  >
                                    <XCircle size={12} />
                                    {t.markNoShow}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create booking modal */}
      {showModal && activeId && (
        <CreateBookingModal
          restaurantId={activeId}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); if (activeId) fetchBookings(activeId) }}
        />
      )}

      {/* Embed widget modal */}
      {showEmbed && activeRestaurant && (
        <EmbedModal
          restaurant={activeRestaurant}
          onClose={() => setShowEmbed(false)}
        />
      )}
    </div>
  )
}
