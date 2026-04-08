'use client'
import { useEffect, useState } from 'react'
import { Megaphone, TrendingUp, MousePointer, Eye, ToggleLeft, ToggleRight } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { useMyRestaurant } from '@/hooks/useRestaurant'
import { useT } from '@/lib/i18n'

interface Promotion {
  id: string
  restaurantId: string
  isActive: boolean
  startsAt?: string
  endsAt?: string
  budget?: number
  impressions: number
  clicks: number
  createdAt: string
}

export default function AdsPage() {
  const { restaurant } = useMyRestaurant()
  const t = useT()
  const [promo, setPromo]         = useState<Promotion | null>(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState('')
  const [isActive, setIsActive]   = useState(false)
  const [startsAt, setStartsAt]   = useState('')
  const [endsAt, setEndsAt]       = useState('')
  const [budget, setBudget]       = useState('')

  async function load() {
    if (!restaurant?.id) return
    setLoading(true)
    try {
      const token = localStorage.getItem('stolik_token') || localStorage.getItem('token')
      const base  = process.env.NEXT_PUBLIC_API_URL || ''
      const res   = await fetch(`${base}/api/restaurants/${restaurant.id}/promotions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data: Promotion | null = await res.json()
        setPromo(data)
        if (data) {
          setIsActive(data.isActive)
          setStartsAt(data.startsAt ? data.startsAt.split('T')[0] : '')
          setEndsAt(data.endsAt   ? data.endsAt.split('T')[0]   : '')
          setBudget(data.budget ? String(data.budget) : '')
        }
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [restaurant?.id])

  async function handleSave() {
    if (!restaurant?.id) return
    setSaving(true); setError(''); setSaved(false)
    try {
      const token = localStorage.getItem('stolik_token') || localStorage.getItem('token')
      const base  = process.env.NEXT_PUBLIC_API_URL || ''
      const res   = await fetch(`${base}/api/restaurants/${restaurant.id}/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          isActive,
          startsAt: startsAt || undefined,
          endsAt:   endsAt   || undefined,
          budget:   budget   ? Number(budget) : undefined,
        }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Error') }
      setSaved(true)
      load()
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  const ctr = promo && promo.impressions > 0
    ? ((promo.clicks / promo.impressions) * 100).toFixed(1)
    : '0.0'

  return (
    <div>
      <PageHeader title={t.adsNav} description={t.adsPageDesc} />

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-20 animate-pulse bg-surface-2 rounded-card" />)}
        </div>
      ) : (
        <>
          {/* Stats */}
          {promo && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <StatsCard title={t.adsImpressions} value={promo.impressions} icon={Eye}           iconColor="text-blue-400" />
              <StatsCard title={t.adsClicks}      value={promo.clicks}      icon={MousePointer}  iconColor="text-amber" />
              <StatsCard title="CTR"               value={`${ctr}%`}         icon={TrendingUp}    iconColor="text-accent" />
            </div>
          )}

          {/* Campaign form */}
          <div className="bg-surface border border-border rounded-card p-6 max-w-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-text">{t.adsBoostTitle}</h3>
                <p className="text-xs text-muted mt-0.5">{t.adsBoostDesc}</p>
              </div>
              <button onClick={() => setIsActive(v => !v)} title={isActive ? t.adsDeactivate : t.adsActivate}>
                {isActive
                  ? <ToggleRight size={28} className="text-accent" />
                  : <ToggleLeft  size={28} className="text-muted" />
                }
              </button>
            </div>

            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip text-xs font-semibold mb-5 ${
              isActive ? 'bg-accent/15 text-accent' : 'bg-surface-2 text-muted'
            }`}>
              <Megaphone size={11} />
              {isActive ? t.adsActive : t.adsInactive}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">{t.adsStartDate}</label>
                  <input
                    type="date"
                    value={startsAt}
                    onChange={e => setStartsAt(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">{t.adsEndDate}</label>
                  <input
                    type="date"
                    value={endsAt}
                    onChange={e => setEndsAt(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t.adsBudget}</label>
                <input
                  type="number"
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  placeholder="50"
                  className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-btn text-text focus:outline-none focus:border-accent placeholder:text-muted"
                />
              </div>
            </div>

            {error && <p className="text-xs text-error mt-3">{error}</p>}
            {saved && <p className="text-xs text-accent mt-3">✓ {t.adsSaved}</p>}

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-5 w-full px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-btn transition-colors disabled:opacity-50"
            >
              {saving ? t.saving : t.adsSave}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
