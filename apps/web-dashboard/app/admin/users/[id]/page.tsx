'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, Calendar, Building2, Check, UserX, Shield } from 'lucide-react'
import { StatsCard } from '@/components/shared/StatsCard'
import { TableRowSkeleton } from '@/components/shared/LoadingSkeleton'
import { api } from '@/lib/api'
import { formatDate, formatRelative, getInitials } from '@/lib/utils'

interface Restaurant { id: string; name: string; plan: string; status: string }
interface Booking {
  id: string; bookingRef: string; date: string; time: string
  guestCount: number; status: string; createdAt: string
  restaurant: { id: string; name: string }
}
interface UserDetail {
  id: string; email: string; firstName: string; lastName: string; phone?: string
  avatarUrl?: string; role: string; isActive: boolean; isVerified: boolean
  language: string; dateOfBirth?: string; referralCode?: string
  createdAt: string; lastActiveAt?: string; lastLoginAt?: string
  restaurants: Restaurant[]
  bookings: Booking[]
  _count: { bookings: number; restaurants: number; reviews: number }
}

const ROLE_BADGE: Record<string, string> = {
  admin:   'bg-amber/20 text-amber',
  owner:   'bg-success/20 text-success',
  guest:   'bg-muted/20 text-muted',
}
const BOOKING_STATUS: Record<string, string> = {
  pending:   'bg-warning/20 text-warning',
  confirmed: 'bg-success/20 text-success',
  cancelled: 'bg-error/20 text-error',
  completed: 'bg-muted/20 text-muted',
  no_show:   'bg-amber/20 text-amber',
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [newRole, setNewRole] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get<UserDetail>(`/api/admin/users/${id}`)
      .then(res => { setUser(res); setNewRole(res.role) })
      .catch(e => setError(e.message ?? 'Failed to load user'))
      .finally(() => setLoading(false))
  }, [id])

  const handleChangeRole = async () => {
    if (!user || newRole === user.role) return
    setUpdating(true)
    try {
      await api.patch(`/api/admin/users/${id}`, { role: newRole })
      setUser(prev => prev ? { ...prev, role: newRole } : prev)
    } catch (e) { console.error(e) }
    finally { setUpdating(false) }
  }

  const handleToggleActive = async () => {
    if (!user) return
    if (!confirm(user.isActive ? 'Deactivate this user?' : 'Activate this user?')) return
    setUpdating(true)
    try {
      await api.patch(`/api/admin/users/${id}`, { isActive: !user.isActive })
      setUser(prev => prev ? { ...prev, isActive: !prev.isActive } : prev)
    } catch (e) { console.error(e) }
    finally { setUpdating(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="text-muted animate-pulse text-sm">Loading user...</span>
    </div>
  )
  if (error || !user) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Users size={32} className="text-muted" />
      <p className="text-muted text-sm">{error ?? 'User not found'}</p>
      <Link href="/admin/users" className="text-accent text-sm hover:underline flex items-center gap-1">
        <ArrowLeft size={14} /> Back to users
      </Link>
    </div>
  )

  return (
    <div>
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors mb-4">
        <ArrowLeft size={14} /> Back to users
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center text-lg text-accent font-bold select-none flex-shrink-0">
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
              : getInitials(user.firstName, user.lastName)}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h1 className="text-xl font-bold text-text">{user.firstName} {user.lastName}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-chip text-xs font-semibold capitalize ${ROLE_BADGE[user.role] ?? 'bg-muted/20 text-muted'}`}>
                {user.role}
              </span>
              {!user.isActive && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-chip text-xs font-semibold bg-error/20 text-error">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleToggleActive}
          disabled={updating}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-btn text-sm font-medium transition-colors disabled:opacity-50 ${
            user.isActive
              ? 'bg-error/10 text-error hover:bg-error/20 border border-error/30'
              : 'bg-success/10 text-success hover:bg-success/20 border border-success/30'
          }`}
        >
          {user.isActive ? <><UserX size={14} /> Deactivate</> : <><Check size={14} /> Activate</>}
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Bookings" value={user._count.bookings} icon={Calendar} />
        <StatsCard title="Restaurants" value={user._count.restaurants} icon={Building2} iconColor="text-accent" />
        <StatsCard title="Reviews" value={user._count.reviews} icon={Shield} iconColor="text-amber" />
        <StatsCard title="Registered" value={formatDate(user.createdAt)} icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: info + actions */}
        <div className="space-y-5">
          {/* Profile info */}
          <div className="bg-surface border border-border rounded-card p-5 shadow-card">
            <h3 className="font-semibold text-text mb-4">Profile</h3>
            <div className="space-y-3">
              {[
                { label: 'Phone',       value: user.phone ?? '—' },
                { label: 'Language',    value: user.language.toUpperCase() },
                { label: 'Verified',    value: user.isVerified ? 'Yes' : 'No' },
                { label: 'Referral code', value: user.referralCode ?? '—' },
                { label: 'Birthday',    value: user.dateOfBirth ? formatDate(user.dateOfBirth) : '—' },
                { label: 'Last login',  value: user.lastLoginAt ? formatRelative(user.lastLoginAt) : '—' },
                { label: 'Last active', value: user.lastActiveAt ? formatRelative(user.lastActiveAt) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                  <p className="text-xs text-muted">{label}</p>
                  <p className="text-xs text-text font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Change role */}
          <div className="bg-surface border border-border rounded-card p-5 shadow-card">
            <h3 className="font-semibold text-text mb-3">Change Role</h3>
            <div className="flex gap-2">
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-btn text-text focus:outline-none focus:border-accent"
              >
                <option value="guest">Guest</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={handleChangeRole}
                disabled={updating || newRole === user.role}
                className="px-3 py-2 bg-accent text-white rounded-btn text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>

          {/* Restaurants owned */}
          {user.restaurants.length > 0 && (
            <div className="bg-surface border border-border rounded-card p-5 shadow-card">
              <h3 className="font-semibold text-text mb-3">Restaurants Owned</h3>
              <div className="space-y-2">
                {user.restaurants.map(r => (
                  <Link key={r.id} href={`/admin/restaurants/${r.id}`}
                    className="flex items-center justify-between p-2.5 bg-surface-2/50 border border-border rounded-btn hover:bg-surface-2 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-text">{r.name}</p>
                      <p className="text-xs text-muted capitalize">{r.status}</p>
                    </div>
                    <span className="text-xs font-semibold text-accent capitalize">{r.plan}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: booking history */}
        <div className="lg:col-span-2">
          <div className="bg-surface border border-border rounded-card shadow-card">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-text">Booking History</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2/50">
                  {['Ref', 'Restaurant', 'Date & Time', 'Guests', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
                  : user.bookings.length === 0
                    ? <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">No bookings yet</td></tr>
                    : user.bookings.map(b => (
                      <tr key={b.id} className="border-b border-border last:border-0 hover:bg-surface-2/30">
                        <td className="px-4 py-3 font-mono text-xs text-muted">{b.bookingRef}</td>
                        <td className="px-4 py-3 text-sm text-text">{b.restaurant.name}</td>
                        <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{formatDate(b.date)} {b.time}</td>
                        <td className="px-4 py-3 text-muted">{b.guestCount}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-chip text-xs font-semibold capitalize ${BOOKING_STATUS[b.status] ?? 'bg-muted/20 text-muted'}`}>
                            {b.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
