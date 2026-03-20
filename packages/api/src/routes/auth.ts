import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const router = Router()
const prisma = new PrismaClient()

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
  try {
    const data = registerSchema.parse(req.body)
    const passwordHash = await bcrypt.hash(data.password, 10)

    const { password: _pw, ...userData } = data
    const user = await prisma.user.create({
      data: { ...userData, passwordHash }
    })

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' })
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } })
  } catch (err) {
    res.status(400).json({ error: 'Registration failed', details: err })
  }
})

// ─── LOGIN ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body

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
