import client from './client'
import type { User } from '../store/useAppStore'

export interface AuthResponse {
  token: string
  user:  User
}

const SLOW_CONNECTION_MSG = 'Connection is slow, please try again'

function isRetryable(err: unknown): boolean {
  return err instanceof Error && err.message === SLOW_CONNECTION_MSG
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (isRetryable(err)) return await fn()
    throw err
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return withRetry(async () => {
    const { data } = await client.post<AuthResponse>('/api/auth/login', { email, password })
    return data
  })
}

export async function register(
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  referralCode?: string,
  phone?: string,
): Promise<AuthResponse> {
  return withRetry(async () => {
    const { data } = await client.post<AuthResponse>('/api/auth/register', {
      firstName, lastName, email, password,
      ...(phone        ? { phone }        : {}),
      ...(referralCode ? { referralCode } : {}),
    })
    return data
  })
}

export async function getMe(): Promise<User> {
  const { data } = await client.get<User>('/api/auth/me')
  return data
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await client.patch('/api/auth/change-password', { currentPassword, newPassword })
}

export async function deleteAccount(): Promise<void> {
  await client.delete('/api/auth/account')
}

export async function updateProfile(data: {
  firstName?: string
  lastName?: string
  phone?: string
  avatarUrl?: string | null
  dateOfBirth?: string | null
}): Promise<User> {
  const { data: user } = await client.patch<User>('/api/auth/profile', data)
  return user
}

export async function uploadAvatar(uri: string): Promise<string> {
  const filename = uri.split('/').pop() ?? 'avatar.jpg'
  const ext      = filename.split('.').pop()?.toLowerCase() ?? 'jpg'
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'

  const formData = new FormData()
  formData.append('file', { uri, name: filename, type: mimeType } as any)

  const { data } = await client.post<{ url: string }>('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.url
}
