'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

export default function VerifyEmailPage() {
  const params = useSearchParams()
  const router = useRouter()
  const token  = params.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('No token provided'); return }

    fetch(`${API}/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      redirect: 'manual',
    })
      .then(res => {
        if (res.status === 200 || res.status === 302 || res.type === 'opaqueredirect') {
          // Update local user cache
          try {
            const raw = localStorage.getItem('stolik_user')
            if (raw) {
              const user = JSON.parse(raw)
              user.isVerified = true
              localStorage.setItem('stolik_user', JSON.stringify(user))
            }
          } catch {}
          setStatus('success')
          setTimeout(() => router.push('/dashboard'), 2000)
        } else {
          return res.json().then(d => {
            if (res.status === 410) setStatus('expired')
            else setStatus('error')
            setMessage(d?.error ?? 'Verification failed')
          })
        }
      })
      .catch(() => { setStatus('error'); setMessage('Network error') })
  }, [token, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="bg-surface border border-border rounded-2xl p-8 w-full max-w-sm text-center shadow-xl">
        {status === 'loading' && (
          <>
            <Loader size={40} className="mx-auto mb-4 text-accent animate-spin" />
            <p className="text-text font-semibold">Verifying…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={40} className="mx-auto mb-4 text-green-400" />
            <p className="text-text font-semibold text-lg">Email confirmed!</p>
            <p className="text-muted text-sm mt-2">Redirecting to dashboard…</p>
          </>
        )}
        {(status === 'error' || status === 'expired') && (
          <>
            <XCircle size={40} className="mx-auto mb-4 text-red-400" />
            <p className="text-text font-semibold text-lg">
              {status === 'expired' ? 'Link expired' : 'Invalid link'}
            </p>
            <p className="text-muted text-sm mt-2">{message}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-6 w-full py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-colors"
            >
              Go to dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}
