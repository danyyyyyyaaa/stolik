'use client'

import { useEffect, useState } from 'react'
import { MailWarning } from 'lucide-react'
import { useLang } from '@/lib/i18n'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

export default function VerifyEmailBanner() {
  const { t }               = useLang()
  const [show,    setShow]   = useState(false)
  const [email,   setEmail]  = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]   = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('stolik_user')
      if (!raw) return
      const user = JSON.parse(raw)
      if (user?.isVerified === false) {
        setShow(true)
        setEmail(user.email ?? '')
      }
    } catch {}
  }, [])

  async function handleResend() {
    setLoading(true)
    try {
      const tok = localStorage.getItem('stolik_token')
      await fetch(`${API}/api/auth/resend-verification`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${tok}` },
      })
      setSent(true)
    } catch {
      // ignore — best effort
    } finally {
      setLoading(false)
    }
  }

  if (!show) return null

  return (
    <div className="w-full flex items-center gap-3 px-4 py-2.5 bg-yellow-500/10 border-b border-yellow-500/20 text-sm">
      <MailWarning size={15} className="shrink-0 text-yellow-500" />
      <span className="text-yellow-200/80 flex-1 min-w-0 truncate">
        {t.verifyEmailBanner} <span className="font-medium">{email}</span>
      </span>
      {sent ? (
        <span className="text-yellow-400 text-xs font-medium shrink-0">{t.verifyEmailSent}</span>
      ) : (
        <button
          onClick={handleResend}
          disabled={loading}
          className="text-yellow-400 font-semibold hover:text-yellow-300 transition-colors shrink-0 disabled:opacity-50"
        >
          {loading ? '…' : t.verifyEmailResend}
        </button>
      )}
    </div>
  )
}
