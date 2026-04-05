'use client'
import { useState } from 'react'
import { DashboardSidebar } from '@/components/layouts/DashboardSidebar'
import { NotificationProvider } from '@/lib/notifications'
import ToastContainer from '@/components/ToastNotification'
import { useMyRestaurant } from '@/hooks/useRestaurant'

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <DashboardSidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          {children}
        </div>
      </main>
      <ToastContainer />
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { restaurant } = useMyRestaurant()
  return (
    <NotificationProvider restaurantId={restaurant?.id ?? null}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </NotificationProvider>
  )
}
