'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, Users, CalendarCheck, TrendingUp, Activity } from 'lucide-react'
import clsx from 'clsx'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

type Stats = { totalRestaurants: number; activeRestaurants: number; totalBookings: number; totalUsers: number; bookingsToday: number }
type Restaurant = { id: string; name: string; emoji?: string; isActive: boolean; plan: string; createdAt: string; owner?: { email: string } }

export default function AdminPage() {
  const [tok, setTok] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  useEffect(() => {
    const t = localStorage.getItem('stolik_token')
    setTok(t)
    if (!t) return
    Promise.all([
      fetch(`${API}/api/admin/stats`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
      fetch(`${API}/api/admin/restaurants`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
    ]).then(([s, r]) => {
      if (s && typeof s === 'object' && !s.error) setStats(s)
      setRestaurants(Array.isArray(r) ? r : [])
    }).finally(() => setLoading(false))
  }, [])

  async function toggleActive(id: string, active: boolean) {
    if (!tok) return
    setActionId(id)
    const ep = active ? 'deactivate' : 'approve'
    await fetch(`${API}/api/admin/restaurants/${id}/${ep}`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${tok}` }
    })
    setRestaurants(p => p.map(r => r.id === id ? { ...r, isActive: !active } : r))
    setActionId(null)
  }

  if (loading) return <div className="flex items-center justify-center h-full"><span className="text-muted text-sm animate-pulse">Loading…</span></div>

  const CARDS = stats ? [
    { label: 'Restaurants', value: stats.totalRestaurants, icon: Building2,    color: 'text-blue-400 bg-blue-400/10'   },
    { label: 'Active',      value: stats.activeRestaurants, icon: Activity,     color: 'text-green-400 bg-green-400/10' },
    { label: 'Bookings',    value: stats.totalBookings,     icon: CalendarCheck, color: 'text-purple-400 bg-purple-400/10' },
    { label: 'Users',       value: stats.totalUsers,        icon: Users,        color: 'text-amber-400 bg-amber-400/10' },
    { label: 'Today',       value: stats.bookingsToday,     icon: TrendingUp,   color: 'text-accent bg-accent/10'       },
  ] : []

  return (
    <div className="flex flex-col min-h-full">
      <header className="border-b border-border bg-surface px-8 py-5">
        <h1 className="text-xl font-bold text-text">Platform Overview</h1>
        <p className="text-sm text-muted mt-0.5">All restaurants and users on Stolik</p>
      </header>
      <div className="flex-1 px-8 py-6 space-y-6">
        {CARDS.length > 0 && (
          <div className="grid grid-cols-5 gap-4">
            {CARDS.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-surface border border-border rounded-xl p-5 flex items-center gap-3">
                <div className={clsx('p-2.5 rounded-lg shrink-0', color)}><Icon size={18} /></div>
                <div>
                  <p className="text-2xl font-bold text-text tabular-nums">{value}</p>
                  <p className="text-xs text-muted mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border"><h2 className="font-semibold text-text">Restaurants</h2></div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-2/40">
                {['Name', 'Owner', 'Plan', 'Status', 'Created', 'Actions'].map((h, i) => (
                  <th key={h} className={clsx('px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider', i === 5 ? 'text-right' : 'text-left')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {restaurants.map(r => (
                <tr key={r.id} className="hover:bg-surface-2/40 transition-colors">
                  <td className="px-6 py-4"><span className="font-medium text-text text-sm">{r.emoji} {r.name}</span></td>
                  <td className="px-6 py-4 text-sm text-muted">{r.owner?.email ?? '—'}</td>
                  <td className="px-6 py-4"><span className="text-xs px-2 py-1 bg-surface-2 border border-border rounded-full text-muted">{r.plan}</span></td>
                  <td className="px-6 py-4">
                    <span className={clsx('text-xs font-semibold px-2 py-1 rounded-full border', r.isActive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20')}>
                      {r.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => toggleActive(r.id, r.isActive)} disabled={actionId === r.id}
                        className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50',
                          r.isActive ? 'text-red-400 border-red-500/20 hover:bg-red-500/10' : 'text-green-400 border-green-500/20 hover:bg-green-500/10')}>
                        {r.isActive ? 'Deactivate' : 'Approve'}
                      </button>
                      <Link href={`/admin/restaurants/${r.id}`} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted hover:text-text hover:bg-surface-2 transition-colors">View</Link>
                    </div>
                  </td>
                </tr>
              ))}
              {restaurants.length === 0 && <tr><td colSpan={6} className="py-16 text-center text-muted text-sm">No restaurants</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
