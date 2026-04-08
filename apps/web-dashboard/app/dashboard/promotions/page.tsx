'use client'
import { useEffect, useState } from 'react'
import { Tag, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { useMyRestaurant } from '@/hooks/useRestaurant'
import { useT } from '@/lib/i18n'

interface Deal {
  id: string
  title: string
  description?: string
  discountType: string
  discountValue?: number
  code?: string
  validFrom?: string
  validUntil?: string
  isActive: boolean
  maxUses?: number
  usedCount: number
  createdAt: string
}

const EMPTY: Partial<Deal> = {
  title: '', description: '', discountType: 'percent',
  discountValue: undefined, code: '', validFrom: '', validUntil: '',
  isActive: true, maxUses: undefined,
}

function fmtDate(s?: string) {
  if (!s) return '—'
  try { return new Date(s).toLocaleDateString() } catch { return s }
}

function discountLabel(deal: Deal): string {
  if (deal.discountType === 'percent')  return deal.discountValue ? `${deal.discountValue}%` : '—'
  if (deal.discountType === 'fixed')    return deal.discountValue ? `${deal.discountValue} PLN` : '—'
  if (deal.discountType === 'freeitem') return '🎁 Free item'
  return '—'
}

export default function PromotionsPage() {
  const { restaurant } = useMyRestaurant()
  const t = useT()
  const [deals, setDeals]       = useState<Deal[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<Deal | null>(null)
  const [form, setForm]         = useState<Partial<Deal>>(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  async function load() {
    if (!restaurant?.id) return
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const base  = process.env.NEXT_PUBLIC_API_URL || ''
      const res   = await fetch(`${base}/api/restaurants/${restaurant.id}/deals`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      // owner sees all (active+inactive) via dashboard — public endpoint only shows active
      // we fetch with auth so server returns all for owner
      const data = await res.json()
      setDeals(Array.isArray(data) ? data : [])
    } catch { setDeals([]) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [restaurant?.id])

  function openNew() { setEditing(null); setForm(EMPTY); setError(''); setShowForm(true) }
  function openEdit(d: Deal) { setEditing(d); setForm({ ...d }); setError(''); setShowForm(true) }

  async function handleSave() {
    if (!restaurant?.id || !form.title?.trim()) { setError('Title is required'); return }
    setSaving(true); setError('')
    try {
      const token = localStorage.getItem('accessToken')
      const base  = process.env.NEXT_PUBLIC_API_URL || ''
      const url   = editing
        ? `${base}/api/restaurants/${restaurant.id}/deals/${editing.id}`
        : `${base}/api/restaurants/${restaurant.id}/deals`
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title:         form.title,
          description:   form.description || undefined,
          discountType:  form.discountType,
          discountValue: form.discountValue ? Number(form.discountValue) : undefined,
          code:          form.code || undefined,
          validFrom:     form.validFrom || undefined,
          validUntil:    form.validUntil || undefined,
          isActive:      form.isActive ?? true,
          maxUses:       form.maxUses ? Number(form.maxUses) : undefined,
        }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Error') }
      setShowForm(false)
      load()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  async function handleToggle(deal: Deal) {
    const token = localStorage.getItem('accessToken')
    const base  = process.env.NEXT_PUBLIC_API_URL || ''
    await fetch(`${base}/api/restaurants/${restaurant!.id}/deals/${deal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isActive: !deal.isActive }),
    })
    load()
  }

  async function handleDelete(deal: Deal) {
    if (!confirm(`${t.dealDelete}?`)) return
    const token = localStorage.getItem('accessToken')
    const base  = process.env.NEXT_PUBLIC_API_URL || ''
    await fetch(`${base}/api/restaurants/${restaurant!.id}/deals/${deal.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    load()
  }

  return (
    <div>
      <PageHeader
        title={t.dealsNav}
        description={t.dealsPageDesc}
        actions={
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-btn transition-colors"
          >
            <Plus size={14} /> {t.newDeal}
          </button>
        }
      />

      {/* Deal form */}
      {showForm && (
        <div className="mb-6 bg-surface border border-border rounded-card p-5">
          <h3 className="font-semibold text-text mb-4">
            {editing ? t.dealTitle : t.newDeal}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">{t.dealTitle} *</label>
              <input
                value={form.title ?? ''}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">{t.dealType}</label>
              <select
                value={form.discountType ?? 'percent'}
                onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent"
              >
                <option value="percent">{t.dealTypePercent}</option>
                <option value="fixed">{t.dealTypeFixed}</option>
                <option value="freeitem">{t.dealTypeFreeitem}</option>
              </select>
            </div>
            {form.discountType !== 'freeitem' && (
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t.dealValue}</label>
                <input
                  type="number"
                  value={form.discountValue ?? ''}
                  onChange={e => setForm(f => ({ ...f, discountValue: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">{t.dealCode}</label>
              <input
                value={form.code ?? ''}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                placeholder="e.g. SAVE20"
                className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent placeholder:text-muted"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">{t.dealValidFrom}</label>
              <input
                type="date"
                value={form.validFrom ?? ''}
                onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">{t.dealValidUntil}</label>
              <input
                type="date"
                value={form.validUntil ?? ''}
                onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted mb-1">{t.dealDesc}</label>
              <textarea
                value={form.description ?? ''}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive ?? true}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 accent-accent"
              />
              <span className="text-sm text-text">{t.dealActive}</span>
            </label>
          </div>

          {error && <p className="text-xs text-error mt-3">{error}</p>}

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-btn transition-colors disabled:opacity-50"
            >
              {saving ? t.saving : t.dealSave}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-border bg-surface hover:bg-surface-2 text-sm font-semibold text-muted rounded-btn transition-colors"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Deals list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 animate-pulse bg-surface-2 rounded-card" />)}
        </div>
      ) : deals.length === 0 ? (
        <EmptyState icon={Tag} title={t.dealsEmpty} description="" />
      ) : (
        <div className="bg-surface border border-border rounded-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/40">
                {[t.dealTitle, t.dealType, t.dealValue, t.dealCode, t.dealValidUntil, t.dealActive, ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deals.map(deal => (
                <tr key={deal.id} className="border-b border-border last:border-0 hover:bg-surface-2/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-text">{deal.title}</p>
                    {deal.description && <p className="text-xs text-muted truncate max-w-[200px]">{deal.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted capitalize">{deal.discountType}</td>
                  <td className="px-4 py-3 font-semibold text-accent">{discountLabel(deal)}</td>
                  <td className="px-4 py-3">
                    {deal.code ? (
                      <span className="px-2 py-0.5 bg-surface-2 border border-border rounded text-xs font-mono text-text">{deal.code}</span>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{fmtDate(deal.validUntil)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(deal)} title={deal.isActive ? t.dealDeactivate : t.dealActivate}>
                      {deal.isActive
                        ? <ToggleRight size={20} className="text-accent" />
                        : <ToggleLeft  size={20} className="text-muted" />
                      }
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(deal)} className="p-1.5 rounded hover:bg-surface-2 text-muted hover:text-text transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(deal)} className="p-1.5 rounded hover:bg-surface-2 text-muted hover:text-error transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
