'use client'
import { useEffect, useState, useCallback } from 'react'
import clsx from 'clsx'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'
type User = { id: string; email: string; firstName: string; lastName: string; role: string; isVerified: boolean; createdAt: string }
const ROLES = ['GUEST', 'OWNER', 'ADMIN']

export default function AdminUsersPage() {
  const [tok, setTok] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [roleFilter, setRoleFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [changingId, setChangingId] = useState<string | null>(null)

  const load = useCallback(async (t: string, role: string) => {
    setLoading(true)
    const url = `${API}/api/admin/users${role ? `?role=${role}` : ''}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` } })
    const data = await res.json()
    setUsers(data.users ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = localStorage.getItem('stolik_token')
    setTok(t)
    if (t) load(t, roleFilter)
  }, [roleFilter, load])

  async function changeRole(id: string, role: string) {
    if (!tok) return
    setChangingId(id)
    await fetch(`${API}/api/admin/users/${id}/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    setUsers(p => p.map(u => u.id === id ? { ...u, role } : u))
    setChangingId(null)
  }

  return (
    <div className="flex flex-col min-h-full">
      <header className="border-b border-border bg-surface px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Users</h1>
          <p className="text-sm text-muted mt-0.5">{total} total</p>
        </div>
        <div className="flex gap-1">
          {['', ...ROLES].map(r => (
            <button key={r || 'all'} onClick={() => setRoleFilter(r)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                roleFilter === r ? 'bg-accent/15 text-accent border-accent/30' : 'text-muted border-border hover:text-text hover:bg-surface-2')}>
              {r || 'All'}
            </button>
          ))}
        </div>
      </header>
      <div className="flex-1 px-8 py-6">
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-2/40">
                {['Name', 'Email', 'Role', 'Verified', 'Joined', 'Actions'].map((h, i) => (
                  <th key={h} className={clsx('px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider', i === 5 ? 'text-right' : 'text-left')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-6 py-4"><div className="h-4 bg-surface-2 rounded" /></td>)}</tr>
              )) : users.map(u => (
                <tr key={u.id} className="hover:bg-surface-2/40 transition-colors">
                  <td className="px-6 py-4 font-medium text-text text-sm">{u.firstName} {u.lastName}</td>
                  <td className="px-6 py-4 text-sm text-muted">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={clsx('text-xs font-semibold px-2 py-1 rounded-full border',
                      u.role === 'ADMIN' || u.role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : u.role === 'OWNER' || u.role === 'owner' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      : 'bg-surface-2 text-muted border-border')}>{u.role}</span>
                  </td>
                  <td className="px-6 py-4 text-xs">{u.isVerified ? <span className="text-green-400">✓ Verified</span> : <span className="text-muted">Unverified</span>}</td>
                  <td className="px-6 py-4 text-sm text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {ROLES.filter(r => r.toLowerCase() !== u.role.toLowerCase()).map(r => (
                        <button key={r} onClick={() => changeRole(u.id, r)} disabled={changingId === u.id}
                          className="px-2 py-1 rounded text-[10px] font-semibold border border-border text-muted hover:text-text hover:bg-surface-2 transition-colors disabled:opacity-50">
                          → {r}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
