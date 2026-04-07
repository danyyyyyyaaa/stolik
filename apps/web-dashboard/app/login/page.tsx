'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Eye, EyeOff } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

export default function LoginPage() {
  const router = useRouter()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res  = await fetch(`${API_URL}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) { setError(data.error || data.message || 'Login failed'); return }

      // Store with both key formats for compatibility
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('stolik_token', data.token)
      localStorage.setItem('stolik_user', JSON.stringify(data.user))

      const role = data.user?.role
      if (role === 'admin' || role === 'super_admin' || role === 'ADMIN') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-btn mb-4" style={{ background: '#1b7a4a' }}>
            <Building2 size={22} color="white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            Din<em>to</em>
          </h1>
          <p className="mt-1.5 text-sm text-muted">Restaurant management panel</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-card p-8 shadow-md">
          <h2 className="text-base font-bold text-text mb-6">Sign in</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@restaurant.com"
                className="w-full bg-surface-2 border border-border rounded-btn px-3.5 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-2 border border-border rounded-btn px-3.5 py-2.5 pr-10 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end mt-1 mb-3">
              <Link href="/forgot-password" className="text-xs text-accent hover:underline">Forgot password?</Link>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-error bg-error/10 border border-error/20 rounded-btn px-4 py-2.5">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-btn px-4 py-2.5 text-sm transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-accent hover:text-accent-hover font-semibold transition-colors">
              Register
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted/50">
          &copy; {new Date().getFullYear()} Dinto.{' '}
          <Link href="/terms" className="hover:text-muted/80 transition-colors">Terms</Link>
          {' · '}
          <Link href="/privacy" className="hover:text-muted/80 transition-colors">Privacy</Link>
        </p>
      </div>
    </div>
  )
}
