'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Shield, RefreshCw, Headphones, CheckCircle, Minus } from 'lucide-react'
import clsx from 'clsx'
import { useT } from '@/lib/i18n'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

function FeatureRow({ text }: { text: string | null }) {
  const t = useT()
  if (!text) return (
    <li className="flex items-center gap-2.5 text-sm text-muted">
      <Minus size={14} className="text-border shrink-0" />
      <span>{t.notAvailable}</span>
    </li>
  )
  return (
    <li className="flex items-center gap-2.5 text-sm text-text/80">
      <CheckCircle size={14} className="text-accent shrink-0" />
      <span>{text}</span>
    </li>
  )
}

function BillingContent() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const t             = useT()

  const [token,          setToken]          = useState<string | null>(null)
  const [restaurantId,   setRestaurantId]   = useState<string | null>(null)
  const [currentPlan,    setCurrentPlan]    = useState<string>('free')
  const [loading,        setLoading]        = useState<string | null>(null)
  const [portalLoading,  setPortalLoading]  = useState(false)
  const [toast,          setToast]          = useState<{ msg: string; ok: boolean } | null>(null)

  // Plans defined inside component to access translations
  const PLANS = [
    {
      id:       'free',
      name:     'Free',
      price:    '0 zł',
      period:   '',
      tagline:  t.planFreeTagline,
      badge:    null as string | null,
      features: [
        t.feat50bookings,
        t.featWidgetEmbed,
        t.featPanel,
        t.featSms10,
        null,
        null,
      ],
      cta:    t.currentPlan,
      isFree: true,
    },
    {
      id:       'pro',
      name:     'Pro',
      price:    '149 zł',
      period:   '/ miesiąc',
      tagline:  t.planProTagline,
      badge:    t.mostPopular as string | null,
      features: [
        t.featUnlimited,
        t.featWidgetEmbed,
        t.featPanel,
        t.featSmsUnlimited,
        t.featCrm,
        t.featPrioritySupport,
      ],
      cta:    t.planProCta,
      isFree: false,
    },
    {
      id:       'business',
      name:     'Business',
      price:    '299 zł',
      period:   '/ miesiąc',
      tagline:  t.planBizTagline,
      badge:    null as string | null,
      features: [
        t.featUnlimited,
        t.featWidgetEmbed,
        t.featPanel,
        t.featSmsUnlimited,
        t.featCrm,
        t.featDedicatedMgr,
      ],
      cta:    t.planBizCta,
      isFree: false,
    },
  ]

  useEffect(() => {
    const tok = localStorage.getItem('stolik_token')
    const raw = localStorage.getItem('stolik_active_restaurant') || localStorage.getItem('stolik_restaurant')
    if (!tok) { router.push('/login'); return }
    setToken(tok)
    if (raw) {
      try {
        const r = JSON.parse(raw)
        setRestaurantId(r.id ?? null)
        setCurrentPlan(r.plan ?? 'free')
      } catch {}
    }
  }, [router])

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      showToast(t.subActivated, true)
      if (token && restaurantId) refreshRestaurant(token, restaurantId)
    }
    if (searchParams.get('cancelled') === '1') {
      showToast(t.subCancelled, false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, token, restaurantId])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 5000)
  }

  async function refreshRestaurant(tok: string, rid: string) {
    try {
      const res  = await fetch(`${API}/api/restaurants/${rid}`, { headers: { Authorization: `Bearer ${tok}` } })
      const data = await res.json()
      if (data.plan) {
        setCurrentPlan(data.plan)
        const stored = localStorage.getItem('stolik_active_restaurant') || localStorage.getItem('stolik_restaurant')
        if (stored) {
          const updated = JSON.stringify({ ...JSON.parse(stored), plan: data.plan })
          localStorage.setItem('stolik_active_restaurant', updated)
          localStorage.setItem('stolik_restaurant', updated)
        }
      }
    } catch {}
  }

  async function handleSelectPlan(planId: string) {
    if (planId === 'free' || planId === currentPlan) return
    if (!token || !restaurantId) { router.push('/login'); return }
    setLoading(planId)
    try {
      const res  = await fetch(`${API}/api/subscriptions/checkout`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ plan: planId, restaurantId }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || t.paymentError, false); return }
      if (data.url) window.location.href = data.url
    } catch {
      showToast(t.serverError, false)
    } finally { setLoading(null) }
  }

  async function handleManageSubscription() {
    if (!token || !restaurantId) return
    setPortalLoading(true)
    try {
      const res  = await fetch(`${API}/api/subscriptions/portal?restaurantId=${restaurantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || t.portalError, false); return }
      if (data.url) window.location.href = data.url
    } catch {
      showToast(t.serverError, false)
    } finally { setPortalLoading(false) }
  }

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-border bg-surface px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-text">{t.plansTitle}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
            <span className="text-sm text-muted">
              {t.currentPlan}:{' '}
              <span className="text-text font-semibold capitalize">{currentPlan}</span>
            </span>
          </div>
        </div>
        {currentPlan !== 'free' && (
          <button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="text-sm text-muted hover:text-text border border-border hover:border-muted/50 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
          >
            {portalLoading
              ? <span className="flex items-center gap-2"><RefreshCw size={14} className="animate-spin" />{t.loading}</span>
              : t.manageSubscription}
          </button>
        )}
      </header>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-8 py-10">
        <div className="max-w-[1100px] mx-auto">

          {/* Title */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-text tracking-tight mb-3">{t.choosePlan}</h2>
            <p className="text-muted text-sm max-w-md mx-auto leading-relaxed">{t.choosePlanSub}</p>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map(plan => {
              const isActive   = plan.id === currentPlan
              const isBusy     = loading === plan.id
              const isDisabled = isBusy || loading !== null || plan.isFree || isActive

              return (
                <div
                  key={plan.id}
                  className={clsx(
                    'relative flex flex-col bg-surface rounded-2xl border-2 p-6 transition-all',
                    isActive
                      ? 'border-accent shadow-lg shadow-accent/10'
                      : 'border-border hover:border-muted/50'
                  )}
                >
                  {(plan.badge || isActive) && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-bold px-3.5 py-1 rounded-full whitespace-nowrap shadow-lg">
                      {isActive ? `✓ ${t.yourPlan}` : plan.badge}
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-bold text-text">{plan.name}</h3>
                      {!plan.badge && !isActive && plan.id === 'pro' && (
                        <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent border border-accent/20 rounded-full font-medium">
                          {t.mostPopular}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mb-4">{plan.tagline}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-text tracking-tight">{plan.price}</span>
                      {plan.period && <span className="text-sm text-muted">{plan.period}</span>}
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((f, i) => <FeatureRow key={i} text={f} />)}
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isDisabled}
                    className={clsx(
                      'w-full py-2.5 rounded-xl text-sm font-bold transition-all',
                      isActive
                        ? 'bg-accent/15 text-accent cursor-default border border-accent/20'
                        : plan.isFree
                        ? 'bg-surface-2 text-muted cursor-default border border-border'
                        : 'bg-accent hover:bg-accent-hover text-white shadow-md shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {isBusy ? t.redirecting : isActive ? `✓ ${t.yourPlan}` : plan.cta}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Trust badges */}
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {([
              { icon: Shield,     title: t.trustPayTitle,     desc: t.trustPayDesc     },
              { icon: RefreshCw,  title: t.trustCancelTitle,  desc: t.trustCancelDesc  },
              { icon: Headphones, title: t.trustSupportTitle, desc: t.trustSupportDesc },
            ] as const).map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-surface border border-border rounded-xl p-5 flex flex-col items-center text-center gap-3">
                <div className="p-3 bg-surface-2 border border-border rounded-xl">
                  <Icon size={20} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-bold text-text mb-1">{title}</p>
                  <p className="text-xs text-muted leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl border transition-all',
          toast.ok
            ? 'bg-accent/95 text-white border-accent/30'
            : 'bg-surface border-red-500/30 text-red-400'
        )}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

export default function BillingPage() {
  const t = useT()
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted">
          <RefreshCw size={18} className="animate-spin" />
          <span className="text-sm">{t.loading}</span>
        </div>
      </div>
    }>
      <BillingContent />
    </Suspense>
  )
}
