import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Extracts restaurantId from req.query or req.params, verifies the
// authenticated user owns it, and injects req.restaurant.
// Must be used AFTER requireAuth.
export async function requireRestaurant(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId
  const restaurantId = (req.query.restaurantId ?? req.params.restaurantId) as string | undefined
  if (!restaurantId) return res.status(400).json({ error: 'restaurantId required' })

  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } })
  if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' })

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  // Admin can access any restaurant; owner must be the restaurant owner
  if (user.role !== 'admin' && restaurant.ownerId !== userId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  ;(req as any).restaurant = restaurant
  next()
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    ;(req as any).userId = payload.userId
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }
    ;(req as any).userId = payload.userId
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
