'use client'
import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

const LANGUAGES = [
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'pl', label: 'PL', flag: '🇵🇱' },
  { code: 'ru', label: 'RU', flag: '🇷🇺' },
  { code: 'uk', label: 'UK', flag: '🇺🇦' },
] as const

export function LanguageSwitcher({ light = false }: { light?: boolean }) {
  const [lang, setLang] = useState('en')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('dinto-language') ?? 'en'
    setLang(saved)
  }, [])

  function handleChange(code: string) {
    setLang(code)
    setOpen(false)
    localStorage.setItem('dinto-language', code)
    window.dispatchEvent(new CustomEvent('dinto-lang-change', { detail: code }))
  }

  const current = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0]

  const btnCls = light
    ? 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-text hover:bg-surface-2 text-sm transition-colors'
    : 'flex items-center gap-1.5 px-2 py-1.5 rounded-btn text-sidebar-text hover:text-white hover:bg-sidebar-hover text-xs transition-colors'

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className={btnCls}>
        <span>{current.flag}</span>
        <span className="font-medium">{current.label}</span>
        <ChevronDown size={12} className="text-muted" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-1 left-0 w-32 bg-surface border border-border rounded-xl shadow-xl z-20 py-1">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => handleChange(l.code)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  lang === l.code
                    ? 'text-accent bg-accent/10'
                    : 'text-text hover:bg-surface-2'
                }`}
              >
                <span>{l.flag}</span>
                <span className="font-medium">{l.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
