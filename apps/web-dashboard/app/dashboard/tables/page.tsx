'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, X, Table2, Users } from 'lucide-react'
import clsx from 'clsx'
import { useT } from '@/lib/i18n'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

const ZONES = ['Indoor', 'Outdoor', 'Bar', 'Terrace', 'Private'] as const
type Zone = typeof ZONES[number]

const ZONE_COLORS: Record<Zone, string> = {
  Indoor:  'text-green-400  bg-green-400/10  border-green-400/20',
  Outdoor: 'text-blue-400   bg-blue-400/10   border-blue-400/20',
  Bar:     'text-amber-400  bg-amber-400/10  border-amber-400/20',
  Terrace: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  Private: 'text-muted      bg-surface-2     border-border',
}

type TableRecord = {
  id:          string
  name:        string
  capacity:    number
  minCapacity: number
  isActive:    boolean
  shape:       string
}

type FormData = {
  name:        string
  minCapacity: number
  capacity:    number
  zone:        Zone
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

function TableModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: TableRecord
  onSave:  (data: FormData) => Promise<void>
  onClose: () => void
}) {
  const t = useT()
  const [form, setForm] = useState<FormData>({
    name:        initial?.name ?? '',
    minCapacity: initial?.minCapacity ?? 1,
    capacity:    initial?.capacity ?? 4,
    zone:        (ZONES.includes(initial?.shape as Zone) ? initial!.shape as Zone : 'Indoor'),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Table name is required'); return }
    if (form.minCapacity > form.capacity) { setError('Min guests cannot exceed max guests'); return }
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-text">{initial ? t.editItem : t.addTable}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">{t.tableName}</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Table 1, Window Seat 3"
              className="w-full bg-surface-2 border border-border rounded-lg px-3.5 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Min guests</label>

              <input
                type="number"
                min={1}
                max={20}
                value={form.minCapacity}
                onChange={e => setForm(p => ({ ...p, minCapacity: parseInt(e.target.value) || 1 }))}
                className="w-full bg-surface-2 border border-border rounded-lg px-3.5 py-2.5 text-sm text-text focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Max guests</label>
              <input
                type="number"
                min={1}
                max={20}
                value={form.capacity}
                onChange={e => setForm(p => ({ ...p, capacity: parseInt(e.target.value) || 4 }))}
                className="w-full bg-surface-2 border border-border rounded-lg px-3.5 py-2.5 text-sm text-text focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">Zone</label>
            <div className="grid grid-cols-3 gap-2">
              {ZONES.map(zone => (
                <button
                  key={zone}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, zone }))}
                  className={clsx(
                    'py-2 rounded-lg border text-xs font-semibold transition-colors',
                    form.zone === zone
                      ? ZONE_COLORS[zone]
                      : 'border-border text-muted hover:text-text hover:bg-surface-2'
                  )}
                >
                  {zone}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/8 border border-red-400/20 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-lg text-sm text-text hover:bg-surface-2 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {saving ? t.saving : t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

function TableCard({
  table,
  onEdit,
  onDelete,
}: {
  table:    TableRecord
  onEdit:   () => void
  onDelete: () => void
}) {
  const t = useT()
  const zone      = ZONES.includes(table.shape as Zone) ? table.shape as Zone : 'Indoor'
  const zoneColor = ZONE_COLORS[zone] ?? ZONE_COLORS.Indoor

  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-accent/30 transition-colors">
      {/* Zone badge + active indicator */}
      <div className="flex items-center justify-between">
        <span className={clsx('text-xs px-2.5 py-0.5 rounded-full border font-medium', zoneColor)}>
          {zone}
        </span>
        <div className="flex items-center gap-1.5">
          <div className={clsx('w-2 h-2 rounded-full', table.isActive ? 'bg-green-400' : 'bg-muted')} />
          <span className="text-xs text-muted">{table.isActive ? t.free : 'Inactive'}</span>
        </div>
      </div>

      {/* Name + capacity */}
      <div>
        <h3 className="font-bold text-text text-base">{table.name}</h3>
        <div className="flex items-center gap-1.5 mt-1 text-sm text-muted">
          <Users size={13} />
          <span>{table.minCapacity}–{table.capacity} guests</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-surface-2 border border-border rounded-lg text-xs text-text hover:bg-surface-2/80 transition-colors font-medium"
        >
          <Edit2 size={12} /> {t.editItem}
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 hover:bg-red-500/15 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TablesPage() {
  const router = useRouter()
  const t = useT()

  const [token,      setToken]      = useState<string | null>(null)
  const [activeId,   setActiveId]   = useState<string | null>(null)
  const [tables,     setTables]     = useState<TableRecord[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [editTarget, setEditTarget] = useState<TableRecord | undefined>(undefined)

  // Read auth from localStorage on mount
  useEffect(() => {
    const tok = localStorage.getItem('stolik_token')
    if (!tok) { router.push('/login'); return }
    setToken(tok)

    const stored = localStorage.getItem('stolik_active_restaurant')
    if (stored) {
      try { setActiveId(JSON.parse(stored)?.id ?? null) } catch {}
    }
  }, [router])

  const fetchTables = useCallback(async (restaurantId: string, tok: string) => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/restaurants/${restaurantId}/tables`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (res.status === 401) { router.push('/login'); return }
      const data = await res.json()
      setTables(Array.isArray(data) ? data : (data.tables ?? []))
    } catch {
      // network error — leave tables empty
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (activeId && token) fetchTables(activeId, token)
  }, [activeId, token, fetchTables])

  async function handleSave(form: FormData) {
    if (!activeId || !token) return
    const body = {
      name:        form.name,
      minCapacity: form.minCapacity,
      capacity:    form.capacity,
      shape:       form.zone,
    }

    if (editTarget) {
      const res = await fetch(`${API}/api/restaurants/${activeId}/tables/${editTarget.id}`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Failed to update table')
      }
      const updated: TableRecord = await res.json()
      setTables(prev => prev.map(t => t.id === updated.id ? updated : t))
    } else {
      const res = await fetch(`${API}/api/restaurants/${activeId}/tables`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Failed to create table')
      }
      const payload = await res.json()
      const created: TableRecord = (payload as { table?: TableRecord }).table ?? payload
      setTables(prev => [...prev, created])
    }
  }

  async function handleDelete(tableId: string) {
    if (!activeId || !token) return
    if (!confirm('Delete this table?')) return
    await fetch(`${API}/api/restaurants/${activeId}/tables/${tableId}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setTables(prev => prev.filter(t => t.id !== tableId))
  }

  function openAdd() {
    setEditTarget(undefined)
    setShowModal(true)
  }

  function openEdit(table: TableRecord) {
    setEditTarget(table)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditTarget(undefined)
  }

  if (!token) return null

  const totalCapacity = tables.reduce((s, t) => s + t.capacity, 0)

  return (
    <div className="flex flex-col min-h-full">

      {/* Header */}
      <header className="shrink-0 border-b border-border bg-surface px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-text">{t.tables}</h1>
          <p className="text-sm text-muted mt-0.5">
            {loading
              ? t.loading
              : t.tableCount(tables.length)}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={15} /> {t.addTable}
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 px-8 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl p-5 h-36 animate-pulse">
                <div className="w-16 h-5 bg-surface-2 rounded-full mb-3" />
                <div className="w-24 h-5 bg-surface-2 rounded mb-2" />
                <div className="w-20 h-4 bg-surface-2 rounded" />
              </div>
            ))}
          </div>
        ) : tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted gap-4">
            <Table2 size={40} className="text-muted/40" />
            <div className="text-center">
              <p className="font-semibold text-text mb-1">{t.noTables}</p>
              <p className="text-sm">{t.noTablesHint}</p>
            </div>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Plus size={15} /> {t.addTable}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map(table => (
              <TableCard
                key={table.id}
                table={table}
                onEdit={() => openEdit(table)}
                onDelete={() => handleDelete(table.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <TableModal
          initial={editTarget}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
