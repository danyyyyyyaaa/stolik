'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ToastContainer, { OfflineIndicator } from '@/components/ToastNotification'
import { NotificationProvider } from '@/lib/notifications'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [restaurantId, setRestaurantId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('stolik_active_restaurant')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.id) setRestaurantId(parsed.id)
      }
    } catch {}
  }, [])

  return (
    <NotificationProvider restaurantId={restaurantId}>
      <div className="flex h-screen bg-bg overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto flex flex-col">
          {children}
        </main>
      </div>
      <ToastContainer />
      <OfflineIndicator />
    </NotificationProvider>
  )
}
