'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, X, Check, ToggleLeft, ToggleRight, ChevronDown,
} from 'lucide-react'
import clsx from 'clsx'
import { useT } from '@/lib/i18n'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

// ─── Types ────────────────────────────────────────────────────────────────────

type MenuItem = {
  id: string
  categoryId: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  available: boolean
  sortOrder: number
}

type MenuCategory = {
  id: string
  restaurantId: string
  name: string
  sortOrder: number
  items: MenuItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders() {
  const tok = localStorage.getItem('stolik_token')
  return { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }
}

function activeRestaurantId(): string | null {
  try {
    const stored = localStorage.getItem('stolik_active_restaurant')
    return stored ? JSON.parse(stored)?.id : null
  } catch {
    return null
  }
}

// ─── Category Modal ───────────────────────────────────────────────────────────

function CategoryModal({
  restaurantId,
  existing,
  onClose,
  onSaved,
}: {
  restaurantId: string
  existing: MenuCategory | null
  onClose: () => void
  onSaved: () => void
}) {
  const t = useT()
  const [name, setName] = useState(existing?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = existing
        ? await fetch(`${API}/api/menu/categories/${existing.id}`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ name: name.trim() }),
          })
        : await fetch(`${API}/api/menu/categories`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ restaurantId, name: name.trim() }),
          })
      if (!res.ok) throw new Error()
      onSaved()
    } catch {
      setError(t.serverError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-text">
            {existing ? t.editCategory : t.addCategory}
          </h2>
          <button onClick={onClose} className="p-1.5 text-muted hover:text-text rounded-lg hover:bg-surface-2 transition-colors">
            <X size={16} />
          </button>
        </div>

        <label className="block text-xs font-medium text-muted mb-1.5">{t.categoryNameLabel}</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          className="w-full px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
          placeholder={t.categoryNameLabel}
        />

        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-muted border border-border hover:bg-surface-2 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={save}
            disabled={saving || !name.trim()}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Item Modal ───────────────────────────────────────────────────────────────

function ItemModal({
  categories,
  existing,
  defaultCategoryId,
  onClose,
  onSaved,
}: {
  categories: MenuCategory[]
  existing: MenuItem | null
  defaultCategoryId: string
  onClose: () => void
  onSaved: () => void
}) {
  const t = useT()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name,        setName]        = useState(existing?.name ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [price,       setPrice]       = useState(existing ? String(existing.price) : '')
  const [categoryId,  setCategoryId]  = useState(existing?.categoryId ?? defaultCategoryId)
  const [available,   setAvailable]   = useState(existing?.available ?? true)
  const [imageUrl,    setImageUrl]    = useState(existing?.imageUrl ?? '')
  const [uploading,   setUploading]   = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  async function uploadPhoto(file: File) {
    setUploading(true)
    try {
      const tok = localStorage.getItem('stolik_token')
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}` },
        body: fd,
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setImageUrl(data.url)
    } catch {
      setError(t.serverError)
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    if (!name.trim() || !price) return
    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum <= 0) return
    setSaving(true)
    setError('')
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        price: priceNum,
        categoryId,
        available,
        imageUrl: imageUrl || undefined,
      }
      const res = existing
        ? await fetch(`${API}/api/menu/items/${existing.id}`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify(body),
          })
        : await fetch(`${API}/api/menu/items`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(body),
          })
      if (!res.ok) throw new Error()
      onSaved()
    } catch {
      setError(t.serverError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-text">
            {existing ? t.editItem : t.addItem}
          </h2>
          <button onClick={onClose} className="p-1.5 text-muted hover:text-text rounded-lg hover:bg-surface-2 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">{t.itemNameLabel}</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">{t.itemDescLabel}</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent resize-none"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">{t.itemPriceLabel}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">{t.itemCategoryLabel}</label>
            <div className="relative">
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-text focus:outline-none focus:border-accent appearance-none pr-8"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            </div>
          </div>

          {/* Available toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted">{t.itemAvailableLabel}</label>
            <button
              type="button"
              onClick={() => setAvailable(v => !v)}
              className={clsx('transition-colors', available ? 'text-accent' : 'text-muted')}
            >
              {available ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>

          {/* Photo */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">{t.photoLabel}</label>
            {imageUrl && (
              <img
                src={imageUrl}
                alt=""
                className="w-full h-32 object-cover rounded-lg mb-2 border border-border"
              />
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              ref={fileRef}
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) uploadPhoto(f)
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full px-3 py-2 rounded-lg text-sm border border-dashed border-border text-muted hover:text-text hover:border-accent transition-colors disabled:opacity-50"
            >
              {uploading ? t.uploadingPhoto : (imageUrl ? t.changePhoto : t.uploadPhoto)}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-muted border border-border hover:bg-surface-2 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={save}
            disabled={saving || !name.trim() || !price}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MenuPage() {
  const t = useT()
  const router = useRouter()

  const [categories,  setCategories]  = useState<MenuCategory[]>([])
  const [loading,     setLoading]     = useState(true)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)

  // Modals
  const [catModal,    setCatModal]    = useState<{ open: boolean; existing: MenuCategory | null }>({ open: false, existing: null })
  const [itemModal,   setItemModal]   = useState<{ open: boolean; existing: MenuItem | null; categoryId: string }>({ open: false, existing: null, categoryId: '' })

  useEffect(() => {
    const tok = localStorage.getItem('stolik_token')
    if (!tok) { router.push('/login'); return }
    const rid = activeRestaurantId()
    if (!rid) { setLoading(false); return }
    setRestaurantId(rid)
    fetchMenu(rid)
  }, [])

  async function fetchMenu(rid: string) {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/menu/${rid}`)
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  function reload() {
    if (restaurantId) fetchMenu(restaurantId)
  }

  async function deleteCategory(cat: MenuCategory) {
    if (!confirm(t.confirmDeleteCategory)) return
    await fetch(`${API}/api/menu/categories/${cat.id}`, { method: 'DELETE', headers: authHeaders() })
    reload()
  }

  async function deleteItem(item: MenuItem) {
    if (!confirm(t.confirmDeleteItem)) return
    await fetch(`${API}/api/menu/items/${item.id}`, { method: 'DELETE', headers: authHeaders() })
    reload()
  }

  async function toggleAvailable(item: MenuItem) {
    await fetch(`${API}/api/menu/items/${item.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ available: !item.available }),
    })
    reload()
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted text-sm">{t.loading}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text">{t.menu}</h1>
        {restaurantId && (
          <button
            onClick={() => setCatModal({ open: true, existing: null })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <Plus size={15} />
            {t.addCategory}
          </button>
        )}
      </div>

      {!restaurantId ? (
        <p className="text-muted text-sm">{t.noCategories}</p>
      ) : categories.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted text-sm">{t.noCategories}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map(cat => (
            <div key={cat.id} className="bg-surface border border-border rounded-2xl overflow-hidden">
              {/* Category header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-2">
                <span className="text-xs font-bold tracking-widest uppercase text-text">{cat.name}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setItemModal({ open: true, existing: null, categoryId: cat.id })}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-accent border border-accent/30 hover:bg-accent/8 transition-colors"
                  >
                    <Plus size={12} />
                    {t.addItem}
                  </button>
                  <button
                    onClick={() => setCatModal({ open: true, existing: cat })}
                    className="p-1.5 text-muted hover:text-text hover:bg-border/40 rounded-lg transition-colors"
                    title={t.editCategory}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteCategory(cat)}
                    className="p-1.5 text-muted hover:text-red-400 hover:bg-red-400/8 rounded-lg transition-colors"
                    title={t.deleteCategory}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Items */}
              {cat.items.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <button
                    onClick={() => setItemModal({ open: true, existing: null, categoryId: cat.id })}
                    className="text-sm text-muted hover:text-accent transition-colors"
                  >
                    {t.addItem}
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {cat.items.map(item => (
                    <div
                      key={item.id}
                      className={clsx(
                        'flex items-start gap-4 px-5 py-4 transition-colors',
                        !item.available && 'opacity-50'
                      )}
                    >
                      {/* Photo */}
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-14 h-14 rounded-xl object-cover border border-border shrink-0"
                        />
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-text">{item.name}</span>
                          {!item.available && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-muted border border-border">
                              {t.unavailable}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted mt-0.5 line-clamp-2">{item.description}</p>
                        )}
                        <p className="text-sm font-bold text-accent mt-1">
                          {item.price.toFixed(2)} zł
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => toggleAvailable(item)}
                          className={clsx(
                            'p-1.5 rounded-lg transition-colors',
                            item.available
                              ? 'text-accent hover:bg-accent/8'
                              : 'text-muted hover:bg-surface-2'
                          )}
                          title={item.available ? t.unavailable : t.available}
                        >
                          {item.available ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button
                          onClick={() => setItemModal({ open: true, existing: item, categoryId: item.categoryId })}
                          className="p-1.5 text-muted hover:text-text hover:bg-border/40 rounded-lg transition-colors"
                          title={t.editItem}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteItem(item)}
                          className="p-1.5 text-muted hover:text-red-400 hover:bg-red-400/8 rounded-lg transition-colors"
                          title={t.deleteItem}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Category modal */}
      {catModal.open && restaurantId && (
        <CategoryModal
          restaurantId={restaurantId}
          existing={catModal.existing}
          onClose={() => setCatModal({ open: false, existing: null })}
          onSaved={() => { setCatModal({ open: false, existing: null }); reload() }}
        />
      )}

      {/* Item modal */}
      {itemModal.open && (
        <ItemModal
          categories={categories}
          existing={itemModal.existing}
          defaultCategoryId={itemModal.categoryId}
          onClose={() => setItemModal({ open: false, existing: null, categoryId: '' })}
          onSaved={() => { setItemModal({ open: false, existing: null, categoryId: '' }); reload() }}
        />
      )}
    </div>
  )
}
