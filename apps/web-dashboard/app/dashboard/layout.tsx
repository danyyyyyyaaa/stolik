'use client'
import { useState, useEffect } from 'react'
import { DashboardSidebar } from '@/components/layouts/DashboardSidebar'
import { NotificationProvider } from '@/lib/notifications'
import ToastContainer from '@/components/ToastNotification'
import { RestaurantProvider, useRestaurant } from '@/context/RestaurantContext'
import { GlobalSearch } from '@/components/shared/GlobalSearch'

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { restaurant } = useRestaurant()

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

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [])

  return (
    <NotificationProvider restaurantId={restaurant?.id ?? null}>
      <div className="flex h-screen overflow-hidden bg-bg">
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar — hidden on mobile unless mobileOpen */}
        <div className={`
          fixed inset-y-0 left-0 z-30 lg:relative lg:z-auto
          transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <DashboardSidebar
            collapsed={collapsed}
            onToggle={() => setCollapsed(c => !c)}
            onMobileClose={() => setMobileOpen(false)}
          />
        </div>

        <main className="flex-1 overflow-y-auto min-w-0">
          {/* Mobile top bar */}
          <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-surface sticky top-0 z-10">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-btn hover:bg-surface-2 text-muted hover:text-text transition-colors"
              aria-label="Open menu"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="font-semibold text-text text-sm truncate">{restaurant?.name ?? 'Dashboard'}</span>
          </div>

          <div className="max-w-7xl mx-auto p-4 lg:p-6">
            {children}
          </div>
        </main>

        <ToastContainer />
        <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </NotificationProvider>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RestaurantProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </RestaurantProvider>
  )
}
