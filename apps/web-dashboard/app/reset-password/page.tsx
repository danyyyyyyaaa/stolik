'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, CheckCircle, XCircle } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

function ResetForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'expired'>('idle')
  const [error, setError] = useState('')

  useEffect(() => { if (!token) { setStatus('error'); setError('No reset token in URL') } }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError('')
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 10000)
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
        signal: ctrl.signal,
      }).finally(() => clearTimeout(t))
      if (res.ok) { setStatus('success'); setTimeout(() => router.push('/login'), 2500) }
      else {
        const d = await res.json()
        setStatus(res.status === 410 ? 'expired' : 'error')
        setError(d.error ?? 'Reset failed')
      }
    } catch { setStatus('error'); setError('Network error') }
    finally { setLoading(false) }
  }

  if (status === 'success') return (
    <div className="text-center">
      <CheckCircle size={40} className="mx-auto mb-4 text-green-400" />
      <h1 className="text-xl font-bold text-text mb-2">Password changed!</h1>
      <p className="text-sm text-muted">Redirecting to login…</p>
    </div>
  )

  if (status === 'error' || status === 'expired') return (
    <div className="text-center">
      <XCircle size={40} className="mx-auto mb-4 text-red-400" />
      <h1 className="text-xl font-bold text-text mb-2">{status === 'expired' ? 'Link expired' : 'Invalid link'}</h1>
      <p className="text-sm text-muted mb-6">{error}</p>
      <Link href="/forgot-password" className="text-sm text-accent hover:underline">Request a new link</Link>
    </div>
  )

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-accent/10 border border-accent/20 rounded-lg"><Lock size={18} className="text-accent" /></div>
        <div>
          <h1 className="text-lg font-bold text-text">New password</h1>
          <p className="text-xs text-muted">Choose a secure password</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">New password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" required
            className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text placeholder-muted focus:outline-none focus:border-accent/50 transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">Confirm password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required
            className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text placeholder-muted focus:outline-none focus:border-accent/50 transition-colors" />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60">
          {loading ? 'Saving…' : 'Change Password'}
        </button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-8 shadow-xl">
        <Suspense fallback={<p className="text-muted text-sm text-center">Loading…</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  )
}
