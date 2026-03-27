import { Router } from 'express'
import multer from 'multer'
import jwt from 'jsonwebtoken'
import { uploadFile } from '../lib/r2'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only jpeg, png, and webp images are allowed'))
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

  try {
    const url = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype)
    res.json({ url })
  } catch (err) {
    console.error('R2 upload error:', err)
    res.status(500).json({ error: 'Upload failed' })
  }
})

export { router as uploadRouter }
