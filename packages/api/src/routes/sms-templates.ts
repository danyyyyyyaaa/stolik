import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

const DEFAULT_TEMPLATES: Record<string, Record<string, string>> = {
  booking_confirmed: {
    en: 'Hi {guestName}! Your booking at {restaurant} is confirmed: {date} at {time}, {partySize} guests. See you! — Dinto',
    pl: 'Czesc {guestName}! Rezerwacja w {restaurant} potwierdzona: {date} o {time}, {partySize} os. Do zobaczenia! — Dinto',
    ru: 'Privet {guestName}! Bronirovanie v {restaurant} podtverzhdeno: {date} v {time}, {partySize} chel. Do vstrechi! — Dinto',
    uk: 'Pryvit {guestName}! Bronyuvannya v {restaurant} pidtverdzheno: {date} o {time}, {partySize} os. Do zustrichi! — Dinto',
  },
  booking_reminder: {
    en: 'Reminder: Today at {time} you have a reservation at {restaurant} for {partySize} guests. See you!',
    pl: 'Przypomnienie: Dzis o {time} masz rezerwacje w {restaurant} na {partySize} os. Do zobaczenia!',
    ru: 'Napominanie: Segodnya v {time} u vas bronirovanie v {restaurant} na {partySize} chel. Do vstrechi!',
    uk: 'Nagaduvannya: Sogodni o {time} u vas bronyuvannya v {restaurant} na {partySize} os. Do zustrichi!',
  },
  booking_cancelled: {
    en: 'Your booking at {restaurant} ({date}, {time}) has been cancelled. Book again at dinto.pl',
    pl: 'Rezerwacja w {restaurant} ({date}, {time}) zostala anulowana. Zarezerwuj ponownie na dinto.pl',
    ru: 'Bronirovanie v {restaurant} ({date}, {time}) otmeneno. Zabroniruyte snova na dinto.pl',
    uk: 'Bronyuvannya v {restaurant} ({date}, {time}) skasovano. Zabronyuyte znovu na dinto.pl',
  },
  booking_manual: {
    en: 'Hi {guestName}! A booking has been created for you at {restaurant}: {date} at {time}, {partySize} guests. Ref: {bookingCode}',
    pl: 'Czesc {guestName}! Stworzono rezerwacje w {restaurant}: {date} o {time}, {partySize} os. Kod: {bookingCode}',
    ru: 'Privet {guestName}! Sozdano bronirovanie v {restaurant}: {date} v {time}, {partySize} chel. Kod: {bookingCode}',
    uk: 'Pryvit {guestName}! Stvoreno bronyuvannya v {restaurant}: {date} o {time}, {partySize} os. Kod: {bookingCode}',
  },
}

async function ownerOf(restaurantId: string, userId: string) {
  return prisma.restaurant.findFirst({ where: { id: restaurantId, ownerId: userId } })
}

// GET /api/sms-templates/:restaurantId — get all templates (with defaults filled in)
router.get('/:restaurantId', requireAuth, async (req, res) => {
  try {
    const { restaurantId } = req.params
    const userId = (req as any).userId

    const restaurant = await ownerOf(restaurantId, userId)
    if (!restaurant) return res.status(404).json({ error: 'Not found' })

    const saved = await prisma.smsTemplate.findMany({ where: { restaurantId } })

    // Build complete map with defaults
    const result: Record<string, Record<string, any>> = {}
    for (const [type, langs] of Object.entries(DEFAULT_TEMPLATES)) {
      result[type] = {}
      for (const [lang, defaultText] of Object.entries(langs)) {
        const custom = saved.find(t => t.type === type && t.language === lang)
        result[type][lang] = {
          template: custom?.template ?? defaultText,
          isCustom: !!custom,
          isActive: custom?.isActive ?? true,
        }
      }
    }

    res.json(result)
  } catch (err) {
    console.error('[SmsTemplates] GET error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/sms-templates/:restaurantId — upsert a template
const updateSchema = z.object({
  type:     z.string(),
  language: z.string(),
  template: z.string().min(1),
  isActive: z.boolean().optional(),
})

router.put('/:restaurantId', requireAuth, async (req, res) => {
  try {
    const { restaurantId } = req.params
    const userId = (req as any).userId

    const restaurant = await ownerOf(restaurantId, userId)
    if (!restaurant) return res.status(404).json({ error: 'Not found' })

    const data = updateSchema.parse(req.body)
    const template = await prisma.smsTemplate.upsert({
      where: { restaurantId_type_language: { restaurantId, type: data.type, language: data.language } },
      create: { restaurantId, ...data },
      update: { template: data.template, isActive: data.isActive ?? true },
    })
    res.json(template)
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid data', details: err.errors })
    }
    console.error('[SmsTemplates] PUT error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/sms-templates/:restaurantId — reset to default
router.delete('/:restaurantId', requireAuth, async (req, res) => {
  try {
    const { restaurantId } = req.params
    const userId = (req as any).userId
    const { type, language } = req.query

    const restaurant = await ownerOf(restaurantId, userId)
    if (!restaurant) return res.status(404).json({ error: 'Not found' })

    await prisma.smsTemplate.deleteMany({
      where: {
        restaurantId,
        ...(type ? { type: type as string } : {}),
        ...(language ? { language: language as string } : {}),
      },
    })
    res.status(204).send()
  } catch (err) {
    console.error('[SmsTemplates] DELETE error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as smsTemplatesRouter }
