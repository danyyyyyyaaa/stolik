import { Router } from 'express'
import Stripe from 'stripe'
import { PrismaClient, BoostLevel } from '@prisma/client'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { getIo } from '../lib/socket'

const router = Router({ mergeParams: true })
const prisma = new PrismaClient()

// ─── Config ───────────────────────────────────────────────────────────────────

const DAILY_RATES: Record<BoostLevel, number> = {
  BOOST:         15,
  BOOST_PRO:     35,
  BOOST_PREMIUM: 65,
}

const BOOST_SCORES: Record<BoostLevel, number> = {
  BOOST:          50,
  BOOST_PRO:     150,
  BOOST_PREMIUM: 300,
}

const VALID_DAYS = [7, 14, 30] as const

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key, { apiVersion: '2024-04-10' as Stripe.LatestApiVersion })
}

async function ownerOf(restaurantId: string, userId: string) {
  return prisma.restaurant.findFirst({ where: { id: restaurantId, ownerId: userId } })
}

// ─── POST /api/restaurants/:id/boosts ────────────────────────────────────────

const createBoostSchema = z.object({
  level: z.nativeEnum(BoostLevel),
  days:  z.number().int().refine(d => VALID_DAYS.includes(d as any), {
    message: 'days must be 7, 14 or 30',
  }),
})

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    const { id: restaurantId } = req.params

    const r = await ownerOf(restaurantId, userId)
    if (!r) return res.status(403).json({ error: 'Forbidden' })

    const parsed = createBoostSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    const { level, days } = parsed.data
    const dailyRate    = DAILY_RATES[level]
    const totalAmount  = dailyRate * days      // PLN
    const amountCents  = Math.round(totalAmount * 100) // stripe uses grosz

    const now     = new Date()
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    // Create Boost record (PENDING until payment succeeds)
    const boost = await prisma.boost.create({
      data: {
        restaurantId,
        level,
        startDate:   now,
        endDate,
        dailyRate,
        totalAmount,
        status: 'PENDING',
      },
    })

    const stripe = getStripe()
    if (!stripe) {
      // No Stripe configured — activate immediately (dev/test mode)
      const activated = await prisma.$transaction([
        prisma.boost.update({
          where: { id: boost.id },
          data:  { status: 'ACTIVE', paidAt: now },
        }),
        prisma.restaurant.update({
          where: { id: restaurantId },
          data:  { boostScore: BOOST_SCORES[level] },
        }),
      ])
      return res.status(201).json({
        boostId:            boost.id,
        stripeClientSecret: null,
        amount:             totalAmount,
        currency:           'pln',
        status:             'ACTIVE',
      })
    }

    // Create Stripe PaymentIntent
    const intent = await stripe.paymentIntents.create({
      amount:   amountCents,
      currency: 'pln',
      metadata: {
        boostId:      boost.id,
        restaurantId,
        level,
        days: String(days),
      },
      description: `Boost ${level} × ${days} days — ${r.name}`,
    })

    // Store intent ID on boost
    await prisma.boost.update({
      where: { id: boost.id },
      data:  { stripePaymentId: intent.id },
    })

    res.status(201).json({
      boostId:            boost.id,
      stripeClientSecret: intent.client_secret,
      amount:             totalAmount,
      currency:           'pln',
      status:             'PENDING',
    })
  } catch (err) { next(err) }
})

// ─── GET /api/restaurants/:id/boosts ─────────────────────────────────────────

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    const { id: restaurantId } = req.params

    const r = await ownerOf(restaurantId, userId)
    if (!r) return res.status(403).json({ error: 'Forbidden' })

    const now    = new Date()
    const boosts = await prisma.boost.findMany({
      where:   { restaurantId },
      orderBy: { createdAt: 'desc' },
    })

    const activeBoost = boosts.find(b => b.status === 'ACTIVE' && b.endDate > now) ?? null
    const history     = boosts.filter(b => b !== activeBoost)

    res.json({ activeBoost, history })
  } catch (err) { next(err) }
})

// ─── GET /api/restaurants/:id/boosts/:bid/stats ───────────────────────────────

router.get('/:bid/stats', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    const { id: restaurantId, bid } = req.params

    const r = await ownerOf(restaurantId, userId)
    if (!r) return res.status(403).json({ error: 'Forbidden' })

    const boost = await prisma.boost.findFirst({
      where: { id: bid, restaurantId },
    })
    if (!boost) return res.status(404).json({ error: 'Boost not found' })

    const now          = new Date()
    const msRemaining  = boost.endDate.getTime() - now.getTime()
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))
    const ctr          = boost.impressions > 0
      ? Math.round((boost.clicks / boost.impressions) * 10000) / 100
      : 0
    const costPerBooking = boost.bookings > 0
      ? Math.round((boost.totalAmount / boost.bookings) * 100) / 100
      : null

    res.json({
      impressions: boost.impressions,
      clicks:      boost.clicks,
      bookings:    boost.bookings,
      ctr,
      costPerBooking,
      daysRemaining,
    })
  } catch (err) { next(err) }
})

// ─── POST /api/restaurants/:id/boosts/:bid/cancel ────────────────────────────

router.post('/:bid/cancel', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    const { id: restaurantId, bid } = req.params

    const r = await ownerOf(restaurantId, userId)
    if (!r) return res.status(403).json({ error: 'Forbidden' })

    const boost = await prisma.boost.findFirst({
      where: { id: bid, restaurantId, status: 'ACTIVE' },
    })
    if (!boost) return res.status(404).json({ error: 'Active boost not found' })

    // Proportional refund: (remaining days / total days) × totalAmount
    const now          = new Date()
    const totalDays    = Math.round((boost.endDate.getTime() - boost.startDate.getTime()) / (1000 * 60 * 60 * 24))
    const usedDays     = Math.ceil((now.getTime() - boost.startDate.getTime()) / (1000 * 60 * 60 * 24))
    const remainingDays = Math.max(0, totalDays - usedDays)
    const refundAmount  = Math.round((remainingDays / totalDays) * boost.totalAmount * 100) // grosz

    let refundId: string | null = null
    const stripe = getStripe()
    if (stripe && boost.stripePaymentId && refundAmount > 0) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: boost.stripePaymentId,
          amount:         refundAmount,
          reason:         'requested_by_customer',
        })
        refundId = refund.id
      } catch (stripeErr) {
        console.error('[Boost cancel] Stripe refund failed:', stripeErr)
        // Proceed with cancellation even if refund fails — handle manually
      }
    }

    await prisma.$transaction([
      prisma.boost.update({
        where: { id: bid },
        data:  { status: 'CANCELLED' },
      }),
      prisma.restaurant.update({
        where: { id: restaurantId },
        data:  { boostScore: 0, totalScore: r.baseScore },
      }),
    ])

    res.json({
      ok:             true,
      refundAmount:   refundAmount / 100,
      refundId,
      daysRefunded:   remainingDays,
    })
  } catch (err) { next(err) }
})

export { router as boostsRouter }
