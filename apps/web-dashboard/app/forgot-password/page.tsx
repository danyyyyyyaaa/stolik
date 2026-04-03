'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true); setError('')
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 10000)
      await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
        signal: ctrl.signal,
      }).finally(() => clearTimeout(t))
      setDone(true)
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-8 shadow-xl">
        {done ? (
          <div className="text-center">
            <CheckCircle size={40} className="mx-auto mb-4 text-green-400" />
            <h1 className="text-xl font-bold text-text mb-2">Check your email</h1>
            <p className="text-sm text-muted mb-6">If that email exists, we&apos;ve sent a reset link. Check your inbox and spam folder.</p>
            <Link href="/login" className="text-sm text-accent hover:underline">← Back to login</Link>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-accent/10 border border-accent/20 rounded-lg"><Mail size={18} className="text-accent" /></div>
              <div>
                <h1 className="text-lg font-bold text-text">Forgot password?</h1>
                <p className="text-xs text-muted">Enter your email to get a reset link</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text placeholder-muted focus:outline-none focus:border-accent/50 transition-colors" />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60">
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
            <div className="mt-5 text-center">
              <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted hover:text-text transition-colors">
                <ArrowLeft size={14} />Back to login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
