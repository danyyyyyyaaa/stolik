'use client'
import React, { useState, useEffect } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import { useT } from '@/lib/i18n'
import {
  DragDropContext,
  Droppable as DroppableBase,
  Draggable as DraggableBase,
  DropResult,
  type DroppableProvided,
  type DraggableProvided,
  type DraggableStateSnapshot,
} from '@hello-pangea/dnd'
// @ts-ignore — @hello-pangea/dnd types incompatible with @types/react 18.3
const Droppable = DroppableBase as any
// @ts-ignore
const Draggable = DraggableBase as any
import { api } from '@/lib/api'
import { useMyRestaurant } from '@/hooks/useRestaurant'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/shared/LoadingSkeleton'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  allergens: string[]
  isPopular: boolean
  available: boolean
  sortOrder: number
}

interface MenuCategory {
  id: string
  name: string
  sortOrder: number
  items: MenuItem[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLERGENS = [
  'gluten',
  'dairy',
  'nuts',
  'shellfish',
  'eggs',
  'soy',
  'vegan',
  'vegetarian',
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MenuPage() {
  const { restaurant, loading: restaurantLoading } = useMyRestaurant()
  const restaurantId = restaurant?.id ?? null
  const t = useT()

  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Right panel
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [editForm, setEditForm] = useState<Partial<MenuItem>>({})

  // Inline category name editing
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editingCatName, setEditingCatName] = useState('')

  // Inline item add
  const [addingItemCatId, setAddingItemCatId] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')

  // Add category
  const [addCatOpen, setAddCatOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  // Save state
  const [saving, setSaving] = useState(false)

  // ---------------------------------------------------------------------------
  // Load menu
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!restaurantId) return
    setLoading(true)
    api
      .get<{ categories: MenuCategory[] }>(
        `/api/restaurants/${restaurantId}/menu`
      )
      .then((data) => {
        const sorted = (data.categories ?? [])
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((cat) => ({
            ...cat,
            items: [...cat.items].sort((a, b) => a.sortOrder - b.sortOrder),
          }))
        setCategories(sorted)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [restaurantId])

  // Sync edit form when selected item changes
  useEffect(() => {
    if (selectedItem) setEditForm({ ...selectedItem })
  }, [selectedItem])

  // ---------------------------------------------------------------------------
  // Drag and Drop
  // ---------------------------------------------------------------------------

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !restaurantId) return
    const { source, destination, type } = result

    if (type === 'CATEGORY') {
      const newCats = Array.from(categories)
      const [moved] = newCats.splice(source.index, 1)
      newCats.splice(destination.index, 0, moved)
      const updated = newCats.map((c, i) => ({ ...c, sortOrder: i }))
      setCategories(updated)
      api
        .put(`/api/restaurants/${restaurantId}/menu/reorder`, {
          categories: updated.map((c) => ({ id: c.id, sortOrder: c.sortOrder })),
          items: [],
        })
        .catch(console.error)
      return
    }

    // Item moved
    const sourceCat = categories.find(
      (c) => `category-${c.id}` === source.droppableId
    )
    const destCat = categories.find(
      (c) => `category-${c.id}` === destination.droppableId
    )
    if (!sourceCat || !destCat) return

    const newCats = categories.map((cat) => ({ ...cat, items: [...cat.items] }))
    const srcIdx = newCats.findIndex((c) => c.id === sourceCat.id)
    const dstIdx = newCats.findIndex((c) => c.id === destCat.id)
    const [movedItem] = newCats[srcIdx].items.splice(source.index, 1)
    newCats[dstIdx].items.splice(destination.index, 0, movedItem)
    const updatedItems = newCats[dstIdx].items.map((item, i) => ({
      ...item,
      sortOrder: i,
    }))
    newCats[dstIdx].items = updatedItems
    setCategories(newCats)
    api
      .put(`/api/restaurants/${restaurantId}/menu/reorder`, {
        categories: [],
        items: updatedItems.map((item) => ({
          id: item.id,
          sortOrder: item.sortOrder,
        })),
      })
      .catch(console.error)
  }

  // ---------------------------------------------------------------------------
  // Category actions
  // ---------------------------------------------------------------------------

  const handleAddCategory = async () => {
    const name = newCatName.trim()
    if (!name || !restaurantId) return
    try {
      const created = await api.post<MenuCategory>(
        `/api/restaurants/${restaurantId}/menu/categories`,
        { name, sortOrder: categories.length }
      )
      setCategories((prev) => [
        ...prev,
        { ...created, items: created.items ?? [] },
      ])
      setNewCatName('')
      setAddCatOpen(false)
    } catch (err) {
      console.error('Add category failed', err)
    }
  }

  const saveCategoryName = async (catId: string) => {
    const name = editingCatName.trim()
    setEditingCatId(null)
    if (!name) return
    const prev = categories.find((c) => c.id === catId)
    if (!prev || prev.name === name) return
    setCategories((cats) =>
      cats.map((c) => (c.id === catId ? { ...c, name } : c))
    )
    try {
      await api.put(`/api/menu/categories/${catId}`, { name })
    } catch (err) {
      console.error('Rename category failed', err)
      // rollback
      setCategories((cats) =>
        cats.map((c) => (c.id === catId ? { ...c, name: prev.name } : c))
      )
    }
  }

  const handleDeleteCategory = async (catId: string) => {
    if (!window.confirm('Delete this category and all its items?')) return
    const prev = [...categories]
    setCategories((cats) => cats.filter((c) => c.id !== catId))
    try {
      await api.delete(`/api/menu/categories/${catId}`)
    } catch (err) {
      console.error('Delete category failed', err)
      setCategories(prev)
    }
  }

  // ---------------------------------------------------------------------------
  // Item actions
  // ---------------------------------------------------------------------------

  const handleAddItem = async (catId: string) => {
    const name = newItemName.trim()
    const price = parseFloat(newItemPrice)
    if (!name || isNaN(price)) return
    try {
      const created = await api.post<MenuItem>(
        `/api/menu/categories/${catId}/items`,
        {
          name,
          price,
          allergens: [],
          isPopular: false,
          available: true,
          sortOrder:
            (categories.find((c) => c.id === catId)?.items.length ?? 0),
        }
      )
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === catId
            ? { ...cat, items: [...cat.items, created] }
            : cat
        )
      )
      setNewItemName('')
      setNewItemPrice('')
      setAddingItemCatId(null)
    } catch (err) {
      console.error('Add item failed', err)
    }
  }

  const handleDeleteItem = async (itemId: string, catId: string) => {
    const prevCats = categories.map((c) => ({ ...c, items: [...c.items] }))
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === catId
          ? { ...cat, items: cat.items.filter((i) => i.id !== itemId) }
          : cat
      )
    )
    if (selectedItem?.id === itemId) setSelectedItem(null)
    try {
      await api.delete(`/api/menu/items/${itemId}`)
    } catch (err) {
      console.error('Delete item failed', err)
      setCategories(prevCats)
    }
  }

  const handleSaveItem = async () => {
    if (!selectedItem) return
    setSaving(true)
    try {
      const updated = await api.put<MenuItem>(
        `/api/menu/items/${selectedItem.id}`,
        {
          name: editForm.name,
          description: editForm.description,
          price: editForm.price,
          photoUrl: editForm.imageUrl,
          allergens: editForm.allergens,
          isPopular: editForm.isPopular,
          available: editForm.available,
        }
      )
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((item) =>
            item.id === updated.id ? { ...item, ...updated } : item
          ),
        }))
      )
      setSelectedItem(null)
    } catch (err) {
      console.error('Save failed', err)
    } finally {
      setSaving(false)
    }
  }

  const toggleAllergen = (allergen: string) => {
    setEditForm((f) => {
      const current = f.allergens ?? []
      return {
        ...f,
        allergens: current.includes(allergen)
          ? current.filter((a) => a !== allergen)
          : [...current, allergen],
      }
    })
  }

  // ---------------------------------------------------------------------------
  // Photo upload
  // ---------------------------------------------------------------------------

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL ??
          'https://stolik-production.up.railway.app'
        }/api/upload`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      )
      const data = await res.json()
      setEditForm((f) => ({ ...f, imageUrl: data.url }))
    } catch (err) {
      console.error('Upload failed', err)
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const isPageLoading = restaurantLoading || loading

  if (isPageLoading) {
    return (
      <div>
        <PageHeader
          title={t.menu}
          description="Manage your restaurant menu and categories"
        />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-card p-4"
            >
              <Skeleton className="h-5 w-40 mb-4" />
              <div className="space-y-3">
                {[1, 2].map((j) => (
                  <div key={j} className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-btn flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1.5" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Menu"
          description="Manage your restaurant menu and categories"
        />
        <div className="bg-surface border border-border rounded-card p-8 text-center">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div>
      <PageHeader
        title="Menu"
        description="Manage your restaurant menu and categories"
        actions={
          <div className="flex items-center gap-2">
            {addCatOpen ? (
              <>
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCategory()
                    if (e.key === 'Escape') {
                      setAddCatOpen(false)
                      setNewCatName('')
                    }
                  }}
                  placeholder="Category name"
                  autoFocus
                  className="border border-border rounded-btn px-3 py-1.5 text-sm focus:outline-none focus:border-accent bg-surface text-text"
                />
                <button
                  onClick={handleAddCategory}
                  className="bg-accent text-white rounded-btn px-3 py-1.5 text-sm font-medium hover:bg-accent/90 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setAddCatOpen(false)
                    setNewCatName('')
                  }}
                  className="border border-border rounded-btn px-3 py-1.5 text-sm text-muted hover:bg-surface-2 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setAddCatOpen(true)}
                className="bg-accent text-white rounded-btn px-4 py-1.5 text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                + Add Category
              </button>
            )}
          </div>
        }
      />

      {categories.length === 0 ? (
        <div className="bg-surface border border-border rounded-card">
          <EmptyState
            icon={UtensilsCrossed}
            title="No categories yet"
            description="Add a category to get started building your menu."
            action={
              <button
                onClick={() => setAddCatOpen(true)}
                className="bg-accent text-white rounded-btn px-4 py-2 text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                + Add Category
              </button>
            }
          />
        </div>
      ) : (
        <div className="flex gap-6 items-start">
          {/* Left panel */}
          <div className="flex-1 min-w-0">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="categories" type="CATEGORY">
                {(provided: DroppableProvided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-4"
                  >
                    {categories.map((cat, catIdx) => (
                      <Draggable
                        key={cat.id}
                        draggableId={`cat-${cat.id}`}
                        index={catIdx}
                      >
                        {(catProvided: DraggableProvided, catSnapshot: DraggableStateSnapshot) => (
                          <div
                            ref={catProvided.innerRef}
                            {...catProvided.draggableProps}
                            className={`bg-surface border border-border rounded-card transition-shadow ${
                              catSnapshot.isDragging ? 'shadow-lg' : ''
                            }`}
                          >
                            {/* Category header */}
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                              <span
                                {...catProvided.dragHandleProps}
                                className="cursor-grab text-muted select-none text-lg leading-none"
                                title="Drag to reorder"
                              >
                                ⠿
                              </span>

                              {editingCatId === cat.id ? (
                                <input
                                  value={editingCatName}
                                  onChange={(e) =>
                                    setEditingCatName(e.target.value)
                                  }
                                  onBlur={() => saveCategoryName(cat.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter')
                                      saveCategoryName(cat.id)
                                    if (e.key === 'Escape')
                                      setEditingCatId(null)
                                  }}
                                  className="flex-1 text-sm font-semibold border-b border-accent outline-none bg-transparent text-text"
                                  autoFocus
                                />
                              ) : (
                                <span
                                  onDoubleClick={() => {
                                    setEditingCatId(cat.id)
                                    setEditingCatName(cat.name)
                                  }}
                                  className="flex-1 text-sm font-semibold text-text cursor-pointer select-none"
                                  title="Double-click to rename"
                                >
                                  {cat.name}
                                </span>
                              )}

                              <span className="text-xs text-muted">
                                {cat.items.length}{' '}
                                {cat.items.length === 1 ? 'item' : 'items'}
                              </span>
                              <button
                                onClick={() => {
                                  setAddingItemCatId(cat.id)
                                  setNewItemName('')
                                  setNewItemPrice('')
                                }}
                                className="text-xs text-accent hover:underline"
                              >
                                + Add Item
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="text-xs text-red-500 hover:underline"
                              >
                                Delete
                              </button>
                            </div>

                            {/* Items list */}
                            <Droppable
                              droppableId={`category-${cat.id}`}
                              type="ITEM"
                            >
                              {(itemsProvided: DroppableProvided) => (
                                <div
                                  ref={itemsProvided.innerRef}
                                  {...itemsProvided.droppableProps}
                                  className="divide-y divide-border min-h-[40px]"
                                >
                                  {cat.items.map((item, itemIdx) => (
                                    <Draggable
                                      key={item.id}
                                      draggableId={item.id}
                                      index={itemIdx}
                                    >
                                      {(itemProvided: DraggableProvided, itemSnapshot: DraggableStateSnapshot) => (
                                        <div
                                          ref={itemProvided.innerRef}
                                          {...itemProvided.draggableProps}
                                          onClick={() =>
                                            setSelectedItem(item)
                                          }
                                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                                            itemSnapshot.isDragging
                                              ? 'bg-surface-2 shadow-md'
                                              : selectedItem?.id === item.id
                                              ? 'bg-accent/5 border-l-2 border-accent'
                                              : 'hover:bg-surface-2'
                                          }`}
                                        >
                                          <span
                                            {...itemProvided.dragHandleProps}
                                            className="cursor-grab text-muted text-xs select-none"
                                            onClick={(e) =>
                                              e.stopPropagation()
                                            }
                                          >
                                            ⠿
                                          </span>

                                          {/* Thumbnail */}
                                          {item.imageUrl ? (
                                            <img
                                              src={item.imageUrl}
                                              alt={item.name}
                                              className="w-12 h-12 rounded-btn object-cover flex-shrink-0"
                                            />
                                          ) : (
                                            <div className="w-12 h-12 rounded-btn bg-surface-2 flex items-center justify-center flex-shrink-0 text-muted text-xl">
                                              🍽
                                            </div>
                                          )}

                                          {/* Info */}
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-sm font-medium text-text">
                                                {item.name}
                                              </span>
                                              {item.isPopular && (
                                                <span className="text-xs">
                                                  ⭐
                                                </span>
                                              )}
                                              {!item.available && (
                                                <span className="text-xs text-muted">
                                                  (Unavailable)
                                                </span>
                                              )}
                                            </div>
                                            {item.description && (
                                              <p className="text-xs text-muted truncate">
                                                {item.description}
                                              </p>
                                            )}
                                            {item.allergens.length > 0 && (
                                              <div className="flex gap-1 mt-0.5 flex-wrap">
                                                {item.allergens.map((a) => (
                                                  <span
                                                    key={a}
                                                    className="text-[10px] px-1.5 py-0.5 bg-amber/20 text-amber-700 rounded-chip"
                                                  >
                                                    {a}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>

                                          {/* Price */}
                                          <span className="text-sm font-semibold text-accent flex-shrink-0">
                                            {item.price.toFixed(2)} zł
                                          </span>

                                          {/* Delete */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDeleteItem(item.id, cat.id)
                                            }}
                                            className="text-xs text-red-400 hover:text-red-600 flex-shrink-0 transition-colors"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {itemsProvided.placeholder as React.ReactNode}

                                  {cat.items.length === 0 &&
                                    addingItemCatId !== cat.id && (
                                      <p className="px-4 py-3 text-xs text-muted italic">
                                        No items yet. Click &ldquo;+ Add
                                        Item&rdquo; above.
                                      </p>
                                    )}

                                  {/* Inline add item row */}
                                  {addingItemCatId === cat.id && (
                                    <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-2 border-t border-border">
                                      <input
                                        value={newItemName}
                                        onChange={(e) =>
                                          setNewItemName(e.target.value)
                                        }
                                        placeholder="Item name"
                                        autoFocus
                                        className="flex-1 min-w-0 border border-border rounded-btn px-2.5 py-1.5 text-sm focus:outline-none focus:border-accent bg-surface text-text"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter')
                                            handleAddItem(cat.id)
                                          if (e.key === 'Escape')
                                            setAddingItemCatId(null)
                                        }}
                                      />
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={newItemPrice}
                                        onChange={(e) =>
                                          setNewItemPrice(e.target.value)
                                        }
                                        placeholder="Price"
                                        className="w-24 border border-border rounded-btn px-2.5 py-1.5 text-sm focus:outline-none focus:border-accent bg-surface text-text"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter')
                                            handleAddItem(cat.id)
                                          if (e.key === 'Escape')
                                            setAddingItemCatId(null)
                                        }}
                                      />
                                      <span className="text-xs text-muted">
                                        zł
                                      </span>
                                      <button
                                        onClick={() => handleAddItem(cat.id)}
                                        className="bg-accent text-white rounded-btn px-3 py-1.5 text-xs font-medium hover:bg-accent/90 transition-colors"
                                      >
                                        Add
                                      </button>
                                      <button
                                        onClick={() =>
                                          setAddingItemCatId(null)
                                        }
                                        className="border border-border rounded-btn px-3 py-1.5 text-xs text-muted hover:bg-surface transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder as React.ReactNode}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          {/* Right panel */}
          <div className="w-80 flex-shrink-0">
            {selectedItem ? (
              <div className="bg-surface border border-border rounded-card p-4 sticky top-6">
                <h3 className="font-semibold text-text mb-4">Edit Item</h3>

                {/* Photo upload */}
                <div className="mb-4">
                  <label className="block text-xs text-muted mb-1">
                    Photo
                  </label>
                  {editForm.imageUrl ? (
                    <div className="relative">
                      <img
                        src={editForm.imageUrl}
                        className="w-full h-32 object-cover rounded-btn mb-1"
                        alt=""
                      />
                      <button
                        onClick={() =>
                          setEditForm((f) => ({ ...f, imageUrl: '' }))
                        }
                        className="absolute top-1 right-1 bg-white rounded-full w-5 h-5 text-xs text-red-500 flex items-center justify-center shadow"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-btn cursor-pointer hover:border-accent transition-colors">
                      <span className="text-2xl mb-1">📷</span>
                      <span className="text-xs text-muted">Upload photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  )}
                </div>

                {/* Name */}
                <input
                  value={editForm.name ?? ''}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Item name"
                  className="w-full border border-border rounded-btn px-3 py-2 text-sm mb-3 focus:outline-none focus:border-accent bg-surface text-text"
                />

                {/* Description */}
                <textarea
                  value={editForm.description ?? ''}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Description"
                  rows={2}
                  className="w-full border border-border rounded-btn px-3 py-2 text-sm mb-3 focus:outline-none focus:border-accent resize-none bg-surface text-text"
                />

                {/* Price */}
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.price ?? 0}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        price: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="flex-1 border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-accent bg-surface text-text"
                  />
                  <span className="text-sm text-muted">zł</span>
                </div>

                {/* Allergens */}
                <div className="mb-3">
                  <label className="block text-xs text-muted mb-1.5">
                    Allergens
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {ALLERGENS.map((a) => (
                      <button
                        key={a}
                        onClick={() => toggleAllergen(a)}
                        className={`text-xs px-2 py-1 rounded-chip border transition-colors ${
                          (editForm.allergens ?? []).includes(a)
                            ? 'bg-amber/20 border-amber text-amber-700'
                            : 'border-border text-muted hover:border-accent'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Popular toggle */}
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-text">Popular ⭐</label>
                  <button
                    onClick={() =>
                      setEditForm((f) => ({
                        ...f,
                        isPopular: !f.isPopular,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      editForm.isPopular ? 'bg-accent' : 'bg-surface-2'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        editForm.isPopular ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Available toggle */}
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm text-text">Available</label>
                  <button
                    onClick={() =>
                      setEditForm((f) => ({
                        ...f,
                        available: !f.available,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      editForm.available ? 'bg-accent' : 'bg-surface-2'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        editForm.available ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Save / Cancel */}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveItem}
                    disabled={saving}
                    className="flex-1 bg-accent text-white rounded-btn py-2 text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="px-4 border border-border rounded-btn text-sm text-muted hover:bg-surface-2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-card p-6 sticky top-6 flex flex-col items-center justify-center text-center min-h-[200px]">
                <div className="text-3xl mb-3">🍽</div>
                <p className="text-sm text-muted">
                  Select an item to edit its details
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
