import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

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
