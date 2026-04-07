'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Utensils } from 'lucide-react'
import clsx from 'clsx'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

const inputCls =
  'w-full bg-surface-2 border border-border rounded-lg px-3.5 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent transition-colors'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [agreed,    setAgreed]    = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) { setError('You must agree to the Terms of Service and Privacy Policy.'); return }
    setError(''); setLoading(true)
    try {
      const res  = await fetch(`${API}/api/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password, firstName, lastName, role: 'owner' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || data.message || 'Registration failed')
        return
      }
      localStorage.setItem('stolik_token', data.token)
      localStorage.setItem('stolik_user',  JSON.stringify(data.user))
      router.push('/onboarding')
    } catch {
      setError('Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-bg">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/15 border border-accent/25 rounded-2xl mb-4">
            <Utensils size={22} className="text-accent" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Dinto</h1>
          <p className="mt-1.5 text-sm text-muted">Restaurant registration</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-base font-bold text-text mb-5">Account details</h2>

            <div className="grid grid-cols-2 gap-4">
              <Field label="First name">
                <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)}
                  placeholder="John" className={inputCls} />
              </Field>
              <Field label="Last name">
                <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)}
                  placeholder="Smith" className={inputCls} />
              </Field>
            </div>

            <Field label="Email">
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@restaurant.com" className={inputCls} />
            </Field>

            <Field label="Password">
              <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters" className={inputCls} />
            </Field>

            {/* Terms agreement */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div
                onClick={() => setAgreed(v => !v)}
                className={clsx(
                  'mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors',
                  agreed ? 'bg-accent border-accent' : 'border-border group-hover:border-accent/60'
                )}
              >
                {agreed && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-xs text-muted leading-relaxed">
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="text-accent hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" className="text-accent hover:underline">Privacy Policy</Link>
              </span>
            </label>

            {error && (
              <div className="text-sm text-red-400 bg-red-400/8 border border-red-400/20 rounded-lg px-4 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !agreed}
              className="w-full mt-2 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              {loading ? 'Registering…' : 'Next →'}
            </button>

            <p className="text-center text-xs text-muted pt-1">
              Already have an account?{' '}
              <Link href="/login" className="text-accent hover:text-accent-hover font-semibold transition-colors">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
