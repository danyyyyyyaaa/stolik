'use client'
import { useEffect, useState, useCallback } from 'react'
import { Search, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableRowSkeleton } from '@/components/shared/LoadingSkeleton'
import { api } from '@/lib/api'
import { formatDate, getInitials } from '@/lib/utils'
import { USER_ROLES } from '@/lib/constants'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.get<unknown>('/api/admin/users', { search: search || undefined, role: roleFilter || undefined })
      .then(res => {
        const list = Array.isArray(res) ? res : ((res as { users?: unknown[] })?.users ?? (res as { data?: unknown[] })?.data ?? [])
        setUsers(list as Record<string, unknown>[])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [search, roleFilter])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <PageHeader title="Users" description={`${users.length} registered users`} />

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border rounded-btn text-text placeholder:text-muted focus:outline-none focus:border-accent" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-surface border border-border rounded-btn text-text focus:outline-none focus:border-accent">
          <option value="">All roles</option>
          <option value="guest">Guest</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="bg-surface border border-border rounded-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2/50">
              {['User', 'Role', 'Language', 'Registered', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />) :
              users.length === 0 ? (
                <tr><td colSpan={5}><EmptyState icon={Users} title="No users found" /></td></tr>
              ) : (
                users.map(u => (
                  <tr key={u.id as string} className="border-b border-border hover:bg-surface-2/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl as string} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-xs text-accent font-bold">
                            {getInitials(u.firstName as string, u.lastName as string)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-text">{u.firstName as string} {u.lastName as string}</p>
                          <p className="text-xs text-muted">{u.email as string}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-accent capitalize">
                        {USER_ROLES[u.role as keyof typeof USER_ROLES] ?? u.role as string}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted uppercase text-xs">{u.language as string}</td>
                    <td className="px-4 py-3 text-xs text-muted">{formatDate(u.createdAt as string)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${u.isVerified ? 'text-success' : 'text-warning'}`}>
                        {u.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
