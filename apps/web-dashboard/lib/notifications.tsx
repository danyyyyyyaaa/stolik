'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { io as socketIo, type Socket } from 'socket.io-client'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

function playBeep() {
  try {
    const ctx  = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 800
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch {}
}

export interface ToastItem {
  id:      string
  type:    'new' | 'cancelled' | 'updated'
  message: string
}

interface NotificationCtx {
  badge:      number
  toasts:     ToastItem[]
  connected:  boolean
  clearBadge: () => void
  dismissToast: (id: string) => void
}

const NotificationContext = createContext<NotificationCtx>({
  badge:        0,
  toasts:       [],
  connected:    false,
  clearBadge:   () => {},
  dismissToast: () => {},
})

interface Props {
  restaurantId: string | null
  children:     ReactNode
}

export function NotificationProvider({ restaurantId, children }: Props) {
  const [badge,     setBadge]     = useState(0)
  const [toasts,    setToasts]    = useState<ToastItem[]>([])
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const queueRef  = useRef<ToastItem[]>([])
  const showingRef = useRef(false)

  // Show toasts one at a time with 500ms gap
  const enqueueToast = useCallback((item: ToastItem) => {
    queueRef.current.push(item)
    if (!showingRef.current) processQueue()
  }, [])

  function processQueue() {
    if (queueRef.current.length === 0) { showingRef.current = false; return }
    showingRef.current = true
    const next = queueRef.current.shift()!
    setToasts(prev => [...prev, next])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== next.id))
      setTimeout(processQueue, 500)
    }, 5000)
  }

  useEffect(() => {
    if (!restaurantId) return

    const tok = typeof window !== 'undefined' ? localStorage.getItem('stolik_token') : null
    const socket = socketIo(API, {
      transports:       ['websocket', 'polling'],
      auth:             tok ? { token: tok } : undefined,
      reconnectionDelay: 2000,
    })
    socketRef.current = socket

    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.emit('join_restaurant', restaurantId)

    socket.on('booking:new', (data: any) => {
      playBeep()
      const date = data.date ? new Date(data.date).toLocaleDateString() : ''
      enqueueToast({
        id:      `new-${Date.now()}`,
        type:    'new',
        message: `${data.guestName} · ${date} ${data.time} · ${data.guests} prs.`,
      })
      setBadge(b => b + 1)
    })

    socket.on('booking:cancelled', (data: any) => {
      enqueueToast({
        id:      `cancel-${Date.now()}`,
        type:    'cancelled',
        message: data.guestName ?? '',
      })
    })

    socket.on('booking:updated', (data: any) => {
      enqueueToast({
        id:      `upd-${Date.now()}`,
        type:    'updated',
        message: `#${data.bookingId?.slice(-6)} → ${data.status}`,
      })
    })

    return () => { socket.disconnect() }
  }, [restaurantId, enqueueToast])

  const clearBadge   = useCallback(() => setBadge(0), [])
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  return (
    <NotificationContext.Provider value={{ badge, toasts, connected, clearBadge, dismissToast }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
