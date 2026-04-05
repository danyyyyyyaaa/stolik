import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'

const prisma = new PrismaClient()
const router = Router()

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createCategorySchema = z.object({
  restaurantId: z.string().min(1),
  name:         z.string().min(1),
  sortOrder:    z.number().int().optional(),
})

const updateCategorySchema = z.object({
  name:      z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
})

const createItemSchema = z.object({
  categoryId:  z.string().min(1),
  name:        z.string().min(1),
  description: z.string().optional(),
  price:       z.number().positive(),
  imageUrl:    z.string().url().optional(),
  photoUrl:    z.string().url().optional(),
  available:   z.boolean().optional(),
  sortOrder:   z.number().int().optional(),
  allergens:   z.array(z.string()).optional(),
  isPopular:   z.boolean().optional(),
})

const updateItemSchema = z.object({
  name:        z.string().min(1).optional(),
  description: z.string().optional(),
  price:       z.number().positive().optional(),
  imageUrl:    z.string().url().nullable().optional(),
  photoUrl:    z.string().url().nullable().optional(),
  available:   z.boolean().optional(),
  sortOrder:   z.number().int().optional(),
  categoryId:  z.string().min(1).optional(),
  allergens:   z.array(z.string()).optional(),
  isPopular:   z.boolean().optional(),
})

const reorderSchema = z.object({
  categories: z.array(z.object({ id: z.string(), sortOrder: z.number().int() })).optional(),
  items: z.array(z.object({ id: z.string(), sortOrder: z.number().int() })).optional(),
})

// ─── Helper: verify the authenticated user owns the restaurant ────────────────

async function ownerOf(restaurantId: string, userId: string) {
  return prisma.restaurant.findFirst({
    where: { id: restaurantId, ownerId: userId },
  })
}

// ─── GET /api/menu/:restaurantId — public ─────────────────────────────────────

router.get('/:restaurantId', async (req, res) => {
  const { restaurantId } = req.params
  try {
    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })
    res.json({ categories })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch menu' })
  }
})

// ─── POST /api/menu/categories — create category ─────────────────────────────

router.post('/categories', requireAuth, async (req, res) => {
  const userId = (req as any).userId
  const parsed = createCategorySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { restaurantId, name, sortOrder } = parsed.data
  const restaurant = await ownerOf(restaurantId, userId)
  if (!restaurant) return res.status(403).json({ error: 'Access denied' })

  try {
    const category = await prisma.menuCategory.create({
      data: { restaurantId, name, sortOrder: sortOrder ?? 0 },
    })
    res.status(201).json(category)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create category' })
  }
})

// ─── PATCH /api/menu/categories/:id ──────────────────────────────────────────

router.patch('/categories/:id', requireAuth, async (req, res) => {
  const userId = (req as any).userId
  const { id } = req.params
  const parsed = updateCategorySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const category = await prisma.menuCategory.findUnique({ where: { id } })
  if (!category) return res.status(404).json({ error: 'Category not found' })

  const restaurant = await ownerOf(category.restaurantId, userId)
  if (!restaurant) return res.status(403).json({ error: 'Access denied' })

  try {
    const updated = await prisma.menuCategory.update({ where: { id }, data: parsed.data })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update category' })
  }
})

// ─── DELETE /api/menu/categories/:id ─────────────────────────────────────────

router.delete('/categories/:id', requireAuth, async (req, res) => {
  const userId = (req as any).userId
  const { id } = req.params

  const category = await prisma.menuCategory.findUnique({ where: { id } })
  if (!category) return res.status(404).json({ error: 'Category not found' })

  const restaurant = await ownerOf(category.restaurantId, userId)
  if (!restaurant) return res.status(403).json({ error: 'Access denied' })

  try {
    await prisma.menuItem.deleteMany({ where: { categoryId: id } })
    await prisma.menuCategory.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete category' })
  }
})

// ─── POST /api/menu/items — create item ──────────────────────────────────────

router.post('/items', requireAuth, async (req, res) => {
  const userId = (req as any).userId
  const parsed = createItemSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const category = await prisma.menuCategory.findUnique({ where: { id: parsed.data.categoryId } })
  if (!category) return res.status(404).json({ error: 'Category not found' })

  const restaurant = await ownerOf(category.restaurantId, userId)
  if (!restaurant) return res.status(403).json({ error: 'Access denied' })

  try {
    const item = await prisma.menuItem.create({
      data: {
        categoryId:  parsed.data.categoryId,
        name:        parsed.data.name,
        description: parsed.data.description,
        price:       parsed.data.price,
        imageUrl:    parsed.data.photoUrl ?? parsed.data.imageUrl,
        available:   parsed.data.available ?? true,
        sortOrder:   parsed.data.sortOrder ?? 0,
        allergens:   parsed.data.allergens ?? [],
        isPopular:   parsed.data.isPopular ?? false,
      },
    })
    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create item' })
  }
})

// ─── PATCH /api/menu/items/:id ────────────────────────────────────────────────

router.patch('/items/:id', requireAuth, async (req, res) => {
  const userId = (req as any).userId
  const { id } = req.params
  const parsed = updateItemSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const item = await prisma.menuItem.findUnique({ where: { id }, include: { category: true } })
  if (!item) return res.status(404).json({ error: 'Item not found' })

  const restaurant = await ownerOf(item.category.restaurantId, userId)
  if (!restaurant) return res.status(403).json({ error: 'Access denied' })

  try {
    const { photoUrl, ...restData } = parsed.data
    const updateData: any = { ...restData }
    if (photoUrl !== undefined) updateData.imageUrl = photoUrl
    const updated = await prisma.menuItem.update({ where: { id }, data: updateData })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update item' })
  }
})

// ─── DELETE /api/menu/items/:id ───────────────────────────────────────────────

router.delete('/items/:id', requireAuth, async (req, res) => {
  const userId = (req as any).userId
  const { id } = req.params

  const item = await prisma.menuItem.findUnique({ where: { id }, include: { category: true } })
  if (!item) return res.status(404).json({ error: 'Item not found' })

  const restaurant = await ownerOf(item.category.restaurantId, userId)
  if (!restaurant) return res.status(403).json({ error: 'Access denied' })

  try {
    await prisma.menuItem.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete item' })
  }
})

// ─── PUT /api/menu/:restaurantId/reorder — reorder categories and items ──────

router.put('/:restaurantId/reorder', requireAuth, async (req, res) => {
  const userId = (req as any).userId
  const { restaurantId } = req.params

  const restaurant = await ownerOf(restaurantId, userId)
  if (!restaurant) return res.status(403).json({ error: 'Access denied' })

  const parsed = reorderSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  try {
    await prisma.$transaction(async (tx) => {
      if (parsed.data.categories) {
        for (const cat of parsed.data.categories) {
          await tx.menuCategory.update({ where: { id: cat.id }, data: { sortOrder: cat.sortOrder } })
        }
      }
      if (parsed.data.items) {
        for (const item of parsed.data.items) {
          await tx.menuItem.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })
        }
      }
    })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to reorder' })
  }
})

export { router as menuRouter }
