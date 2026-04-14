'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, CalendarCheck, XCircle, RefreshCw, WifiOff } from 'lucide-react'
import { useNotifications, type ToastItem } from '@/lib/notifications'
import { useLang } from '@/lib/i18n'

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const router  = useRouter()
  const { t }   = useLang()
  const barRef  = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  // Slide-in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Animate progress bar
  useEffect(() => {
    const el = barRef.current
    if (!el) return
    el.style.transition = 'none'
    el.style.width = '100%'
    requestAnimationFrame(() => {
      el.style.transition = 'width 5s linear'
      el.style.width = '0%'
    })
  }, [])

  const icon = item.type === 'new'
    ? <CalendarCheck size={16} className="shrink-0 text-success" />
    : item.type === 'cancelled'
    ? <XCircle       size={16} className="shrink-0 text-error" />
    : <RefreshCw     size={16} className="shrink-0 text-accent" />

  const label = item.type === 'new'       ? t.notifNewBooking
              : item.type === 'cancelled' ? t.notifCancelled
              : t.notifUpdated

  const borderColor = item.type === 'new'       ? 'border-l-success'
                    : item.type === 'cancelled' ? 'border-l-error'
                    : 'border-l-accent'

  return (
    <div
      className={`
        relative overflow-hidden w-80 rounded-xl border border-border border-l-4 ${borderColor}
        bg-surface shadow-lg
        transition-all duration-300 ease-out
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}
      `}
    >
      <button
        onClick={() => {
          onDismiss()
          if (item.type === 'new') router.push('/dashboard/bookings')
        }}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-2/60 transition-colors"
      >
        <div className="mt-0.5 flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-text">{label}</p>
          <p className="text-xs text-muted truncate mt-0.5">{item.message}</p>
        </div>
      </button>

      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 rounded-md text-muted hover:text-text hover:bg-surface-2 transition-colors"
        aria-label="Dismiss"
      >
        <X size={12} />
      </button>

      {/* Progress bar */}
      <div ref={barRef} className="absolute bottom-0 left-0 h-0.5 bg-accent/60 w-full" />
    </div>
  )
}

export function OfflineIndicator() {
  const { connected } = useNotifications()
  const { t } = useLang()
  if (connected) return null
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-full shadow-lg text-xs text-muted z-50">
      <WifiOff size={12} />
      {t.notifOffline}
    </div>
  )
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useNotifications()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 pointer-events-none">
      {toasts.map(item => (
        <div key={item.id} className="pointer-events-auto">
          <Toast item={item} onDismiss={() => dismissToast(item.id)} />
        </div>
      ))}
    </div>
  )
}
