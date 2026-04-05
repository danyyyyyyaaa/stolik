'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, Users, ExternalLink, UserX, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableRowSkeleton } from '@/components/shared/LoadingSkeleton'
import { api } from '@/lib/api'
import { formatDate, formatRelative, getInitials } from '@/lib/utils'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
  createdAt: string
  lastLoginAt?: string
  lastActiveAt?: string
}

const ROLE_BADGE: Record<string, string> = {
  super_admin:      'bg-red-500/20 text-red-400',
  admin:            'bg-amber/20 text-amber',
  restaurant_owner: 'bg-success/20 text-success',
  manager:          'bg-blue-500/20 text-blue-400',
  staff:            'bg-indigo-500/20 text-indigo-400',
  guest:            'bg-muted/20 text-muted',
}

const ROLE_LABELS: Record<string, string> = {
  super_admin:      'Super Admin',
  admin:            'Admin',
  restaurant_owner: 'Restaurant Owner',
  manager:          'Manager',
  staff:            'Staff',
  guest:            'Guest',
}

const ALL_ROLES = ['super_admin', 'admin', 'restaurant_owner', 'manager', 'staff', 'guest']

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const LIMIT = 20

  const load = useCallback(() => {
    setLoading(true)
    api.get<unknown>('/api/admin/users', {
      page,
      limit: LIMIT,
      search: search || undefined,
      role: roleFilter || undefined,
    })
      .then(res => {
        const r = res as { users?: User[]; total?: number; page?: number; pages?: number }
        let list = r.users ?? (Array.isArray(res) ? (res as User[]) : [])

        // Client-side status filter (API may not support it)
        if (statusFilter === 'active') list = list.filter(u => u.isActive)
        else if (statusFilter === 'inactive') list = list.filter(u => !u.isActive)

        setUsers(list)
        setTotal(r.total ?? list.length)
        setPage(r.page ?? 1)
        setPages(r.pages ?? 1)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, search, roleFilter, statusFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, roleFilter, statusFilter])

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Deactivate this user?')) return
    try {
      await api.patch(`/api/admin/users/${userId}`, { isActive: false })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: false } : u))
    } catch {
      // silently fail if endpoint doesn't exist
    }
  }

  const lastActive = (u: User) => {
    const ts = u.lastLoginAt ?? u.lastActiveAt
    if (!ts) return '—'
    return formatRelative(ts)
  }

  return (
    <div>
      <PageHeader title="Users" description={`${total} registered users`} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border rounded-btn text-text placeholder:text-muted focus:outline-none focus:border-accent"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-surface border border-border rounded-btn text-text focus:outline-none focus:border-accent"
        >
          <option value="">All roles</option>
          {ALL_ROLES.map(r => (
            <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-surface border border-border rounded-btn text-text focus:outline-none focus:border-accent"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-card overflow-hidden shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2/50">
              {['User', 'Role', 'Status', 'Registered', 'Last Active', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
              : users.length === 0
                ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState icon={Users} title="No users found" description="Try adjusting your filters or search query." />
                    </td>
                  </tr>
                )
                : users.map(u => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-2/30 transition-colors">
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs text-accent font-bold flex-shrink-0 select-none">
                          {getInitials(u.firstName, u.lastName)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-text truncate">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-muted truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-chip text-xs font-semibold ${ROLE_BADGE[u.role] ?? 'bg-muted/20 text-muted'}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-success' : 'bg-muted'}`} />
                        <span className={u.isActive ? 'text-success' : 'text-muted'}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </span>
                    </td>
                    {/* Registered */}
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                      {formatDate(u.createdAt)}
                    </td>
                    {/* Last active */}
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                      {lastActive(u)}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="p-1.5 rounded hover:bg-surface-2 text-muted hover:text-text transition-colors"
                          title="View user"
                        >
                          <ExternalLink size={14} />
                        </Link>
                        {u.isActive && (
                          <button
                            onClick={() => handleDeactivate(u.id)}
                            className="p-1.5 rounded hover:bg-error/10 text-muted hover:text-error transition-colors"
                            title="Deactivate"
                          >
                            <UserX size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted">
            Page {page} of {pages} · {total} users
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded hover:bg-surface-2 text-muted disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(pages, 7) }).map((_, i) => {
              const p = i + 1
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                    p === page ? 'bg-accent text-white' : 'hover:bg-surface-2 text-muted'
                  }`}
                >
                  {p}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="p-1.5 rounded hover:bg-surface-2 text-muted disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
