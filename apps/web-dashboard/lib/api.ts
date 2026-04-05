const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token') || localStorage.getItem('stolik_token')
}

type FetchOptions = RequestInit & { params?: Record<string, string | number | undefined> }

export async function apiFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...init } = options

  let url = `${API_BASE}${path}`
  if (params) {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) search.set(k, String(v)) })
    const qs = search.toString()
    if (qs) url += `?${qs}`
  }

  const token = getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers ?? {}),
  }

  const res = await fetch(url, { ...init, headers })

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('stolik_token')
      localStorage.removeItem('user')
      localStorage.removeItem('stolik_user')
      window.location.href = '/login'
    }
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  if (res.status === 204) return {} as T
  return res.json()
}

export const api = {
  get:    <T>(path: string, params?: Record<string, string | number | undefined>) =>
            apiFetch<T>(path, { method: 'GET', params }),
  post:   <T>(path: string, body?: unknown) =>
            apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put:    <T>(path: string, body?: unknown) =>
            apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch:  <T>(path: string, body?: unknown) =>
            apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
            apiFetch<T>(path, { method: 'DELETE' }),
}
