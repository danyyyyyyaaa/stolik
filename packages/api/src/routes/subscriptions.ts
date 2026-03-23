import { Router, Request, Response } from 'express'
import express from 'express'
import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3000'

// ─── Lazy Stripe client ───────────────────────────────────────────────────────
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    console.warn('[Stripe] STRIPE_SECRET_KEY not set — payments disabled')
    return null
  }
  return new Stripe(key, { apiVersion: '2024-04-10' as Stripe.LatestApiVersion })
}

// ─── Plan definitions ─────────────────────────────────────────────────────────
const PLANS = {
  pro: {
    name:     'Pro',
    amount:   14900,   // 149 zł in grosz
    currency: 'pln',
    interval: 'month' as const,
  },
  business: {
    name:     'Business',
    amount:   29900,   // 299 zł in grosz
    currency: 'pln',
    interval: 'month' as const,
  },
} as const

// ─── POST /api/subscriptions/checkout ────────────────────────────────────────
router.post('/checkout', requireAuth, async (req: Request, res: Response) => {
  const stripe = getStripe()
  if (!stripe) return res.status(503).json({ error: 'System płatności nie jest skonfigurowany' })

  const userId       = (req as any).userId
  const { plan, restaurantId } = req.body

  if (!plan || !Object.keys(PLANS).includes(plan)) {
    return res.status(400).json({ error: 'Nieprawidłowy plan. Wybierz: pro lub business' })
  }
  if (!restaurantId) {
    return res.status(400).json({ error: 'restaurantId jest wymagane' })
  }

  const [restaurant, user] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id: restaurantId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ])

  if (!restaurant || restaurant.ownerId !== userId) {
    return res.status(403).json({ error: 'Brak dostępu' })
  }
  if (!user) return res.status(404).json({ error: 'Użytkownik nie znaleziony' })

  try {
    const planConfig = PLANS[plan as keyof typeof PLANS]

    // Get or create Stripe customer
    let customerId = restaurant.stripeCustomerId ?? undefined
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name:  `${user.firstName} ${user.lastName}`,
        metadata: { userId, restaurantId },
      })
      customerId = customer.id
      await prisma.restaurant.update({
        where: { id: restaurantId },
        data:  { stripeCustomerId: customerId },
      })
    }

    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      mode:                 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency:     planConfig.currency,
          product_data: {
            name:        `Stolik ${planConfig.name}`,
            description: `Plan ${planConfig.name} — miesięczna subskrypcja`,
          },
          unit_amount: planConfig.amount,
          recurring:   { interval: planConfig.interval },
        },
        quantity: 1,
      }],
      success_url: `${DASHBOARD_URL}/dashboard/billing?success=1`,
      cancel_url:  `${DASHBOARD_URL}/dashboard/billing?cancelled=1`,
      metadata:    { restaurantId, plan },
    })

    res.json({ url: session.url })
  } catch (err: any) {
    console.error('[Stripe] checkout error:', err)
    res.status(500).json({ error: err.message || 'Błąd Stripe' })
  }
})

// ─── GET /api/subscriptions/portal ───────────────────────────────────────────
router.get('/portal', requireAuth, async (req: Request, res: Response) => {
  const stripe = getStripe()
  if (!stripe) return res.status(503).json({ error: 'System płatności nie jest skonfigurowany' })

  const userId       = (req as any).userId
  const restaurantId = req.query.restaurantId as string | undefined

  if (!restaurantId) return res.status(400).json({ error: 'restaurantId jest wymagane' })

  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } })
  if (!restaurant || restaurant.ownerId !== userId) {
    return res.status(403).json({ error: 'Brak dostępu' })
  }
  if (!restaurant.stripeCustomerId) {
    return res.status(404).json({ error: 'Brak aktywnej subskrypcji' })
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer:   restaurant.stripeCustomerId,
      return_url: `${DASHBOARD_URL}/dashboard/billing`,
    })
    res.json({ url: session.url })
  } catch (err: any) {
    console.error('[Stripe] portal error:', err)
    res.status(500).json({ error: err.message || 'Błąd Stripe' })
  }
})

// ─── POST /api/subscriptions/webhook ─────────────────────────────────────────
// NOTE: registered with express.raw() — must come BEFORE express.json() in index.ts
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.warn('[Stripe] STRIPE_WEBHOOK_SECRET not set — skipping signature check')
      return res.json({ received: true })
    }

    const sig = req.headers['stripe-signature']
    if (!sig) return res.status(400).json({ error: 'Missing stripe-signature header' })

    const stripe = getStripe()
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' })

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
    } catch (err: any) {
      console.error('[Stripe] webhook signature error:', err.message)
      return res.status(400).json({ error: `Webhook Error: ${err.message}` })
    }

    try {
      switch (event.type) {

        // ── Payment completed → activate plan ───────────────────────────────
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          const { restaurantId, plan } = session.metadata ?? {}
          if (restaurantId && plan) {
            await prisma.restaurant.update({
              where: { id: restaurantId },
              data: {
                plan,
                isPremium:             plan !== 'free',
                stripeCustomerId:      (session.customer as string) ?? undefined,
                stripeSubscriptionId:  (session.subscription as string) ?? undefined,
              },
            })
            console.log(`[Stripe] ${restaurantId} → plan: ${plan}`)
          }
          break
        }

        // ── Subscription cancelled → downgrade to free ──────────────────────
        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription
          const restaurant = await prisma.restaurant.findFirst({
            where: { stripeCustomerId: sub.customer as string },
          })
          if (restaurant) {
            await prisma.restaurant.update({
              where: { id: restaurant.id },
              data:  { plan: 'free', isPremium: false, stripeSubscriptionId: null },
            })
            console.log(`[Stripe] ${restaurant.id} → plan: free (subscription deleted)`)
          }
          break
        }

        // ── Subscription updated (e.g. plan change via portal) ───────────────
        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription
          if (sub.status === 'active' || sub.status === 'trialing') {
            const restaurant = await prisma.restaurant.findFirst({
              where: { stripeCustomerId: sub.customer as string },
            })
            if (restaurant && restaurant.plan === 'free') {
              await prisma.restaurant.update({
                where: { id: restaurant.id },
                data:  { isPremium: true },
              })
            }
          }
          break
        }

        // ── Payment failed → optional: notify owner ──────────────────────────
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice
          console.warn(`[Stripe] Payment failed for customer: ${invoice.customer}`)
          break
        }

        default:
          // Unhandled event type — ignore
          break
      }
    } catch (err) {
      console.error('[Stripe] webhook handler error:', err)
      // Return 200 so Stripe does not retry
    }

    res.json({ received: true })
  }
)

export { router as subscriptionsRouter }
