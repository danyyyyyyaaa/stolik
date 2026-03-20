'use client'

import { useState } from 'react'
import { X, CalendarDays, Clock, Users, User, Phone, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'

const API = 'http://localhost:3001'

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

export default function CreateBookingModal({ restaurantId, onSuccess, onClose }: Props) {
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
      const res = await fetch(`${API}/api/bookings`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`,
        },
        body: JSON.stringify({
          restaurantId,
          date,
          time,
          guestCount,
          guestName:  guestName.trim(),
          guestPhone: guestPhone.trim(),
          notes:      notes.trim() || undefined,
          source:     'manual',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Błąd tworzenia rezerwacji')
        return
      }

      onSuccess()
      onClose()
    } catch {
      setError('Nie można połączyć się z serwerem')
    } finally {
      setLoading(false)
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-[#1C2B1E] border border-[#2A3D2C] rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A3D2C]">
          <h2 className="font-semibold text-[#E8F0E9]">Nowa rezerwacja</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B8F6E] hover:text-[#E8F0E9] hover:bg-[#2A3D2C] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-[#6B8F6E] uppercase tracking-wider">
                <CalendarDays size={11} /> Data
              </label>
              <input
                type="date"
                required
                value={date}
                min={today}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-[#131A14] border border-[#2A3D2C] rounded-lg px-3 py-2 text-sm text-[#E8F0E9] focus:outline-none focus:border-[#2D6A35] transition-colors [color-scheme:dark]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-[#6B8F6E] uppercase tracking-wider">
                <Clock size={11} /> Godzina
              </label>
              <select
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full bg-[#131A14] border border-[#2A3D2C] rounded-lg px-3 py-2 text-sm text-[#E8F0E9] focus:outline-none focus:border-[#2D6A35] transition-colors"
              >
                {TIME_SLOTS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Guest count */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-[#6B8F6E] uppercase tracking-wider">
              <Users size={11} /> Liczba gości
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setGuestCount(c => Math.max(1, c - 1))}
                className="w-8 h-8 rounded-lg bg-[#131A14] border border-[#2A3D2C] text-[#E8F0E9] hover:border-[#2D6A35] transition-colors flex items-center justify-center text-lg leading-none"
              >
                −
              </button>
              <span className="w-8 text-center font-semibold text-[#E8F0E9]">{guestCount}</span>
              <button
                type="button"
                onClick={() => setGuestCount(c => Math.min(12, c + 1))}
                className="w-8 h-8 rounded-lg bg-[#131A14] border border-[#2A3D2C] text-[#E8F0E9] hover:border-[#2D6A35] transition-colors flex items-center justify-center text-lg leading-none"
              >
                +
              </button>
              <div className="flex gap-1 ml-1">
                {Array.from({ length: 12 }, (_, i) => (
                  <button
                    key={i + 1}
                    type="button"
                    onClick={() => setGuestCount(i + 1)}
                    className={`w-6 h-6 rounded text-xs font-medium transition-colors ${
                      guestCount === i + 1
                        ? 'bg-[#2D6A35] text-white'
                        : 'bg-[#131A14] border border-[#2A3D2C] text-[#6B8F6E] hover:border-[#2D6A35]'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Guest name */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-[#6B8F6E] uppercase tracking-wider">
              <User size={11} /> Imię i nazwisko
            </label>
            <input
              type="text"
              required
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              placeholder="Anna Kowalska"
              className="w-full bg-[#131A14] border border-[#2A3D2C] rounded-lg px-3 py-2 text-sm text-[#E8F0E9] placeholder-[#6B8F6E] focus:outline-none focus:border-[#2D6A35] transition-colors"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-[#6B8F6E] uppercase tracking-wider">
              <Phone size={11} /> Telefon
            </label>
            <input
              type="tel"
              required
              value={guestPhone}
              onChange={e => setGuestPhone(e.target.value)}
              placeholder="+48 600 123 456"
              className="w-full bg-[#131A14] border border-[#2A3D2C] rounded-lg px-3 py-2 text-sm text-[#E8F0E9] placeholder-[#6B8F6E] focus:outline-none focus:border-[#2D6A35] transition-colors"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-[#6B8F6E] uppercase tracking-wider">
              <MessageSquare size={11} /> Notatka <span className="normal-case text-[#6B8F6E] font-normal">(opcjonalnie)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Urodziny, alergie, preferencje stolika…"
              rows={2}
              className="w-full bg-[#131A14] border border-[#2A3D2C] rounded-lg px-3 py-2 text-sm text-[#E8F0E9] placeholder-[#6B8F6E] focus:outline-none focus:border-[#2D6A35] transition-colors resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-[#2A3D2C] text-sm text-[#6B8F6E] hover:text-[#E8F0E9] hover:border-[#6B8F6E] transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#2D6A35] hover:bg-[#378040] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              {loading ? 'Tworzenie…' : 'Utwórz rezerwację'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
