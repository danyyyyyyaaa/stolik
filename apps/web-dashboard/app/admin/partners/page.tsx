'use client'
import { useEffect, useState, useCallback } from 'react'
import { Search, Plus, Pencil, Trash2, Handshake } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableRowSkeleton } from '@/components/shared/LoadingSkeleton'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface Partner {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  commission: number
  isActive: boolean
  createdAt: string
}

const DEFAULT_FORM = { name: '', email: '', phone: '', company: '', commission: 10 }
type PartnerForm = typeof DEFAULT_FORM

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null)
  const [form, setForm] = useState<PartnerForm>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get<unknown>('/api/admin/partners')
      .then(res => {
        const r = res as { partners?: Partner[] }
        setPartners(r.partners ?? (Array.isArray(res) ? (res as Partner[]) : []))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditingPartner(null)
    setForm(DEFAULT_FORM)
    setModalOpen(true)
  }

  const openEdit = (partner: Partner) => {
    setEditingPartner(partner)
    setForm({
      name: partner.name,
      email: partner.email,
      phone: partner.phone ?? '',
      company: partner.company ?? '',
      commission: partner.commission,
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingPartner(null)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) return
    setSaving(true)
    try {
      if (editingPartner) {
        const updated = await api.patch<Partner>(`/api/admin/partners/${editingPartner.id}`, form)
        setPartners(prev => prev.map(p => p.id === editingPartner.id ? updated : p))
      } else {
        const created = await api.post<Partner>('/api/admin/partners', form)
        setPartners(prev => [created, ...prev])
      }
      closeModal()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this partner? This action cannot be undone.')) return
    try {
      await api.delete(`/api/admin/partners/${id}`)
      setPartners(prev => prev.filter(p => p.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggleActive = async (partner: Partner) => {
    try {
      const updated = await api.patch<Partner>(`/api/admin/partners/${partner.id}`, { isActive: !partner.isActive })
      setPartners(prev => prev.map(p => p.id === partner.id ? updated : p))
    } catch (e) {
      console.error(e)
    }
  }

  const filtered = search
    ? partners.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase()) ||
        (p.company ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : partners

  return (
    <div>
      <PageHeader
        title="Partners"
        description={`${partners.length} total`}
        actions={
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-btn text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <Plus size={14} /> Add Partner
          </button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search partners..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border rounded-btn text-text placeholder:text-muted focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-card overflow-hidden shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2/50">
              {['Partner', 'Email', 'Phone', 'Commission', 'Status', 'Created', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
              : filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState icon={Handshake} title="No partners yet" description="Add your first partner to start tracking commissions." />
                    </td>
                  </tr>
                )
                : filtered.map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-2/30 transition-colors">
                    {/* Name + company */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-text">{p.name}</p>
                      {p.company && <p className="text-xs text-muted mt-0.5">{p.company}</p>}
                    </td>
                    {/* Email */}
                    <td className="px-4 py-3 text-muted text-sm">{p.email}</td>
                    {/* Phone */}
                    <td className="px-4 py-3 text-muted text-sm">{p.phone ?? '—'}</td>
                    {/* Commission */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-chip text-xs font-semibold bg-success/20 text-success">
                        {p.commission}%
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-success' : 'bg-muted'}`} />
                        <span className={p.isActive ? 'text-success' : 'text-muted'}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </span>
                    </td>
                    {/* Created */}
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                      {formatDate(p.createdAt)}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded hover:bg-surface-2 text-muted hover:text-text transition-colors"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(p)}
                          className={`p-1.5 rounded transition-colors text-xs font-medium ${
                            p.isActive
                              ? 'hover:bg-surface-2 text-muted hover:text-warning'
                              : 'hover:bg-success/10 text-muted hover:text-success'
                          }`}
                          title={p.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {p.isActive ? '⏸' : '▶'}
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded hover:bg-error/10 text-muted hover:text-error transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-card p-6 w-full max-w-md shadow-card border border-border">
            <h3 className="font-semibold text-lg text-text mb-5">
              {editingPartner ? 'Edit Partner' : 'Add Partner'}
            </h3>
            <div className="space-y-3">
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Partner name *"
                required
                className="w-full border border-border rounded-btn px-3 py-2 text-sm bg-surface text-text placeholder:text-muted focus:outline-none focus:border-accent"
              />
              <input
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Email *"
                type="email"
                required
                className="w-full border border-border rounded-btn px-3 py-2 text-sm bg-surface text-text placeholder:text-muted focus:outline-none focus:border-accent"
              />
              <input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="Phone"
                className="w-full border border-border rounded-btn px-3 py-2 text-sm bg-surface text-text placeholder:text-muted focus:outline-none focus:border-accent"
              />
              <input
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                placeholder="Company"
                className="w-full border border-border rounded-btn px-3 py-2 text-sm bg-surface text-text placeholder:text-muted focus:outline-none focus:border-accent"
              />
              {/* Commission slider */}
              <div>
                <label className="text-xs text-muted mb-1 block">Commission: {form.commission}%</label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="0.5"
                  value={form.commission}
                  onChange={e => setForm(f => ({ ...f, commission: parseFloat(e.target.value) }))}
                  className="w-full accent-[#1B7A4A]"
                />
                <div className="flex justify-between text-xs text-muted mt-0.5">
                  <span>0%</span>
                  <span>30%</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.email.trim()}
                className="flex-1 bg-accent text-white rounded-btn py-2 text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingPartner ? 'Save Changes' : 'Add Partner'}
              </button>
              <button
                onClick={closeModal}
                className="px-4 border border-border rounded-btn text-sm text-muted hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
