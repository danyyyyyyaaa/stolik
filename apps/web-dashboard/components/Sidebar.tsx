'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CalendarDays, Users, LayoutGrid, CreditCard,
  LogOut, ChevronDown, Utensils, ChevronRight,
  Settings, Store, Sun, Moon,
} from 'lucide-react'
import clsx from 'clsx'
import { useLang, LANGS, type Lang } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

type Restaurant = { id: string; name: string; emoji?: string }
type User = { firstName?: string; lastName?: string; email?: string }

export default function Sidebar() {
  const pathname              = usePathname()
  const router                = useRouter()
  const { lang, setLang, t }  = useLang()
  const { theme, toggleTheme } = useTheme()

  const [user,          setUser]          = useState<User | null>(null)
  const [restaurants,   setRestaurants]   = useState<Restaurant[]>([])
  const [activeId,      setActiveId]      = useState<string | null>(null)
  const [showRestDrop,  setShowRestDrop]  = useState(false)
  const [showLangDrop,  setShowLangDrop]  = useState(false)

  useEffect(() => {
    const userRaw = localStorage.getItem('stolik_user')
    if (userRaw) { try { setUser(JSON.parse(userRaw)) } catch {} }

    const tok = localStorage.getItem('stolik_token')
    if (!tok) return

    fetch(`${API}/api/restaurants`, { headers: { Authorization: `Bearer ${tok}` } })
      .then(r => r.json())
      .then((data: Restaurant[]) => {
        if (!Array.isArray(data)) return
        setRestaurants(data)
        const stored = localStorage.getItem('stolik_active_restaurant')
        const storedId = stored ? JSON.parse(stored)?.id : null
        const initial = data.find(r => r.id === storedId) ?? data[0]
        if (initial) setActiveId(initial.id)
      })
      .catch(() => {})
  }, [])

  function selectRestaurant(r: Restaurant) {
    setActiveId(r.id)
    localStorage.setItem('stolik_active_restaurant', JSON.stringify(r))
    setShowRestDrop(false)
    router.refresh()
  }

  function logout() {
    localStorage.removeItem('stolik_token')
    localStorage.removeItem('stolik_user')
    router.push('/login')
  }

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'U'
    : 'U'
  const userName = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email || 'Użytkownik'
    : 'Użytkownik'
  const activeRestaurant = restaurants.find(r => r.id === activeId)

  const NAV = [
    { href: '/dashboard',          icon: CalendarDays, label: t.bookings },
    { href: '/dashboard/guests',   icon: Users,        label: t.guests   },
    { href: '/dashboard/tables',   icon: LayoutGrid,   label: t.tables   },
    { href: '/dashboard/billing',  icon: CreditCard,   label: t.billing  },
    { href: '/dashboard/profile',  icon: Store,        label: t.profile  },
    { href: '/dashboard/settings', icon: Settings,     label: t.settings },
  ]

  return (
    <aside className="w-[220px] shrink-0 h-screen bg-surface border-r border-border flex flex-col select-none">

      {/* ── Logo ──────────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
            <Utensils size={15} className="text-accent" />
          </div>
          <span className="font-bold text-text text-base tracking-tight">Stolik</span>
        </div>

        {/* Restaurant picker */}
        {restaurants.length > 0 && (
          <div className="relative mt-3">
            <button
              onClick={() => setShowRestDrop(v => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-surface-2 border border-border rounded-lg text-left hover:border-muted/50 transition-colors"
            >
              <span className="text-base leading-none shrink-0">
                {activeRestaurant?.emoji ?? '🍽️'}
              </span>
              <span className="text-sm font-medium text-text truncate flex-1 min-w-0">
                {activeRestaurant?.name ?? '…'}
              </span>
              <ChevronDown size={12} className={clsx('text-muted shrink-0 transition-transform', showRestDrop && 'rotate-180')} />
            </button>

            {showRestDrop && restaurants.length > 1 && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowRestDrop(false)} />
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface-2 border border-border rounded-xl shadow-2xl py-1 z-20">
                  {restaurants.map(r => (
                    <button
                      key={r.id}
                      onClick={() => selectRestaurant(r)}
                      className={clsx(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left',
                        r.id === activeId
                          ? 'text-accent bg-accent/8'
                          : 'text-text hover:bg-border/40'
                      )}
                    >
                      <span>{r.emoji ?? '🍽️'}</span>
                      <span className="flex-1 truncate">{r.name}</span>
                      {r.id === activeId && <ChevronRight size={12} className="text-accent" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label }) => {
          const exact  = href === '/dashboard'
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-accent/12 text-accent border border-accent/20 shadow-sm'
                  : 'text-muted hover:text-text hover:bg-surface-2'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* ── Bottom ────────────────────────────────────────────────────── */}
      <div className="px-3 pb-4 pt-3 border-t border-border space-y-2">

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? t.lightTheme : t.darkTheme}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:text-text hover:bg-surface-2 transition-colors"
        >
          {theme === 'dark'
            ? <Sun  size={14} className="shrink-0" />
            : <Moon size={14} className="shrink-0" />}
          <span className="flex-1 text-left font-medium">
            {theme === 'dark' ? t.lightTheme : t.darkTheme}
          </span>
        </button>

        {/* Language switcher */}
        <div className="relative">
          <button
            onClick={() => setShowLangDrop(v => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            <span className="text-xs font-semibold tracking-widest opacity-60">🌐</span>
            <span className="flex-1 text-left font-medium">{lang}</span>
            <ChevronDown size={12} className={clsx('transition-transform', showLangDrop && 'rotate-180')} />
          </button>

          {showLangDrop && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowLangDrop(false)} />
              <div className="absolute bottom-full left-0 right-0 mb-1.5 bg-surface-2 border border-border rounded-xl shadow-2xl py-1 z-20">
                {LANGS.map(l => (
                  <button
                    key={l}
                    onClick={() => { setLang(l as Lang); setShowLangDrop(false) }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                      l === lang ? 'text-accent bg-accent/8' : 'text-text hover:bg-border/40'
                    )}
                  >
                    <span className="font-semibold w-8">{l}</span>
                    <span className="text-muted text-xs">
                      {{ PL: 'Polski', EN: 'English', RU: 'Русский', UK: 'Українська' }[l]}
                    </span>
                    {l === lang && <span className="ml-auto text-accent text-xs">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* User info */}
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg group">
          <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-xs font-bold text-accent shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-text truncate">{userName}</p>
            <p className="text-xs text-muted truncate">{user?.email ?? ''}</p>
          </div>
          <button
            onClick={logout}
            title={t.logout}
            className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-400/8 transition-colors opacity-0 group-hover:opacity-100"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
