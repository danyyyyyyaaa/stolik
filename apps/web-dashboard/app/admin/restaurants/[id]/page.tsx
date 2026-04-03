'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2 } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

export default function AdminRestaurantPage() {
  const { id } = useParams() as { id: string }
  const [restaurant, setRestaurant] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const tok = localStorage.getItem('stolik_token')
    if (!tok) return
    fetch(`${API}/api/admin/restaurants/${id}/dashboard`, { headers: { Authorization: `Bearer ${tok}` } })
      .then(r => r.json()).then(setRestaurant).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-64"><span className="text-muted animate-pulse">Loading…</span></div>
  if (!restaurant || restaurant.error) return <div className="p-8 text-muted">Restaurant not found</div>

  const INFO = [
    { label: 'Plan',    value: restaurant.plan },
    { label: 'Status',  value: restaurant.isActive ? 'Active' : 'Inactive' },
    { label: 'Tables',  value: restaurant.tables?.length ?? 0 },
    { label: 'Cuisine', value: restaurant.cuisine },
    { label: 'City',    value: restaurant.city },
    { label: 'Phone',   value: restaurant.phone ?? '—' },
  ]

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-8 py-3 flex items-center gap-3">
        <Building2 size={14} className="text-amber-400" />
        <span className="text-sm text-amber-300 font-medium">Viewing as Admin: {restaurant.name}</span>
        <Link href="/admin" className="ml-auto flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors">
          <ArrowLeft size={12} />Back to Admin
        </Link>
      </div>
      <header className="border-b border-border bg-surface px-8 py-5">
        <h1 className="text-xl font-bold text-text">{restaurant.emoji} {restaurant.name}</h1>
        <p className="text-sm text-muted mt-0.5">{restaurant.address} · Owner: {restaurant.owner?.email}</p>
      </header>
      <div className="flex-1 px-8 py-6 space-y-5">
        <div className="grid grid-cols-3 gap-4">
          {INFO.map(({ label, value }) => (
            <div key={label} className="bg-surface border border-border rounded-xl p-4">
              <p className="text-xs text-muted mb-1">{label}</p>
              <p className="font-semibold text-text">{String(value)}</p>
            </div>
          ))}
        </div>
        {(restaurant.tables?.length ?? 0) > 0 && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="font-semibold text-text mb-3">Tables</h3>
            <div className="flex flex-wrap gap-2">
              {restaurant.tables.map((t: any) => (
                <span key={t.id} className="px-3 py-1.5 bg-surface-2 border border-border rounded-lg text-sm text-text">
                  {t.name} · {t.capacity}p
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
