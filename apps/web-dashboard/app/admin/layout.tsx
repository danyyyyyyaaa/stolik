'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { BarChart3, Building2, Users, ArrowLeft } from 'lucide-react'
import clsx from 'clsx'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const tok = localStorage.getItem('stolik_token')
    const raw = localStorage.getItem('stolik_user')
    if (!tok || !raw) { router.replace('/login'); return }
    try {
      const u = JSON.parse(raw)
      if (u.role !== 'ADMIN' && u.role !== 'admin') { router.replace('/dashboard') }
    } catch { router.replace('/login') }
    setReady(true)
  }, [router])

  if (!ready) return null

  const NAV = [
    { href: '/admin',             label: 'Overview',    icon: BarChart3  },
    { href: '/admin/restaurants', label: 'Restaurants', icon: Building2  },
    { href: '/admin/users',       label: 'Users',       icon: Users      },
  ]

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <aside className="w-56 shrink-0 bg-surface border-r border-border flex flex-col">
        <div className="px-5 py-4 border-b border-border">
          <span className="font-bold text-text text-sm">Stolik</span>
          <span className="block text-xs text-red-400 font-semibold mt-0.5">Admin Panel</span>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
            return (
              <Link key={href} href={href} className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active ? 'bg-accent/15 text-accent' : 'text-muted hover:text-text hover:bg-surface-2'
              )}>
                <Icon size={16} />{label}
              </Link>
            )
          })}
        </nav>
        <div className="px-3 py-3 border-t border-border">
          <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted hover:text-text hover:bg-surface-2 transition-colors">
            <ArrowLeft size={14} />Back to Dashboard
          </Link>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  )
}
