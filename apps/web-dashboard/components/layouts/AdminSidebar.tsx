'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, BarChart3,
  Handshake, Settings, LogOut, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getInitials } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin',             icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/restaurants', icon: Building2,       label: 'Restaurants' },
  { href: '/admin/users',       icon: Users,           label: 'Users' },
  { href: '/admin/statistics',  icon: BarChart3,       label: 'Statistics' },
  { href: '/admin/partners',    icon: Handshake,       label: 'Partners' },
  { href: '/admin/settings',    icon: Settings,        label: 'Settings' },
]

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export function AdminSidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside className={`flex flex-col h-screen bg-sidebar border-r border-white/5 transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}>
      <div className={`flex items-center h-14 border-b border-white/5 px-4 ${collapsed ? 'justify-center' : 'gap-2'}`}>
        <div className="w-7 h-7 rounded-btn bg-amber flex items-center justify-center flex-shrink-0">
          <Building2 size={14} color="white" />
        </div>
        {!collapsed && (
          <div>
            <span className="text-white font-bold text-sm">Din<span className="italic" style={{ color: '#1b7a4a' }}>to</span></span>
            <span className="text-xs ml-1.5 font-medium" style={{ color: '#f5a623' }}>Admin</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-btn mb-0.5 text-sm font-medium transition-colors ${
                active ? 'bg-sidebar-active text-white' : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} strokeWidth={1.75} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/5 p-2">
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-2 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-amber flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
              {getInitials(user.firstName, user.lastName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white font-medium truncate">{user.firstName}</p>
              <p className="text-xs truncate" style={{ color: '#f5a623' }}>Super Admin</p>
            </div>
          </div>
        )}
        <button onClick={logout} className={`flex items-center gap-2 px-3 py-2 w-full rounded-btn text-sidebar-text hover:text-error hover:bg-sidebar-hover text-sm transition-colors ${collapsed ? 'justify-center' : ''}`}>
          <LogOut size={16} />
          {!collapsed && <span>Log out</span>}
        </button>
        <button onClick={onToggle} className="flex items-center gap-2 px-3 py-2 w-full rounded-btn text-sidebar-text hover:text-white hover:bg-sidebar-hover text-sm transition-colors mt-0.5 justify-center">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  )
}
