'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Calendar, BookOpen, Table2, BarChart3,
  UtensilsCrossed, Star, Users, Settings, CreditCard, ChevronLeft,
  ChevronRight, LogOut, Building2, Link2, Tag, Megaphone,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyRestaurant } from '@/hooks/useRestaurant'
import { getInitials } from '@/lib/utils'
import { useNotifications } from '@/lib/notifications'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { useT } from '@/lib/i18n'

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export function DashboardSidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { restaurant } = useMyRestaurant()
  const { badge, clearBadge } = useNotifications()
  const t = useT()

  const NAV_ITEMS = [
    { href: '/dashboard',           icon: LayoutDashboard, label: t.overview },
    { href: '/dashboard/calendar',  icon: Calendar,        label: t.calendar },
    { href: '/dashboard/bookings',  icon: BookOpen,        label: t.bookings },
    { href: '/dashboard/tables',    icon: Table2,          label: t.tables },
    { href: '/dashboard/analytics', icon: BarChart3,       label: t.analyticsLabel },
    { href: '/dashboard/menu',      icon: UtensilsCrossed, label: t.menu },
    { href: '/dashboard/reviews',   icon: Star,            label: t.reviews },
    { href: '/dashboard/staff',     icon: Users,           label: t.staff },
    { href: '/dashboard/promotions', icon: Tag,             label: t.dealsNav },
    { href: '/dashboard/ads',        icon: Megaphone,       label: t.adsNav },
    { href: '/dashboard/integrations', icon: Link2,        label: t.integrationsLabel },
    { href: '/dashboard/settings',  icon: Settings,        label: t.settings },
    { href: '/dashboard/billing',   icon: CreditCard,      label: t.billing },
  ]

  return (
    <aside
      className={`flex flex-col h-screen bg-sidebar border-r border-white/5 transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo / restaurant name */}
      <div className={`flex items-center h-14 border-b border-white/5 px-4 ${collapsed ? 'justify-center' : 'gap-2'}`}>
        {restaurant?.logoUrl ? (
          <img src={restaurant.logoUrl} alt="" className="w-7 h-7 rounded-btn object-cover flex-shrink-0" />
        ) : (
          <div className="w-7 h-7 rounded-btn bg-sidebar-active flex items-center justify-center flex-shrink-0">
            <Building2 size={14} color="white" />
          </div>
        )}
        {!collapsed && (
          <span className="text-white font-bold text-base truncate">
            {restaurant?.name ?? 'Stolik'}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          const isBookings = href === '/dashboard/bookings'
          const showBadge = isBookings && badge > 0
          return (
            <Link
              key={href}
              href={href}
              onClick={() => { if (isBookings) clearBadge() }}
              className={`flex items-center gap-3 px-3 py-2 rounded-btn mb-0.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-sidebar-active text-white'
                  : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? label : undefined}
            >
              <div className="relative flex-shrink-0">
                <Icon size={18} strokeWidth={1.75} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              {!collapsed && <span className="flex-1">{label}</span>}
              {!collapsed && showBadge && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User + collapse toggle */}
      <div className="border-t border-white/5 p-2">
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-2 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-sidebar-active flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
              {getInitials(user.firstName, user.lastName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white font-medium truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-sidebar-text truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className={`flex items-center gap-2 px-3 py-2 w-full rounded-btn text-sidebar-text hover:text-error hover:bg-sidebar-hover text-sm transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={16} />
          {!collapsed && <span>{t.logout}</span>}
        </button>
        <div className={`flex items-center mt-0.5 ${collapsed ? 'flex-col gap-1 px-1' : 'gap-1 px-1'}`}>
          <ThemeToggle compact />
          {!collapsed && <LanguageSwitcher />}
        </div>
        <button
          onClick={onToggle}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-btn text-sidebar-text hover:text-white hover:bg-sidebar-hover text-sm transition-colors mt-0.5 justify-center"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  )
}
