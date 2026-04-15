/**
 * POST /api/webhooks/stripe/boost
 *
 * Handles Stripe webhook events for the Boost payment flow.
 * Must be mounted BEFORE express.json() so raw body is preserved
 * for signature verification.
 *
 * Events handled:
 *   payment_intent.succeeded  → Boost ACTIVE, boostScore updated
 *   payment_intent.payment_failed → Boost CANCELLED, notify via Socket.io
 */
import { Router, Request, Response } from 'express'
import Stripe from 'stripe'
import { PrismaClient, BoostLevel } from '@prisma/client'
import { getIo } from '../lib/socket'

const router = Router()
const prisma = new PrismaClient()

const BOOST_SCORES: Record<BoostLevel, number> = {
  BOOST:          50,
  BOOST_PRO:     150,
  BOOST_PREMIUM: 300,
}

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key, { apiVersion: '2024-04-10' as Stripe.LatestApiVersion })
}

// ─── POST /api/webhooks/stripe/boost ─────────────────────────────────────────

router.post('/stripe/boost', async (req: Request, res: Response) => {
  const stripe = getStripe()
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' })

  const sig     = req.headers['stripe-signature'] as string
  const secret  = process.env.STRIPE_WEBHOOK_SECRET_BOOST ?? process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  try {
    if (secret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, secret)
    } else {
      // Dev mode: parse raw body as JSON (no signature verification)
      event = JSON.parse(req.body.toString()) as Stripe.Event
    }
  } catch (err: any) {
    console.error('[Webhook/boost] Signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` })
  }

  const intent = event.data.object as Stripe.PaymentIntent

  // Only process events that carry boost metadata
  const boostId = intent.metadata?.boostId
  if (!boostId) return res.json({ received: true }) // Not a boost payment

  try {
    switch (event.type) {
      // ── Payment succeeded ────────────────────────────────────────────────
      case 'payment_intent.succeeded': {
        const boost = await prisma.boost.findUnique({ where: { id: boostId } })
        if (!boost || boost.status !== 'PENDING') break

        const score = BOOST_SCORES[boost.level]

        await prisma.$transaction([
          prisma.boost.update({
            where: { id: boostId },
            data:  { status: 'ACTIVE', paidAt: new Date() },
          }),
          prisma.restaurant.update({
            where: { id: boost.restaurantId },
            data:  { boostScore: score },
          }),
        ])

        // Notify dashboard in real-time
        getIo()?.to(`restaurant:${boost.restaurantId}`).emit('boost:activated', {
          restaurantId: boost.restaurantId,
          boostId,
          level:  boost.level,
          endDate: boost.endDate,
        })

        console.log(`[Webhook/boost] Boost ${boostId} ACTIVATED (${boost.level}, +${score} pts)`)
        break
      }

      // ── Payment failed ───────────────────────────────────────────────────
      case 'payment_intent.payment_failed': {
        const boost = await prisma.boost.findUnique({ where: { id: boostId } })
        if (!boost) break

        await prisma.boost.update({
          where: { id: boostId },
          data:  { status: 'CANCELLED' },
        })

        // Notify dashboard so owner can retry
        getIo()?.to(`restaurant:${boost.restaurantId}`).emit('boost:payment_failed', {
          restaurantId: boost.restaurantId,
          boostId,
          level: boost.level,
          error: (intent.last_payment_error?.message) ?? 'Payment failed',
        })

        console.warn(`[Webhook/boost] Boost ${boostId} payment FAILED — cancelled`)
        break
      }

      default:
        // Ignore other event types
        break
    }
  } catch (err) {
    console.error('[Webhook/boost] DB error:', err)
    // Still return 200 so Stripe doesn't retry endlessly
  }

  res.json({ received: true })
})

export { router as webhooksRouter }
