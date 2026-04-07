'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, BookOpen, Users, UtensilsCrossed, ArrowRight, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import { useMyRestaurant } from '@/hooks/useRestaurant'

interface SearchResult {
  id: string
  type: 'booking' | 'guest' | 'menu'
  title: string
  subtitle?: string
  href: string
}

const RECENT_KEY = 'dinto_recent_searches'

function getRecent(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveRecent(query: string) {
  const prev = getRecent().filter(s => s !== query)
  localStorage.setItem(RECENT_KEY, JSON.stringify([query, ...prev].slice(0, 5)))
}

const TYPE_ICON = {
  booking: BookOpen,
  guest: Users,
  menu: UtensilsCrossed,
}

const TYPE_LABEL = {
  booking: 'Booking',
  guest: 'Guest',
  menu: 'Menu',
}

interface Props {
  open: boolean
  onClose: () => void
}

export function GlobalSearch({ open, onClose }: Props) {
  const router = useRouter()
  const { restaurant } = useMyRestaurant()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const [recent, setRecent] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelected(0)
      setRecent(getRecent())
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (!q.trim() || !restaurant?.id) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await api.get<{ results: SearchResult[] }>('/api/search', {
        q,
        restaurantId: restaurant.id,
      })
      setResults(res.results ?? [])
    } catch {
      // Fallback: empty results
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [restaurant?.id])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  function navigate(result: SearchResult) {
    saveRecent(query)
    setRecent(getRecent())
    router.push(result.href)
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const items = results.length > 0 ? results : []
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && items[selected]) {
      navigate(items[selected])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!open) return null

  const showRecent = !query && recent.length > 0
  const showEmpty = query.length > 0 && !loading && results.length === 0

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-start justify-center pt-[15vh] px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface border border-border rounded-xl w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={18} className="text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search bookings, guests, menu items…"
            className="flex-1 bg-transparent text-text placeholder:text-muted text-sm focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted hover:text-text">
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 bg-surface-2 border border-border rounded text-[10px] text-muted font-mono">
            ESC
          </kbd>
        </div>

        {/* Results / recent */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {showRecent && !loading && (
            <div className="py-2">
              <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Recent</p>
              {recent.map(r => (
                <button
                  key={r}
                  onClick={() => setQuery(r)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-surface-2 text-left transition-colors"
                >
                  <Clock size={14} className="text-muted flex-shrink-0" />
                  <span className="text-sm text-text">{r}</span>
                </button>
              ))}
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              {results.map((result, idx) => {
                const Icon = TYPE_ICON[result.type]
                return (
                  <button
                    key={result.id}
                    onClick={() => navigate(result)}
                    className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                      idx === selected ? 'bg-surface-2' : 'hover:bg-surface-2'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-btn bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={14} className="text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-[11px] text-muted truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted bg-surface-2 border border-border px-1.5 py-0.5 rounded flex-shrink-0">
                      {TYPE_LABEL[result.type]}
                    </span>
                    <ArrowRight size={12} className="text-muted flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          )}

          {showEmpty && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search size={24} className="text-muted mb-2" />
              <p className="text-sm text-muted">No results for &ldquo;{query}&rdquo;</p>
            </div>
          )}

          {!query && !showRecent && (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-muted">Start typing to search across bookings, guests, and menu items</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-4">
          <span className="flex items-center gap-1 text-[10px] text-muted">
            <kbd className="px-1 py-0.5 bg-surface-2 border border-border rounded font-mono">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted">
            <kbd className="px-1 py-0.5 bg-surface-2 border border-border rounded font-mono">↵</kbd> open
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted">
            <kbd className="px-1 py-0.5 bg-surface-2 border border-border rounded font-mono">ESC</kbd> close
          </span>
        </div>
      </div>
    </div>
  )
}
