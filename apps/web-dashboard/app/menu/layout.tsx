'use client'
import { useState } from 'react'
import { DashboardSidebar } from '@/components/layouts/DashboardSidebar'

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <DashboardSidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col">
        {children}
      </main>
    </div>
  )
}
