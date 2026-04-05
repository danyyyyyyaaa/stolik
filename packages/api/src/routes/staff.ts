import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { requireAuth } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// ─── POST /api/staff/invite — invite a user to a restaurant team ────────────
// Body: { email, restaurantId, role? }
// Response: 201 { invite, token }
router.post('/invite', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      restaurantId: z.string(),
      role: z.enum(['manager', 'staff']).default('staff'),
    })
    const { email, restaurantId, role } = schema.parse(req.body)

    // User must already be registered
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(404).json({ error: 'User not found. They must register first.' })

    const inviteToken = randomUUID()

    // Check if membership already exists
    const existing = await prisma.restaurantStaff.findUnique({
      where: { userId_restaurantId: { userId: user.id, restaurantId } }
    }).catch(() => null)

    if (existing) {
      const updated = await prisma.restaurantStaff.update({
        where: { id: existing.id },
        data: { role, inviteToken, inviteStatus: 'pending', invitedBy: (req as any).userId },
      })
      return res.status(201).json({ invite: updated, token: inviteToken })
    }

    const invite = await prisma.restaurantStaff.create({
      data: {
        userId: user.id,
        restaurantId,
        role,
        inviteToken,
        inviteStatus: 'pending',
        invitedBy: (req as any).userId,
      },
    })
    res.status(201).json({ invite, token: inviteToken })
  } catch (err) { next(err) }
})

// ─── POST /api/staff/accept-invite — accept a staff invitation ──────────────
// Body: { token }
// Response: 200 { membership }
router.post('/accept-invite', requireAuth, async (req, res, next) => {
  try {
    const { token } = z.object({ token: z.string() }).parse(req.body)
    const staff = await prisma.restaurantStaff.findUnique({ where: { inviteToken: token } })
    if (!staff) return res.status(404).json({ error: 'Invalid invite token' })
    if (staff.inviteStatus !== 'pending') return res.status(409).json({ error: 'Invite already processed' })

    const updated = await prisma.restaurantStaff.update({
      where: { id: staff.id },
      data: { inviteStatus: 'accepted', inviteToken: null },
      include: { restaurant: { select: { name: true } } },
    })
    res.json({ membership: updated })
  } catch (err) { next(err) }
})

// ─── GET /api/staff/restaurant/:restaurantId — list staff for a restaurant ──
// Response: 200 [ { id, role, inviteStatus, user: { id, firstName, lastName, email, avatarUrl } } ]
router.get('/restaurant/:restaurantId', requireAuth, async (req, res, next) => {
  try {
    const staff = await prisma.restaurantStaff.findMany({
      where: { restaurantId: req.params.restaurantId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    })
    res.json(staff)
  } catch (err) { next(err) }
})

// ─── DELETE /api/staff/:id — remove a staff member ──────────────────────────
// Response: 204
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await prisma.restaurantStaff.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) { next(err) }
})

export { router as staffRouter }
