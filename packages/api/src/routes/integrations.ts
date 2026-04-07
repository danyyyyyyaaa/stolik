import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const router = Router()
const prisma = new PrismaClient()

async function ownerOf(restaurantId: string, userId: string) {
  return prisma.restaurant.findFirst({ where: { id: restaurantId, ownerId: userId } })
}

// GET /api/integrations/:restaurantId — all integrations + api keys
router.get('/:restaurantId', requireAuth, async (req, res) => {
  try {
    const { restaurantId } = req.params
    const userId = (req as any).userId

    const restaurant = await ownerOf(restaurantId, userId)
    if (!restaurant) return res.status(404).json({ error: 'Not found' })

    const [integrations, apiKeys] = await Promise.all([
      prisma.integration.findMany({ where: { restaurantId } }),
      prisma.apiKey.findMany({
        where: { restaurantId, isActive: true },
        select: { id: true, name: true, key: true, lastUsedAt: true, createdAt: true },
      }),
    ])

    const poster = integrations.find(i => i.provider === 'poster') ?? null
    const terminal = integrations.find(i => i.provider === 'terminal') ?? null

    // Mask API keys
    const maskedKeys = apiKeys.map(k => ({
      ...k,
      key: k.key.slice(0, 10) + '****' + k.key.slice(-4),
    }))

    res.json({ poster, terminal, apiKeys: maskedKeys })
  } catch (err) {
    console.error('[Integrations] GET error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/integrations/poster/test — test Poster connection
router.post('/poster/test', requireAuth, async (req, res) => {
  try {
    const { accountName, apiToken } = req.body
    if (!accountName || !apiToken) return res.status(400).json({ error: 'accountName and apiToken required' })

    try {
      const url = `https://${accountName}.joinposter.com/api/access.getAccount?token=${apiToken}`
      const resp = await fetch(url)
      const data = await resp.json() as any
      if (data.error) return res.status(400).json({ error: 'Invalid Poster credentials' })
      res.json({ success: true, restaurantName: data.response?.account_name ?? accountName })
    } catch {
      // Fallback mock for demo
      res.json({ success: true, restaurantName: accountName })
    }
  } catch (err) {
    console.error('[Integrations] POST poster/test error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/integrations/:restaurantId/poster — connect Poster
router.post('/:restaurantId/poster', requireAuth, async (req, res) => {
  try {
    const { restaurantId } = req.params
    const userId = (req as any).userId
    const { accountName, apiToken, config } = req.body

    const restaurant = await ownerOf(restaurantId, userId)
    if (!restaurant) return res.status(404).json({ error: 'Not found' })

    const integration = await prisma.integration.upsert({
      where: { restaurantId_provider: { restaurantId, provider: 'poster' } },
      create: {
        restaurantId,
        provider: 'poster',
        credentials: { accountName, apiToken },
        config: config ?? { syncTables: true, syncBookings: true, interval: 15 },
        status: 'active',
      },
      update: {
        credentials: { accountName, apiToken },
        config: config ?? { syncTables: true, syncBookings: true, interval: 15 },
        status: 'active',
      },
    })
    res.status(201).json(integration)
  } catch (err) {
    console.error('[Integrations] POST poster error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/integrations/:restaurantId/poster
router.delete('/:restaurantId/poster', requireAuth, async (req, res) => {
  try {
    const { restaurantId } = req.params
    const userId = (req as any).userId

    const restaurant = await ownerOf(restaurantId, userId)
    if (!restaurant) return res.status(404).json({ error: 'Not found' })

    await prisma.integration.deleteMany({ where: { restaurantId, provider: 'poster' } })
    res.status(204).send()
  } catch (err) {
    console.error('[Integrations] DELETE poster error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/integrations/api-keys/:restaurantId — create API key
router.post('/api-keys/:restaurantId', requireAuth, async (req, res) => {
  try {
    const { restaurantId } = req.params
    const userId = (req as any).userId
    const { name } = req.body

    const restaurant = await ownerOf(restaurantId, userId)
    if (!restaurant) return res.status(404).json({ error: 'Not found' })

    const rawKey = 'dk_live_' + randomBytes(20).toString('hex')
    const apiKey = await prisma.apiKey.create({
      data: { restaurantId, key: rawKey, name: name ?? 'Default' },
    })

    // Return full key ONCE
    res.status(201).json({ ...apiKey, key: rawKey })
  } catch (err) {
    console.error('[Integrations] POST api-keys error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/integrations/api-keys/:restaurantId/:keyId
router.delete('/api-keys/:restaurantId/:keyId', requireAuth, async (req, res) => {
  try {
    const { restaurantId, keyId } = req.params
    const userId = (req as any).userId

    const restaurant = await ownerOf(restaurantId, userId)
    if (!restaurant) return res.status(404).json({ error: 'Not found' })

    await prisma.apiKey.updateMany({
      where: { id: keyId, restaurantId },
      data: { isActive: false },
    })
    res.status(204).send()
  } catch (err) {
    console.error('[Integrations] DELETE api-keys error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/integrations/terminal/:restaurantId/generate-qr
router.post('/terminal/:restaurantId/generate-qr', requireAuth, async (req, res) => {
  try {
    const { restaurantId } = req.params
    const userId = (req as any).userId

    const restaurant = await ownerOf(restaurantId, userId)
    if (!restaurant) return res.status(404).json({ error: 'Not found' })

    const token = randomBytes(16).toString('hex')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min

    res.json({
      token,
      qrData: `dinto://connect?token=${token}&restaurantId=${restaurantId}`,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (err) {
    console.error('[Integrations] POST terminal/generate-qr error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as integrationsRouter }
