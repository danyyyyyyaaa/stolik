import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import path from 'path'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME!
const PUBLIC_URL = process.env.R2_PUBLIC_URL! // e.g. https://pub-xxx.r2.dev

export async function uploadFile(
  buffer:      Buffer,
  originalName: string,
  mimetype:    string,
): Promise<string> {
  const ext = path.extname(originalName) || '.bin'
  const key = `uploads/${randomUUID()}${ext}`

  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: mimetype,
  }))

  return `${PUBLIC_URL.replace(/\/$/, '')}/${key}`
}
