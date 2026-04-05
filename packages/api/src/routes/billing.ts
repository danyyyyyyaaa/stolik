import { Router, Request, Response } from 'express'
import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://stolik-dashboard.vercel.app'

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key, { apiVersion: '2024-04-10' as Stripe.LatestApiVersion })
}

// ─── GET /api/billing/subscription?restaurantId=xxx ──────────────────────────
router.get('/subscription', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const { restaurantId } = req.query
    const restaurant = await prisma.restaurant.findUnique({ where: { id: String(restaurantId) } })
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' })

    if (!restaurant.stripeSubscriptionId) {
      return res.json({
        plan: restaurant.plan ?? 'free',
        status: restaurant.planStatus ?? 'active',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      })
    }

    const stripe = getStripe()
    if (!stripe) {
      return res.json({
        plan: restaurant.plan ?? 'free',
        status: restaurant.planStatus ?? 'active',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      })
    }

    const sub = await stripe.subscriptions.retrieve(restaurant.stripeSubscriptionId)
    res.json({
      plan: restaurant.plan ?? 'free',
      status: sub.status,
      currentPeriodEnd: new Date((sub as any).current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    })
  } catch (err) { next(err) }
})

// ─── POST /api/billing/create-checkout ───────────────────────────────────────
router.post('/create-checkout', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const { priceId, restaurantId } = req.body
    if (!priceId || !restaurantId) return res.status(400).json({ error: 'priceId and restaurantId required' })

    const stripe = getStripe()
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' })

    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } })
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' })

    let customerId = restaurant.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: restaurant.email ?? undefined,
        name: restaurant.name,
        metadata: { restaurantId },
      })
      customerId = customer.id
      await prisma.restaurant.update({ where: { id: restaurantId }, data: { stripeCustomerId: customerId } })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${DASHBOARD_URL}/dashboard/billing?success=1`,
      cancel_url: `${DASHBOARD_URL}/dashboard/billing`,
      metadata: { restaurantId },
    })

    res.json({ sessionUrl: session.url })
  } catch (err) { next(err) }
})

// ─── POST /api/billing/portal ────────────────────────────────────────────────
router.post('/portal', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const { restaurantId } = req.body

    const stripe = getStripe()
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' })

    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } })
    if (!restaurant?.stripeCustomerId) return res.status(400).json({ error: 'No billing account found' })

    const session = await stripe.billingPortal.sessions.create({
      customer: restaurant.stripeCustomerId,
      return_url: `${DASHBOARD_URL}/dashboard/billing`,
    })

    res.json({ portalUrl: session.url })
  } catch (err) { next(err) }
})

// ─── POST /api/billing/webhook (raw body needed) ────────────────────────────
router.post('/webhook', async (req: Request, res: Response) => {
  const stripe = getStripe()
  if (!stripe) return res.json({ received: true })

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) return res.json({ received: true })

  const sig = req.headers['stripe-signature'] as string
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    return res.status(400).json({ error: 'Webhook signature verification failed' })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const restaurantId = session.metadata?.restaurantId
      if (restaurantId && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(String(session.subscription))
        const priceId = sub.items.data[0]?.price.id
        const plan = priceId === process.env.STRIPE_PRICE_BUSINESS ? 'business' : 'pro'
        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: { plan, planStatus: 'active', stripeSubscriptionId: String(session.subscription) },
        })
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      await prisma.restaurant.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { plan: 'free', planStatus: 'cancelled', stripeSubscriptionId: null },
      })
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice
      if (invoice.subscription) {
        await prisma.restaurant.updateMany({
          where: { stripeSubscriptionId: String(invoice.subscription) },
          data: { planStatus: 'past_due' },
        })
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
  }

  res.json({ received: true })
})

export { router as billingRouter }
