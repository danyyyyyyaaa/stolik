'use client'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

function applyTheme(t: Theme) {
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = t === 'dark' || (t === 'system' && prefersDark)
  if (isDark) {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', 'light')
  }
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('dinto-theme') as Theme | null
    if (saved) {
      setTheme(saved)
      applyTheme(saved)
    } else {
      applyTheme('dark')
    }
  }, [])

  function handleChange(t: Theme) {
    setTheme(t)
    localStorage.setItem('dinto-theme', t)
    applyTheme(t)
  }

  if (compact) {
    const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
    return (
      <button
        onClick={() => handleChange(theme === 'dark' ? 'light' : 'dark')}
        className="p-2 rounded-lg text-sidebar-text hover:text-white hover:bg-sidebar-hover transition-colors"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        <Icon size={16} />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-lg p-1">
      {(['light', 'dark', 'system'] as Theme[]).map(t => {
        const Icon = t === 'light' ? Sun : t === 'dark' ? Moon : Monitor
        return (
          <button
            key={t}
            onClick={() => handleChange(t)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              theme === t
                ? 'bg-surface text-text shadow-sm'
                : 'text-muted hover:text-text'
            }`}
          >
            <Icon size={13} />
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        )
      })}
    </div>
  )
}
