'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

const TIME_SLOTS = [
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00',
]

interface Table {
  id: string
  name: string
  capacity: number
}

interface Props {
  restaurantId: string
  token: string
  onClose: () => void
  onCreated: (booking: Record<string, unknown>) => void
}

export function NewBookingModal({ restaurantId, token, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    guestName:  '',
    guestPhone: '',
    guestEmail: '',
    date:       new Date().toISOString().slice(0, 10),
    time:       '19:00',
    guestCount: 2,
    tableId:    '',
    notes:      '',
    sendSms:    true,
  })
  const [tables, setTables] = useState<Table[]>([])
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    fetch(`${API}/api/restaurants/${restaurantId}/tables`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((d: unknown) => {
        if (Array.isArray(d)) setTables(d as Table[])
        else if (d && typeof d === 'object' && Array.isArray((d as Record<string, unknown>).tables)) {
          setTables((d as { tables: Table[] }).tables)
        }
      })
      .catch(() => {})
  }, [restaurantId, token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.guestName.trim())  { setError('Guest name is required'); return }
    if (!form.guestPhone.trim()) { setError('Phone is required'); return }
    setSaving(true)
    setError('')
    try {
      const body: Record<string, unknown> = {
        restaurantId,
        guestName:  form.guestName,
        guestPhone: form.guestPhone,
        guestEmail: form.guestEmail || undefined,
        date:       form.date,
        time:       form.time,
        guestCount: form.guestCount,
        notes:      form.notes || undefined,
        source:     'manual',
      }
      if (form.tableId) body.tableId = form.tableId

      const res  = await fetch(`${API}/api/bookings`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json() as Record<string, unknown>
      if (!res.ok) {
        setError((data.error as string | undefined) || 'Failed to create booking')
        return
      }
      const booking = (data.booking as Record<string, unknown> | undefined) ?? data
      onCreated(booking)
      onClose()
    } catch {
      setError('Cannot connect to server')
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full bg-surface-2 border border-border rounded-lg px-3.5 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent transition-colors'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-text">New Booking</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Guest info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Guest name *</label>
              <input
                type="text"
                required
                value={form.guestName}
                onChange={e => setForm(p => ({ ...p, guestName: e.target.value }))}
                placeholder="Jan Kowalski"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Phone *</label>
              <input
                type="tel"
                required
                value={form.guestPhone}
                onChange={e => setForm(p => ({ ...p, guestPhone: e.target.value }))}
                placeholder="+48 123 456 789"
                className={inputCls}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">Email (optional)</label>
            <input
              type="email"
              value={form.guestEmail}
              onChange={e => setForm(p => ({ ...p, guestEmail: e.target.value }))}
              placeholder="guest@example.com"
              className={inputCls}
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Date *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Time *</label>
              <select
                value={form.time}
                onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                className={inputCls}
              >
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Party size + Table */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Party size *</label>
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, guestCount: Math.max(1, p.guestCount - 1) }))}
                  className="px-3 py-2.5 bg-surface-2 text-text hover:bg-surface-2/80 text-sm font-bold transition-colors"
                >
                  -
                </button>
                <span className="flex-1 text-center text-sm font-semibold text-text">{form.guestCount}</span>
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, guestCount: Math.min(20, p.guestCount + 1) }))}
                  className="px-3 py-2.5 bg-surface-2 text-text hover:bg-surface-2/80 text-sm font-bold transition-colors"
                >
                  +
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Table</label>
              <select
                value={form.tableId}
                onChange={e => setForm(p => ({ ...p, tableId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Auto-assign</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>{t.name} (up to {t.capacity})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">Special requests</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              placeholder="Allergies, special occasions..."
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* SMS toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              role="switch"
              aria-checked={form.sendSms}
              onClick={() => setForm(p => ({ ...p, sendSms: !p.sendSms }))}
              className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                form.sendSms ? 'bg-accent' : 'bg-surface-2 border border-border'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  form.sendSms ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </div>
            <span className="text-sm text-text">Send SMS confirmation to guest</span>
          </label>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-lg text-sm text-text hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {saving ? 'Creating...' : 'Create Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
