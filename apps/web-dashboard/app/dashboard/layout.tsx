'use client'
import { useState, useEffect } from 'react'
import { DashboardSidebar } from '@/components/layouts/DashboardSidebar'
import { NotificationProvider } from '@/lib/notifications'
import ToastContainer from '@/components/ToastNotification'
import { useMyRestaurant } from '@/hooks/useRestaurant'
import { GlobalSearch } from '@/components/shared/GlobalSearch'

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <DashboardSidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          {children}
        </div>
      </main>
      <ToastContainer />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
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
