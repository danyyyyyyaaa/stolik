/// <reference types="multer" />
import { Router, Request } from 'express'
import multer from 'multer'
import jwt from 'jsonwebtoken'
import path from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile?: boolean) => void) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
})

// ─── POST /api/upload ─────────────────────────────────────────────────────────
router.post('/', upload.single('file'), async (req, res) => {
  // Require auth
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    jwt.verify(authHeader.slice(7), process.env.JWT_SECRET!)
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  // Try R2 upload if configured
  const hasR2 = process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME
  if (hasR2) {
    try {
      const { uploadFile } = await import('../lib/r2')
      const url = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype)
      return res.json({ url })
    } catch (err) {
      console.error('R2 upload error, falling back to local:', err)
    }
  }

  // Fallback: save to local ./uploads/ directory
  try {
    const uploadsDir = path.resolve(process.cwd(), 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    const ext = path.extname(req.file.originalname) || '.bin'
    const filename = `${randomUUID()}${ext}`
    const filePath = path.join(uploadsDir, filename)

    fs.writeFileSync(filePath, req.file.buffer)

    const url = `/uploads/${filename}`
    res.json({ url })
  } catch (err) {
    console.error('Local upload error:', err)
    res.status(500).json({ error: 'Upload failed' })
  }
})

export { router as uploadRouter }
