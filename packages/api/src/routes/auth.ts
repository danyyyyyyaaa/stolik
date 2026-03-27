import { Router } from 'express'
import { PrismaClient, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const router = Router()
const prisma = new PrismaClient()

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(['guest', 'owner']).default('guest'),
})

// ─── REGISTER ────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  // Validate input first so we can return clear field errors
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    return res.status(400).json({ error: first?.message ?? 'Invalid data' })
  }

  const { password, ...userData } = parsed.data
  try {
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { ...userData, passwordHash },
    })
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' })
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }
    console.error('Register error:', err)
    res.status(500).json({ error: 'Registration failed — please try again' })
  }
})

// ─── LOGIN ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' })
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName } })
})

export { router as authRouter }
