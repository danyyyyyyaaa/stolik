'use client'

import { useState } from 'react'
import { X, CalendarDays, Clock, Users, User, Phone, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { useT } from '@/lib/i18n'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

const TIME_SLOTS = [
  '11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30',
  '19:00','19:30','20:00','20:30','21:00','21:30','22:00',
]

type Props = {
  restaurantId: string
  onSuccess:    () => void
  onClose:      () => void
}

const labelCls = 'flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wider'
const inputCls = 'w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent transition-colors'

export default function CreateBookingModal({ restaurantId, onSuccess, onClose }: Props) {
  const t     = useT()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [date,       setDate]       = useState(today)
  const [time,       setTime]       = useState('19:00')
  const [guestCount, setGuestCount] = useState(2)
  const [guestName,  setGuestName]  = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [notes,      setNotes]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const token = localStorage.getItem('stolik_token')
      const res   = await fetch(`${API}/api/bookings`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          restaurantId, date, time, guestCount,
          guestName:  guestName.trim(),
          guestPhone: guestPhone.trim(),
          notes:      notes.trim() || undefined,
          source:     'manual',
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Błąd tworzenia rezerwacji'); return }
      onSuccess()
      onClose()
    } catch {
      setError(t.serverError)
    } finally { setLoading(false) }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-text">{t.newBooking}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelCls}><CalendarDays size={11} /> Data</label>
              <input
                type="date" required value={date} min={today}
                onChange={e => setDate(e.target.value)}
                className={`${inputCls} [color-scheme:dark]`}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}><Clock size={11} /> Godzina</label>
              <select value={time} onChange={e => setTime(e.target.value)} className={inputCls}>
                {TIME_SLOTS.map(ts => <option key={ts} value={ts}>{ts}</option>)}
              </select>
            </div>
          </div>

          {/* Guest count */}
          <div className="space-y-1.5">
            <label className={labelCls}><Users size={11} /> Liczba gości</label>
            <div className="flex items-center gap-2.5">
              <button type="button" onClick={() => setGuestCount(c => Math.max(1, c - 1))}
                className="w-8 h-8 rounded-lg bg-surface-2 border border-border text-text hover:border-accent/50 transition-colors flex items-center justify-center text-lg leading-none">
                −
              </button>
              <span className="w-8 text-center font-bold text-text">{guestCount}</span>
              <button type="button" onClick={() => setGuestCount(c => Math.min(12, c + 1))}
                className="w-8 h-8 rounded-lg bg-surface-2 border border-border text-text hover:border-accent/50 transition-colors flex items-center justify-center text-lg leading-none">
                +
              </button>
              <div className="flex gap-1 ml-1 flex-wrap">
                {Array.from({ length: 8 }, (_, i) => i + 1).map(n => (
                  <button key={n} type="button" onClick={() => setGuestCount(n)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                      guestCount === n
                        ? 'bg-accent text-white'
                        : 'bg-surface-2 border border-border text-muted hover:border-accent/50'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Guest name */}
          <div className="space-y-1.5">
            <label className={labelCls}><User size={11} /> Imię i nazwisko</label>
            <input type="text" required value={guestName} onChange={e => setGuestName(e.target.value)}
              placeholder="Anna Kowalska" className={inputCls} />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className={labelCls}><Phone size={11} /> Telefon</label>
            <input type="tel" required value={guestPhone} onChange={e => setGuestPhone(e.target.value)}
              placeholder="+48 600 123 456" className={inputCls} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className={labelCls}>
              <MessageSquare size={11} /> Notatka
              <span className="normal-case text-muted font-normal ml-1">(opcjonalnie)</span>
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Urodziny, alergie, preferencje stolika…" rows={2}
              className={`${inputCls} resize-none`} />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 bg-red-400/8 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm text-muted hover:text-text hover:border-muted/50 transition-colors">
              {t.cancel}
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors">
              {loading ? t.creating : t.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
