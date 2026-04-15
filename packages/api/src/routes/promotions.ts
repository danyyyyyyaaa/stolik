import { Router } from 'express'
import { PrismaClient, PromotionStatus, PromotionType } from '@prisma/client'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { getIo } from '../lib/socket'
import { uploadFile as uploadToR2 } from '../lib/r2'
import multer from 'multer'

const router = Router()
const prisma = new PrismaClient()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } })

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function ownerOf(restaurantId: string, userId: string) {
  return prisma.restaurant.findFirst({ where: { id: restaurantId, ownerId: userId } })
}

function emitPromotionUpdated(restaurantId: string) {
  getIo()?.to(`restaurant:${restaurantId}`).emit('promotion:updated', { restaurantId })
}

// ─── Validation ───────────────────────────────────────────────────────────────

const promotionSchema = z.object({
  title:           z.string().min(1).max(120),
  titleEn:         z.string().max(120).optional(),
  titlePl:         z.string().max(120).optional(),
  titleUk:         z.string().max(120).optional(),
  description:     z.string().min(1),
  descriptionEn:   z.string().optional(),
  descriptionPl:   z.string().optional(),
  descriptionUk:   z.string().optional(),
  type:            z.nativeEnum(PromotionType),
  discountPercent: z.number().int().min(1).max(100).optional().nullable(),
  discountAmount:  z.number().positive().optional().nullable(),
  startDate:       z.string().datetime(),
  endDate:         z.string().datetime().optional().nullable(),
  recurringDays:   z.array(z.number().int().min(0).max(6)).optional(),
  timeStart:       z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  timeEnd:         z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  conditions:      z.string().optional().nullable(),
  promoCode:       z.string().max(30).optional().nullable(),
  isHighlighted:   z.boolean().optional(),
  status:          z.nativeEnum(PromotionStatus).optional(),
})

const patchStatusSchema = z.object({
  status: z.nativeEnum(PromotionStatus),
})

// ─── GET /api/restaurants/:id/promotions ─────────────────────────────────────

router.get('/:id/promotions', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId as string
    const r = await ownerOf(req.params.id, userId)
    if (!r) return res.status(403).json({ error: 'Forbidden' })

    const { status } = req.query
    const promotions = await prisma.promotion.findMany({
      where: {
        restaurantId: req.params.id,
        ...(status ? { status: status as PromotionStatus } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ promotions })
  } catch (err) { next(err) }
})

// ─── POST /api/restaurants/:id/promotions ────────────────────────────────────

router.post('/:id/promotions', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId as string
    const r = await ownerOf(req.params.id, userId)
    if (!r) return res.status(403).json({ error: 'Forbidden' })

    // Free plan: max 2 active promotions
    if (r.plan === 'free') {
      const activeCount = await prisma.promotion.count({
        where: { restaurantId: req.params.id, status: 'ACTIVE' },
      })
      if (activeCount >= 2) {
        return res.status(403).json({ error: 'Free plan limited to 2 active promotions' })
      }
    }

    const parsed = promotionSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    const data = parsed.data
    const promotion = await prisma.promotion.create({
      data: {
        restaurantId:    req.params.id,
        title:           data.title,
        titleEn:         data.titleEn,
        titlePl:         data.titlePl,
        titleUk:         data.titleUk,
        description:     data.description,
        descriptionEn:   data.descriptionEn,
        descriptionPl:   data.descriptionPl,
        descriptionUk:   data.descriptionUk,
        type:            data.type,
        discountPercent: data.discountPercent ?? null,
        discountAmount:  data.discountAmount ?? null,
        startDate:       new Date(data.startDate),
        endDate:         data.endDate ? new Date(data.endDate) : null,
        recurringDays:   data.recurringDays ?? [],
        timeStart:       data.timeStart ?? null,
        timeEnd:         data.timeEnd ?? null,
        conditions:      data.conditions ?? null,
        promoCode:       data.promoCode ?? null,
        isHighlighted:   data.isHighlighted ?? false,
        status:          data.status ?? 'DRAFT',
      },
    })
    emitPromotionUpdated(req.params.id)
    res.status(201).json(promotion)
  } catch (err) { next(err) }
})

// ─── PUT /api/restaurants/:id/promotions/:pid ─────────────────────────────────

router.put('/:id/promotions/:pid', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId as string
    const r = await ownerOf(req.params.id, userId)
    if (!r) return res.status(403).json({ error: 'Forbidden' })

    const existing = await prisma.promotion.findFirst({
      where: { id: req.params.pid, restaurantId: req.params.id },
    })
    if (!existing) return res.status(404).json({ error: 'Promotion not found' })

    const parsed = promotionSchema.partial().safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    const data = parsed.data
    const updated = await prisma.promotion.update({
      where: { id: req.params.pid },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate:   data.endDate   ? new Date(data.endDate)   : data.endDate === null ? null : undefined,
      },
    })
    emitPromotionUpdated(req.params.id)
    res.json(updated)
  } catch (err) { next(err) }
})

// ─── DELETE /api/restaurants/:id/promotions/:pid ──────────────────────────────

router.delete('/:id/promotions/:pid', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId as string
    const r = await ownerOf(req.params.id, userId)
    if (!r) return res.status(403).json({ error: 'Forbidden' })

    const existing = await prisma.promotion.findFirst({
      where: { id: req.params.pid, restaurantId: req.params.id },
    })
    if (!existing) return res.status(404).json({ error: 'Promotion not found' })

    await prisma.promotion.delete({ where: { id: req.params.pid } })
    emitPromotionUpdated(req.params.id)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ─── PATCH /api/restaurants/:id/promotions/:pid/status ───────────────────────

router.patch('/:id/promotions/:pid/status', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId as string
    const r = await ownerOf(req.params.id, userId)
    if (!r) return res.status(403).json({ error: 'Forbidden' })

    const parsed = patchStatusSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    const existing = await prisma.promotion.findFirst({
      where: { id: req.params.pid, restaurantId: req.params.id },
    })
    if (!existing) return res.status(404).json({ error: 'Promotion not found' })

    const updated = await prisma.promotion.update({
      where: { id: req.params.pid },
      data:  { status: parsed.data.status },
    })
    emitPromotionUpdated(req.params.id)
    res.json(updated)
  } catch (err) { next(err) }
})

// ─── GET /api/restaurants/:id/promotions/:pid/stats ──────────────────────────

router.get('/:id/promotions/:pid/stats', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId as string
    const r = await ownerOf(req.params.id, userId)
    if (!r) return res.status(403).json({ error: 'Forbidden' })

    const promo = await prisma.promotion.findFirst({
      where: { id: req.params.pid, restaurantId: req.params.id },
      select: { viewCount: true, clickCount: true, bookingCount: true },
    })
    if (!promo) return res.status(404).json({ error: 'Promotion not found' })

    const ctr = promo.viewCount > 0
      ? Math.round((promo.clickCount / promo.viewCount) * 100) / 100
      : 0

    res.json({ ...promo, ctr })
  } catch (err) { next(err) }
})

// ─── POST /api/restaurants/:id/promotions/:pid/image ─────────────────────────

router.post('/:id/promotions/:pid/image', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    const userId = (req as any).userId as string
    const r = await ownerOf(req.params.id, userId)
    if (!r) return res.status(403).json({ error: 'Forbidden' })

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    const url = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype)
    await prisma.promotion.update({
      where: { id: req.params.pid },
      data:  { imageUrl: url },
    })
    emitPromotionUpdated(req.params.id)
    res.json({ imageUrl: url })
  } catch (err) { next(err) }
})

export { router as promotionsRouter }
