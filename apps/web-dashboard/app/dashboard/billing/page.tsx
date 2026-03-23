'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// ─── Plan definitions (mirrors API) ──────────────────────────────────────────
const PLANS = [
  {
    id:       'free',
    name:     'Free',
    price:    '0 zł',
    period:   '',
    tagline:  'Na start',
    color:    'border-border',
    badge:    null,
    features: [
      'Do 50 rezerwacji / miesiąc',
      'Widget do osadzenia',
      'Panel zarządzania',
      'SMS potwierdzenia (10/mies.)',
      '—',
      '—',
    ],
    cta:      'Aktualny plan',
    ctaFree:  true,
  },
  {
    id:       'pro',
    name:     'Pro',
    price:    '149 zł',
    period:   '/ miesiąc',
    tagline:  'Dla aktywnych restauracji',
    color:    'border-accent',
    badge:    'Najpopularniejszy',
    features: [
      'Nielimitowane rezerwacje',
      'Widget do osadzenia',
      'Panel zarządzania',
      'SMS bez limitu',
      'CRM gości + tagi VIP',
      'Priorytetowe wsparcie',
    ],
    cta:      'Wybierz Pro',
    ctaFree:  false,
  },
  {
    id:       'business',
    name:     'Business',
    price:    '299 zł',
    period:   '/ miesiąc',
    tagline:  'Dla sieci i premium',
    color:    'border-border',
    badge:    null,
    features: [
      'Nielimitowane rezerwacje',
      'Widget do osadzenia',
      'Panel zarządzania',
      'SMS bez limitu',
      'CRM gości + tagi VIP',
      'Dedykowany opiekun konta',
    ],
    cta:      'Wybierz Business',
    ctaFree:  false,
  },
]

// ─── Feature row ──────────────────────────────────────────────────────────────
function FeatureItem({ text }: { text: string }) {
  const missing = text === '—'
  return (
    <li className="flex items-center gap-2 text-sm">
      {missing ? (
        <span className="w-4 h-4 flex-shrink-0 text-border">—</span>
      ) : (
        <span className="w-4 h-4 flex-shrink-0 text-accent">✓</span>
      )}
      <span className={missing ? 'text-muted' : 'text-text/80'}>{missing ? 'Niedostępne' : text}</span>
    </li>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BillingPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [token,        setToken]        = useState<string | null>(null)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [currentPlan,  setCurrentPlan]  = useState<string>('free')
  const [loading,      setLoading]      = useState<string | null>(null)  // plan id being purchased
  const [portalLoading, setPortalLoading] = useState(false)
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null)

  // ── Auth + restaurant info ─────────────────────────────────────────────────
  useEffect(() => {
    const t   = localStorage.getItem('stolik_token')
    const raw = localStorage.getItem('stolik_restaurant')
    if (!t) { router.push('/login'); return }
    setToken(t)
    if (raw) {
      try {
        const r = JSON.parse(raw)
        setRestaurantId(r.id ?? null)
        setCurrentPlan(r.plan ?? 'free')
      } catch { /* ignore */ }
    }
  }, [router])

  // ── Handle Stripe redirect params ─────────────────────────────────────────
  useEffect(() => {
    if (searchParams.get('success') === '1') {
      showToast('Subskrypcja aktywowana! Dziękujemy.', true)
      // Refresh restaurant data
      if (token && restaurantId) refreshRestaurant(token, restaurantId)
    }
    if (searchParams.get('cancelled') === '1') {
      showToast('Anulowano — plan nie został zmieniony.', false)
    }
  }, [searchParams, token, restaurantId])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  async function refreshRestaurant(tok: string, rid: string) {
    try {
      const res  = await fetch(`${API}/api/restaurants/${rid}`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      const data = await res.json()
      if (data.plan) {
        setCurrentPlan(data.plan)
        const stored = localStorage.getItem('stolik_restaurant')
        if (stored) {
          localStorage.setItem('stolik_restaurant', JSON.stringify({ ...JSON.parse(stored), plan: data.plan }))
        }
      }
    } catch { /* ignore */ }
  }

  // ── Checkout ───────────────────────────────────────────────────────────────
  async function handleSelectPlan(planId: string) {
    if (planId === 'free' || planId === currentPlan) return
    if (!token || !restaurantId) { router.push('/login'); return }

    setLoading(planId)
    try {
      const res  = await fetch(`${API}/api/subscriptions/checkout`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: planId, restaurantId }),
      })
      const data = await res.json()

      if (!res.ok) { showToast(data.error || 'Błąd płatności', false); return }
      if (data.url) window.location.href = data.url
    } catch {
      showToast('Nie można połączyć się z serwerem', false)
    } finally {
      setLoading(null)
    }
  }

  // ── Customer portal ────────────────────────────────────────────────────────
  async function handleManageSubscription() {
    if (!token || !restaurantId) return
    setPortalLoading(true)
    try {
      const res  = await fetch(
        `${API}/api/subscriptions/portal?restaurantId=${restaurantId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (!res.ok) { showToast(data.error || 'Błąd portalu', false); return }
      if (data.url) window.location.href = data.url
    } catch {
      showToast('Nie można połączyć się z serwerem', false)
    } finally {
      setPortalLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg text-text">

      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-muted hover:text-text transition-colors text-sm">
            ← Panel
          </Link>
          <span className="text-border">/</span>
          <span className="text-sm font-medium">Plany i fakturowanie</span>
        </div>
        {currentPlan !== 'free' && (
          <button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="text-xs text-muted hover:text-text border border-border hover:border-accent/50 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            {portalLoading ? 'Ładowanie…' : 'Zarządzaj subskrypcją →'}
          </button>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Wybierz swój plan
          </h1>
          <p className="text-muted text-sm max-w-md mx-auto leading-relaxed">
            Skaluj razem ze swoją restauracją. Zmień lub anuluj w dowolnym momencie.
          </p>

          {/* Current plan badge */}
          <div className="mt-4 inline-flex items-center gap-2 bg-surface border border-border rounded-full px-4 py-1.5 text-xs text-muted">
            <span className="w-2 h-2 rounded-full bg-accent"></span>
            Aktualny plan:
            <span className="font-semibold text-text capitalize ml-0.5">{currentPlan}</span>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map(plan => {
            const isActive  = plan.id === currentPlan
            const isBusy    = loading === plan.id
            const isDisabled = isBusy || loading !== null || plan.ctaFree || isActive

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col bg-surface rounded-2xl border-2 p-6 transition-all ${
                  isActive
                    ? 'border-accent shadow-lg shadow-accent/10'
                    : plan.color + ' hover:border-accent/40'
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}

                {isActive && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                    Twój plan
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <h2 className="text-lg font-bold mb-1">{plan.name}</h2>
                  <p className="text-xs text-muted mb-4">{plan.tagline}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold tracking-tight">{plan.price}</span>
                    {plan.period && (
                      <span className="text-sm text-muted">{plan.period}</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f, i) => (
                    <FeatureItem key={i} text={f} />
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isDisabled}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-accent/20 text-accent cursor-default'
                      : plan.ctaFree
                      ? 'bg-border/30 text-muted cursor-default'
                      : 'bg-accent hover:bg-accent-hover text-white disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {isBusy
                    ? 'Przekierowuję…'
                    : isActive
                    ? '✓ Aktualny plan'
                    : plan.cta}
                </button>
              </div>
            )
          })}
        </div>

        {/* FAQ / info */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: '🔒', title: 'Bezpieczna płatność', desc: 'Obsługiwane przez Stripe. Dane karty nigdy nie trafiają na nasze serwery.' },
            { icon: '🔄', title: 'Anuluj w każdej chwili', desc: 'Żadnych umów. Subskrypcja odnawia się miesięcznie i można ją anulować w portalu.' },
            { icon: '📞', title: 'Wsparcie 24/7', desc: 'W planie Pro i Business masz dostęp do priorytetowego wsparcia przez chat.' },
          ].map(item => (
            <div key={item.title} className="bg-surface border border-border rounded-2xl p-5">
              <div className="text-2xl mb-3">{item.icon}</div>
              <div className="text-sm font-semibold mb-1">{item.title}</div>
              <div className="text-xs text-muted leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg transition-all ${
          toast.ok
            ? 'bg-accent text-white'
            : 'bg-red-500/90 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
