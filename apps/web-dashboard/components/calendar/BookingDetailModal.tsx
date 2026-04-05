'use client'
import { X, Users, Phone, Clock, Hash, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'

interface BookingData {
  id: string
  bookingCode: string
  guestName: string
  guestPhone: string
  partySize: number
  time: string
  endTime: string
  tableName: string | null
  status: string
}

interface Props {
  booking: BookingData | null
  onClose: () => void
  onStatusChange: (id: string, status: string) => void
}

const ACTIONS: Record<string, { label: string; next: string; icon: React.ReactNode; cls: string }[]> = {
  pending: [
    { label: 'Confirm booking', next: 'confirmed', icon: <CheckCircle size={15} />, cls: 'bg-accent hover:bg-accent-hover text-white' },
    { label: 'Cancel',          next: 'cancelled', icon: <XCircle size={15} />,     cls: 'border border-border hover:bg-surface-2 text-error' },
  ],
  confirmed: [
    { label: 'Mark complete', next: 'completed', icon: <CheckCircle size={15} />, cls: 'bg-accent hover:bg-accent-hover text-white' },
    { label: 'No-show',       next: 'no_show',   icon: <AlertCircle size={15} />, cls: 'border border-border hover:bg-surface-2 text-amber' },
    { label: 'Cancel',        next: 'cancelled', icon: <XCircle size={15} />,     cls: 'border border-border hover:bg-surface-2 text-error' },
  ],
}

export function BookingDetailModal({ booking, onClose, onStatusChange }: Props) {
  if (!booking) return null

  const actions = ACTIONS[booking.status] ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface border border-border rounded-card shadow-md w-full max-w-md">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text text-lg">{booking.guestName}</h2>
            <p className="text-xs font-mono text-muted mt-0.5">{booking.bookingCode}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={booking.status} />
            <button
              onClick={onClose}
              className="p-1.5 rounded-btn hover:bg-surface-2 text-muted hover:text-text transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-7 h-7 rounded-btn bg-surface-2 flex items-center justify-center flex-shrink-0">
              <Clock size={14} className="text-muted" />
            </div>
            <div>
              <p className="text-xs text-muted">Time</p>
              <p className="font-semibold text-text">{booking.time} – {booking.endTime}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="w-7 h-7 rounded-btn bg-surface-2 flex items-center justify-center flex-shrink-0">
              <Users size={14} className="text-muted" />
            </div>
            <div>
              <p className="text-xs text-muted">Party size</p>
              <p className="font-semibold text-text">{booking.partySize} guests</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="w-7 h-7 rounded-btn bg-surface-2 flex items-center justify-center flex-shrink-0">
              <Phone size={14} className="text-muted" />
            </div>
            <div>
              <p className="text-xs text-muted">Phone</p>
              <p className="font-semibold text-text">{booking.guestPhone}</p>
            </div>
          </div>

          {booking.tableName && (
            <div className="flex items-center gap-3 text-sm">
              <div className="w-7 h-7 rounded-btn bg-surface-2 flex items-center justify-center flex-shrink-0">
                <Hash size={14} className="text-muted" />
              </div>
              <div>
                <p className="text-xs text-muted">Table</p>
                <p className="font-semibold text-text">{booking.tableName}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="px-5 pb-5 flex items-center gap-2 flex-wrap">
            {actions.map(action => (
              <button
                key={action.next}
                onClick={() => { onStatusChange(booking.id, action.next); onClose() }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-btn text-sm font-semibold transition-colors ${action.cls}`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
