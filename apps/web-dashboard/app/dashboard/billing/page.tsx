'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useMyRestaurant } from '@/hooks/useRestaurant'
import { PageHeader } from '@/components/shared/PageHeader'

const PRICE_IDS = {
  pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? '',
  business: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS ?? '',
}

interface Subscription {
  plan: string
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: 0,
    priceId: undefined as string | undefined,
    features: {
      'Locations': '1',
      'Bookings/month': '20',
      'Calendar': 'Basic',
      'Analytics': false,
      'Menu Editor': false,
      'Reviews': false,
      'Staff roles': false,
      'API access': false,
      'Priority support': false,
      'Custom branding': false,
    },
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 149,
    priceId: PRICE_IDS.pro,
    features: {
      'Locations': '1',
      'Bookings/month': 'Unlimited',
      'Calendar': 'Full',
      'Analytics': true,
      'Menu Editor': true,
      'Reviews': true,
      'Staff roles': true,
      'API access': false,
      'Priority support': false,
      'Custom branding': false,
    },
  },
  {
    key: 'business',
    name: 'Business',
    price: 349,
    priceId: PRICE_IDS.business,
    features: {
      'Locations': 'Unlimited',
      'Bookings/month': 'Unlimited',
      'Calendar': 'Full',
      'Analytics': true,
      'Menu Editor': true,
      'Reviews': true,
      'Staff roles': true,
      'API access': true,
      'Priority support': true,
      'Custom branding': true,
    },
  },
]

const FEATURE_KEYS = Object.keys(PLANS[0].features) as Array<keyof typeof PLANS[0]['features']>

function BillingContent() {
  const { restaurant } = useMyRestaurant()
  const restaurantId = restaurant?.id

  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const searchParams = useSearchParams()
  const isSuccess = searchParams.get('success') === '1'

  useEffect(() => {
    if (!restaurantId) return
    api.get<Subscription>('/api/billing/subscription', { restaurantId })
      .then(setSubscription)
      .catch(() => setSubscription(null))
      .finally(() => setLoading(false))
  }, [restaurantId])

  const handleUpgrade = async (priceId: string) => {
    if (!priceId || !restaurantId) return
    setUpgradeLoading(priceId)
    try {
      const { sessionUrl } = await api.post<{ sessionUrl: string }>('/api/billing/create-checkout', { priceId, restaurantId })
      window.location.href = sessionUrl
    } catch (err) {
      console.error(err)
    } finally {
      setUpgradeLoading(null)
    }
  }

  const handlePortal = async () => {
    if (!restaurantId) return
    setPortalLoading(true)
    try {
      const { portalUrl } = await api.post<{ portalUrl: string }>('/api/billing/portal', { restaurantId })
      window.location.href = portalUrl
    } catch (err) {
      console.error(err)
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div>
      <PageHeader title="Billing" description="Subscription plans and payment management" />

      {isSuccess && (
        <div className="mb-6 flex items-center gap-3 px-5 py-4 bg-green-50 border border-green-200 rounded-card text-green-800 text-sm font-medium">
          <span className="text-green-500 text-lg">✓</span>
          Your subscription has been activated! Welcome to the next level.
        </div>
      )}

      {loading ? (
        <div className="bg-surface border border-border rounded-card p-6 mb-6 shadow-card animate-pulse">
          <div className="h-4 w-32 bg-surface-2 rounded mb-3" />
          <div className="h-8 w-24 bg-surface-2 rounded mb-2" />
          <div className="h-3 w-48 bg-surface-2 rounded" />
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-card p-6 mb-6 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted mb-1">Current Plan</p>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-text capitalize">
                  {subscription?.plan ?? 'Free'}
                </h2>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-chip ${
                  subscription?.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : subscription?.status === 'past_due'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-surface-2 text-muted'
                }`}>
                  {subscription?.status ?? 'active'}
                </span>
              </div>
              {subscription?.currentPeriodEnd && (
                <p className="text-sm text-muted mt-1">
                  Next billing:{' '}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
              {subscription?.cancelAtPeriodEnd && (
                <p className="text-sm text-amber mt-1 font-medium">
                  Your subscription will be cancelled at the end of the billing period.
                </p>
              )}
            </div>
            {subscription?.plan && subscription.plan !== 'free' && (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="px-4 py-2 border border-border rounded-btn text-sm text-text hover:bg-surface-2 disabled:opacity-50 transition-colors"
              >
                {portalLoading ? 'Loading...' : 'Manage Subscription'}
              </button>
            )}
          </div>
        </div>
      )}

      <h3 className="text-base font-semibold text-text mb-4">Choose a Plan</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {PLANS.map(plan => {
          const isCurrent = (subscription?.plan ?? 'free') === plan.key
          return (
            <div
              key={plan.key}
              className={`bg-surface border-2 rounded-card p-5 flex flex-col shadow-card transition-colors ${
                isCurrent ? 'border-accent' : 'border-border'
              }`}
            >
              {isCurrent && (
                <div className="text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-chip self-start mb-3">
                  Current Plan
                </div>
              )}
              <h3 className="text-lg font-bold text-text">{plan.name}</h3>
              <div className="mt-1 mb-4">
                {plan.price === 0 ? (
                  <span className="text-2xl font-bold text-text">Free</span>
                ) : (
                  <span className="text-2xl font-bold text-text">
                    {plan.price} zł
                    <span className="text-sm font-normal text-muted">/month</span>
                  </span>
                )}
              </div>
              <ul className="space-y-2 flex-1 mb-5">
                {FEATURE_KEYS.map(key => {
                  const val = plan.features[key]
                  return (
                    <li key={key} className="flex items-center gap-2 text-sm">
                      {typeof val === 'boolean' ? (
                        <span className={val ? 'text-accent font-bold' : 'text-muted'}>
                          {val ? '✓' : '✕'}
                        </span>
                      ) : (
                        <span className="text-accent font-bold">✓</span>
                      )}
                      <span className={typeof val === 'boolean' && !val ? 'text-muted' : 'text-text'}>
                        {key}{typeof val === 'string' ? `: ${val}` : ''}
                      </span>
                    </li>
                  )
                })}
              </ul>
              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-2 border border-border rounded-btn text-sm text-muted cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : plan.price === 0 ? null : (
                <button
                  onClick={() => handleUpgrade(plan.priceId!)}
                  disabled={upgradeLoading === plan.priceId}
                  className="w-full py-2 bg-accent text-white rounded-btn text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
                >
                  {upgradeLoading === plan.priceId ? 'Loading...' : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted text-center">
        Prices are in Polish zloty (PLN) and exclude VAT. Billing is monthly. Cancel anytime from the customer portal.
      </p>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div>
        <PageHeader title="Billing" description="Subscription plans and payment management" />
        <div className="bg-surface border border-border rounded-card p-6 animate-pulse shadow-card">
          <div className="h-6 w-40 bg-surface-2 rounded" />
        </div>
      </div>
    }>
      <BillingContent />
    </Suspense>
  )
}
