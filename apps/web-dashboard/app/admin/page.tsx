'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck, CheckCircle, XCircle, ExternalLink,
  RefreshCw, Store, Users,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

type Owner = { id: string; email: string; firstName: string; lastName: string }

type Restaurant = {
  id:         string
  name:       string
  slug:       string
  cuisine:    string
  city:       string
  address:    string
  isActive:   boolean
  isPremium:  boolean
  plan:       string
  emoji:      string | null
  coverImage: string | null
  createdAt:  string
  owner:      Owner
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      active
        ? 'bg-green-500/15 text-green-400'
        : 'bg-surface-2 text-muted border border-border'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-400' : 'bg-muted'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, string> = {
    free:     'bg-surface-2 text-muted border border-border',
    pro:      'bg-blue-500/15 text-blue-400',
    business: 'bg-amber-500/15 text-amber-400',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${map[plan] ?? map.free}`}>
      {plan}
    </span>
  )
}

export default function AdminPage() {
  const router = useRouter()

  const [token,       setToken]       = useState<string | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading,     setLoading]     = useState(true)
  const [updating,    setUpdating]    = useState<string | null>(null)
  const [error,       setError]       = useState('')

  useEffect(() => {
    const tok  = localStorage.getItem('stolik_token')
    const user = localStorage.getItem('stolik_user')
    if (!tok) { router.push('/login'); return }
    try {
      const parsed = JSON.parse(user ?? '{}')
      if (parsed.role !== 'admin') { router.push('/dashboard'); return }
    } catch { router.push('/dashboard'); return }
    setToken(tok)
  }, [router])

  useEffect(() => {
    if (!token) return
    fetchRestaurants()
  }, [token])

  async function fetchRestaurants() {
    setLoading(true); setError('')
    try {
      const res  = await fetch(`${API}/api/admin/restaurants`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { setError('Failed to load restaurants'); return }
      setRestaurants(await res.json())
    } catch {
      setError('Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(id: string, activate: boolean) {
    setUpdating(id)
    try {
      const action = activate ? 'approve' : 'deactivate'
      const res = await fetch(`${API}/api/admin/restaurants/${id}/${action}`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      setRestaurants(prev =>
        prev.map(r => r.id === id ? { ...r, isActive: activate } : r)
      )
    } finally {
      setUpdating(null)
    }
  }

  const active   = restaurants.filter(r => r.isActive).length
  const inactive = restaurants.filter(r => !r.isActive).length

  return (
    <div className="min-h-screen bg-bg">
      {/* Top bar */}
      <div className="border-b border-border bg-surface px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 border border-accent/20 rounded-lg">
            <ShieldCheck size={18} className="text-accent" />
          </div>
          <div>
            <h1 className="text-base font-bold text-text">Stolik Admin</h1>
            <p className="text-xs text-muted">Restaurant management</p>
          </div>
        </div>
        <button
          onClick={fetchRestaurants}
          className="flex items-center gap-2 px-3 py-2 bg-surface-2 border border-border rounded-lg text-sm text-muted hover:text-text hover:border-muted/50 transition-colors"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Store, label: 'Total restaurants', value: restaurants.length, color: 'text-accent' },
            { icon: CheckCircle, label: 'Active', value: active, color: 'text-green-400' },
            { icon: XCircle, label: 'Inactive / pending', value: inactive, color: 'text-muted' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-surface border border-border rounded-xl px-5 py-4 flex items-center gap-4">
              <Icon size={20} className={color} />
              <div>
                <p className="text-xs text-muted">{label}</p>
                <p className="text-2xl font-bold text-text">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-400 bg-red-400/8 border border-red-400/20 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text">All Restaurants</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted text-sm gap-2">
              <RefreshCw size={14} className="animate-spin" /> Loading…
            </div>
          ) : restaurants.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted text-sm">
              No restaurants found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2/50">
                    {['Restaurant', 'Owner', 'City', 'Plan', 'Status', 'Created', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {restaurants.map(r => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-2/30 transition-colors">

                      {/* Restaurant */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          {r.coverImage ? (
                            <img src={r.coverImage} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-base shrink-0">
                              {r.emoji ?? '🍽️'}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-text">{r.name}</p>
                            <p className="text-xs text-muted">{r.cuisine}</p>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="px-5 py-3">
                        <p className="text-text">{r.owner.firstName} {r.owner.lastName}</p>
                        <p className="text-xs text-muted">{r.owner.email}</p>
                      </td>

                      {/* City */}
                      <td className="px-5 py-3 text-muted">{r.city}</td>

                      {/* Plan */}
                      <td className="px-5 py-3"><PlanBadge plan={r.plan} /></td>

                      {/* Status */}
                      <td className="px-5 py-3"><StatusBadge active={r.isActive} /></td>

                      {/* Created */}
                      <td className="px-5 py-3 text-muted text-xs">
                        {new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {r.isActive ? (
                            <button
                              onClick={() => toggleActive(r.id, false)}
                              disabled={updating === r.id}
                              className="px-2.5 py-1.5 text-xs font-medium text-muted border border-border rounded-lg hover:border-red-400/50 hover:text-red-400 transition-colors disabled:opacity-40"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleActive(r.id, true)}
                              disabled={updating === r.id}
                              className="px-2.5 py-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-40"
                            >
                              {updating === r.id ? '…' : 'Approve'}
                            </button>
                          )}
                          <a
                            href={`/dashboard`}
                            className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface-2 transition-colors"
                            title="View dashboard"
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Seed hint */}
        <div className="bg-surface-2 border border-border rounded-xl px-5 py-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Admin setup</p>
          <p className="text-xs text-muted leading-relaxed">
            To create the admin account on a fresh server, call:{' '}
            <code className="font-mono text-accent bg-surface px-1.5 py-0.5 rounded">
              POST {API}/api/admin/seed
            </code>
            {' '}— works only once (no-op if admin already exists).
          </p>
        </div>
      </div>
    </div>
  )
}
