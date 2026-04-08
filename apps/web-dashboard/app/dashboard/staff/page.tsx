'use client'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useMyRestaurant } from '@/hooks/useRestaurant'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/shared/LoadingSkeleton'
import { getInitials } from '@/lib/utils'
import { Users, UserPlus } from 'lucide-react'
import { useT } from '@/lib/i18n'

interface StaffMember {
  id: string
  userId: string
  role: string
  inviteStatus: string
  createdAt: string
  user?: {
    firstName: string
    lastName: string
    email: string
    avatarUrl?: string
  }
}

interface StaffResponse {
  staff: StaffMember[]
}

export default function StaffPage() {
  const { restaurant, loading: restaurantLoading } = useMyRestaurant()
  const t = useT()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'manager' | 'staff'>('staff')
  const [inviting, setInviting] = useState(false)

  const loadStaff = useCallback(async () => {
    if (!restaurant) return
    setLoading(true)
    try {
      const data = await api.get<StaffResponse>(`/api/staff/restaurant/${restaurant.id}`)
      setStaff(data.staff ?? [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [restaurant])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  const handleInvite = async () => {
    if (!restaurant || !inviteEmail.trim()) return
    setInviting(true)
    try {
      await api.post('/api/staff/invite', {
        email: inviteEmail,
        restaurantId: restaurant.id,
        role: inviteRole,
      })
      setInviteOpen(false)
      setInviteEmail('')
      setInviteRole('staff')
      await loadStaff()
    } catch (err: any) {
      // keep modal open on error so user can retry
    } finally {
      setInviting(false)
    }
  }

  const handleChangeRole = async (staffId: string, role: string) => {
    try {
      await api.put(`/api/staff/${staffId}`, { role })
      setStaff(prev => prev.map(m => (m.id === staffId ? { ...m, role } : m)))
    } catch {
      // silently fail
    }
  }

  const handleRemove = async (staffId: string) => {
    if (!confirm('Remove this team member?')) return
    try {
      await api.delete(`/api/staff/${staffId}`)
      setStaff(prev => prev.filter(m => m.id !== staffId))
    } catch {
      // silently fail
    }
  }

  if (restaurantLoading || loading) {
    return (
      <div>
        <PageHeader title="Team" description="Manage your team members and roles" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-card" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Team" description="Manage your team members and roles" />
        <div className="bg-surface border border-border rounded-card p-6 text-sm text-red-500">
          Failed to load staff: {error}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Team"
        description="Manage your team members and roles"
        actions={
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-btn text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <UserPlus size={16} />
            Invite Member
          </button>
        }
      />

      {staff.length === 0 ? (
        <div className="bg-surface border border-border rounded-card">
          <EmptyState
            icon={Users}
            title="No team members yet"
            description="Invite your first team member to get started."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map(member => (
            <div key={member.id} className="bg-surface border border-border rounded-card p-4">
              {/* Avatar + name */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-accent/20 text-accent flex items-center justify-center text-lg font-semibold flex-shrink-0">
                  {getInitials(member.user?.firstName, member.user?.lastName)}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-text truncate">
                    {member.user?.firstName} {member.user?.lastName}
                  </div>
                  <div className="text-xs text-muted truncate">{member.user?.email}</div>
                </div>
              </div>

              {/* Role + status */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-chip ${
                    member.role === 'owner'
                      ? 'bg-accent/20 text-accent'
                      : member.role === 'manager'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-surface-2 text-muted'
                  }`}
                >
                  {member.role}
                </span>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      member.inviteStatus === 'accepted' ? 'bg-green-500' : 'bg-amber'
                    }`}
                  />
                  <span className="text-xs text-muted">
                    {member.inviteStatus === 'accepted' ? 'Active' : 'Pending invite'}
                  </span>
                </div>
              </div>

              {/* Actions — hide role change for owner */}
              {member.role !== 'owner' ? (
                <div className="flex gap-2">
                  <select
                    value={member.role}
                    onChange={e => handleChangeRole(member.id, e.target.value)}
                    className="flex-1 text-xs border border-border rounded-btn px-2 py-1.5 bg-surface text-text focus:outline-none focus:border-accent"
                  >
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                  </select>
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-btn hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="text-xs text-muted italic">Owner — cannot be changed</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {inviteOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-card p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-text text-lg mb-4">Invite Team Member</h3>
            <div className="mb-3">
              <label className="block text-xs text-muted mb-1">Email address</label>
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                type="email"
                placeholder="colleague@email.com"
                className="w-full border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-accent bg-surface text-text"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs text-muted mb-2">Role</label>
              <div className="flex gap-3">
                {(['manager', 'staff'] as const).map(r => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={inviteRole === r}
                      onChange={() => setInviteRole(r)}
                      className="accent-[#1B7A4A]"
                    />
                    <span className="text-sm text-text capitalize">{r}</span>
                  </label>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted mb-4">An invitation link will be sent to this email.</p>
            <div className="flex gap-2">
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviting}
                className="flex-1 bg-accent text-white rounded-btn py-2 text-sm font-medium disabled:opacity-50 hover:bg-accent/90 transition-colors"
              >
                {inviting ? 'Sending...' : 'Send Invitation'}
              </button>
              <button
                onClick={() => { setInviteOpen(false); setInviteEmail(''); setInviteRole('staff') }}
                className="px-4 border border-border rounded-btn text-sm text-muted hover:bg-surface-2"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
