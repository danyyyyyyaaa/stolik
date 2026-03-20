import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Public widget API — no auth, used by JS embed on restaurant websites

router.get('/:restaurantSlug', async (req, res) => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: req.params.restaurantSlug },
    select: { id: true, name: true, emoji: true, priceRange: true, district: true, slotDuration: true, depositRequired: true, depositAmount: true }
  })

  if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' })
  res.json(restaurant)
})

router.get('/:restaurantSlug/slots', async (req, res) => {
  const { date, guests } = req.query
  // Same slots logic as bookings route
  const slots = ['17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00']
  res.json({ slots })
})

export { router as widgetRouter }
