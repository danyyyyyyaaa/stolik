import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'

import { setIo } from './lib/socket'
import { authRouter } from './routes/auth'
import { restaurantsRouter } from './routes/restaurants'
import { bookingsRouter } from './routes/bookings'
import { tablesRouter } from './routes/tables'
import { guestsRouter } from './routes/guests'
import { widgetRouter } from './routes/widget'
import { subscriptionsRouter } from './routes/subscriptions'
import { uploadRouter } from './routes/upload'
import { adminRouter } from './routes/admin'
import { menuRouter } from './routes/menu'
import { pushRouter } from './routes/push'
import { citiesRouter } from './routes/cities'
import { dashboardRouter } from './routes/dashboard'
import { staffRouter } from './routes/staff'
import { billingRouter } from './routes/billing'
import { reviewsRouter } from './routes/reviews'
import { googleReviewsRouter } from './routes/google-reviews'
import { integrationsRouter } from './routes/integrations'
import { smsTemplatesRouter } from './routes/sms-templates'
import { favoritesRouter } from './routes/favorites'
import { waitlistRouter } from './routes/waitlist'
import { dealsRouter } from './routes/deals'
import { referralsRouter } from './routes/referrals'
import { promotionsRouter } from './routes/promotions'
import { eventsRouter } from './routes/events'
import { messagesRouter } from './routes/messages'
import { publicRouter } from './routes/public'
import { boostsRouter } from './routes/boosts'
import { webhooksRouter } from './routes/webhooks'
import { startCronJobs } from './cron'

dotenv.config()

const app = express()
app.set('trust proxy', 1)
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*' }
})

app.use(helmet())

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(globalLimiter)

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://stolik-dashboard.vercel.app',
    'https://stolik-web-dashboard.vercel.app',
    /\.vercel\.app$/,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Stripe webhooks MUST be registered before express.json()
// so the raw body is preserved for signature verification
app.use('/api/subscriptions', subscriptionsRouter)
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }), billingRouter)
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter)

app.use(express.json())

// Routes
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
app.use('/api/auth/refresh', authLimiter)
app.use('/api/auth', authRouter)
app.use('/api/restaurants', restaurantsRouter)
app.use('/api/bookings', bookingsRouter)
app.use('/api/tables', tablesRouter)
app.use('/api/guests', guestsRouter)
app.use('/api/widget', widgetRouter)  // public — no auth needed
app.use('/api/upload', uploadRouter)
app.use('/api/admin', adminRouter)
app.use('/api/menu', menuRouter)
app.use('/api/push', pushRouter)
app.use('/api/cities', citiesRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/staff', staffRouter)
app.use('/api/billing', billingRouter)
app.use('/api/reviews', reviewsRouter)
app.use('/api/restaurants', googleReviewsRouter)  // /:id/google-place, /:id/google-sync, /:id/reviews-combined
app.use('/api/integrations', integrationsRouter)   // /:restaurantId, /poster/test, /api-keys/:restaurantId, /terminal/:restaurantId/generate-qr
app.use('/api/sms-templates', smsTemplatesRouter)  // /:restaurantId
app.use('/api/favorites', favoritesRouter)
app.use('/api/restaurants/:id/waitlist', waitlistRouter)
app.use('/api', dealsRouter)                            // /api/deals + /api/restaurants/:id/deals
app.use('/api/referrals', referralsRouter)
app.use('/api/restaurants', promotionsRouter)           // /api/restaurants/:id/promotions
app.use('/api/restaurants/:id/boosts', boostsRouter)   // /api/restaurants/:id/boosts
app.use('/api/restaurants/:id/events', eventsRouter)   // /api/restaurants/:id/events
app.use('/api/bookings/:bookingId/messages', messagesRouter) // /api/bookings/:bookingId/messages
app.use('/api/public', publicRouter)                        // public read-only endpoints

// Serve local uploads as static files (fallback when R2 is not configured)
app.use('/uploads', express.static('uploads'))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '0.1.0' })
})

// Realtime — socket.io для обновления слотов в реальном времени
setIo(io)

io.on('connection', (socket) => {
  socket.on('join_restaurant', (restaurantId: string) => {
    socket.join(`restaurant:${restaurantId}`)
  })
})

export { io }

// Start cron jobs
startCronJobs()

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Stolik API running on http://localhost:${PORT}`)
})
