'use client'
import { useState } from 'react'
import { X, Plus, Minus, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

interface Props {
  restaurantId: string
  onClose: () => void
  onCreated: () => void
}

interface FormData {
  guestName: string
  guestPhone: string
  guestEmail: string
  date: string
  time: string
  partySize: number
  notes: string
}

const DEFAULT_FORM: FormData = {
  guestName: '',
  guestPhone: '',
  guestEmail: '',
  date: new Date().toISOString().split('T')[0],
  time: '19:00',
  partySize: 2,
  notes: '',
}

export function NewBookingModal({ restaurantId, onClose, onCreated }: Props) {
  const [form, setForm] = useState<FormData>(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.guestName.trim() || !form.guestPhone.trim() || !form.date || !form.time) {
      setError('Please fill in all required fields.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.post('/api/bookings', {
        restaurantId,
        guestName:  form.guestName.trim(),
        guestPhone: form.guestPhone.trim(),
        guestEmail: form.guestEmail.trim() || undefined,
        date:       form.date,
        time:       form.time,
        guestCount: form.partySize,
        notes:      form.notes.trim() || undefined,
        source:     'dashboard',
      })
      onCreated()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create booking')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface border border-border rounded-card shadow-md w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text text-lg">New Booking</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-btn hover:bg-surface-2 text-muted hover:text-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            {error && (
              <div className="px-3 py-2 rounded-btn bg-error/10 border border-error/30 text-sm text-error">
                {error}
              </div>
            )}

            {/* Guest name */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                Guest name <span className="text-error">*</span>
              </label>
              <input
                value={form.guestName}
                onChange={e => set('guestName', e.target.value)}
                placeholder="John Smith"
                required
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-btn text-text placeholder:text-muted focus:outline-none focus:border-accent"
              />
            </div>

            {/* Phone + Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Phone <span className="text-error">*</span>
                </label>
                <input
                  value={form.guestPhone}
                  onChange={e => set('guestPhone', e.target.value)}
                  placeholder="+48 600 000 000"
                  required
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-btn text-text placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.guestEmail}
                  onChange={e => set('guestEmail', e.target.value)}
                  placeholder="guest@email.com"
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-btn text-text placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Date <span className="text-error">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => set('date', e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-btn text-text focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Time <span className="text-error">*</span>
                </label>
                <input
                  type="time"
                  value={form.time}
                  onChange={e => set('time', e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-btn text-text focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Party size stepper */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Party size</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => set('partySize', Math.max(1, form.partySize - 1))}
                  className="w-8 h-8 rounded-btn border border-border flex items-center justify-center hover:bg-surface-2 text-text transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-bold text-text">{form.partySize}</span>
                <button
                  type="button"
                  onClick={() => set('partySize', Math.min(20, form.partySize + 1))}
                  className="w-8 h-8 rounded-btn border border-border flex items-center justify-center hover:bg-surface-2 text-text transition-colors"
                >
                  <Plus size={14} />
                </button>
                <span className="text-xs text-muted ml-1">guests</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Allergies, special occasions..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-btn text-text placeholder:text-muted focus:outline-none focus:border-accent resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 pb-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold border border-border rounded-btn hover:bg-surface-2 text-muted hover:text-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-accent hover:bg-accent-hover text-white rounded-btn transition-colors disabled:opacity-60"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Create booking
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
