'use client'

import React, { useState, useEffect } from 'react'
import { api } from '@/lib/api'

const DAYS_LIST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const STEP_LABELS = ['Basic Info', 'Hours', 'Photos', 'Tables', 'Review & Publish']

interface DayHours {
  open: boolean
  openTime: string
  closeTime: string
}

interface TableRow {
  id: string
  name: string
  minGuests: number
  maxGuests: number
  zone: string
}

interface BasicInfo {
  name: string
  description: string
  cuisine: string
  priceRange: string
  address: string
  district: string
  phone: string
  email: string
  website: string
}

const defaultBasicInfo: BasicInfo = {
  name: '',
  description: '',
  cuisine: '',
  priceRange: '$$',
  address: '',
  district: '',
  phone: '',
  email: '',
  website: '',
}

const defaultHours: DayHours[] = DAYS_LIST.map(() => ({
  open: true,
  openTime: '12:00',
  closeTime: '22:00',
}))

const inputCls =
  'w-full border border-border rounded-btn px-3 py-2 text-sm text-text bg-surface placeholder-muted focus:outline-none focus:border-accent transition-colors'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)

  // Step 1: Basic info
  const [basicInfo, setBasicInfo] = useState<BasicInfo>(defaultBasicInfo)

  // Step 2: Hours
  const [hours, setHours] = useState<DayHours[]>(defaultHours)
  const [slotDuration, setSlotDuration] = useState(60)
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(30)

  // Step 3: Photos
  const [coverPhoto, setCoverPhoto] = useState('')
  const [logo, setLogo] = useState('')
  const [gallery, setGallery] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  // Step 4: Tables
  const [tables, setTables] = useState<TableRow[]>([
    { id: '1', name: 'Table 1', minGuests: 1, maxGuests: 4, zone: 'indoor' },
  ])

  // Persist to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dinto_onboarding')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.step) setStep(parsed.step)
        if (parsed.basicInfo) setBasicInfo(parsed.basicInfo)
        if (parsed.hours) setHours(parsed.hours)
        if (parsed.slotDuration) setSlotDuration(parsed.slotDuration)
        if (parsed.maxAdvanceDays) setMaxAdvanceDays(parsed.maxAdvanceDays)
        if (parsed.coverPhoto) setCoverPhoto(parsed.coverPhoto)
        if (parsed.logo) setLogo(parsed.logo)
        if (parsed.gallery) setGallery(parsed.gallery)
        if (parsed.tables) setTables(parsed.tables)
        if (parsed.restaurantId) setRestaurantId(parsed.restaurantId)
      } catch {
        // ignore parse errors
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      'dinto_onboarding',
      JSON.stringify({
        step,
        basicInfo,
        hours,
        slotDuration,
        maxAdvanceDays,
        coverPhoto,
        logo,
        gallery,
        tables,
        restaurantId,
      })
    )
  }, [step, basicInfo, hours, slotDuration, maxAdvanceDays, coverPhoto, logo, gallery, tables, restaurantId])

  // ── Step handlers ────────────────────────────────────────────────────────────

  const handleStep1Next = async () => {
    if (!basicInfo.name.trim()) {
      alert('Restaurant name is required')
      return
    }
    setSaving(true)
    try {
      if (!restaurantId) {
        const res = await api.post<{ id: string }>('/api/restaurants', {
          ...basicInfo,
          city: 'Warszawa',
          isPublished: false,
          status: 'draft',
        })
        setRestaurantId(res.id)
      } else {
        await api.put(`/api/restaurants/${restaurantId}`, basicInfo)
      }
      setStep(2)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleStep2Next = async () => {
    if (restaurantId) {
      await api
        .put(`/api/restaurants/${restaurantId}`, {
          openingHours: JSON.stringify(hours),
          slotDuration,
          maxAdvanceDays,
        })
        .catch(console.error)
    }
    setStep(3)
  }

  const handleStep3Next = () => setStep(4)

  const handleStep4Next = () => setStep(5)

  const handleNext = () => {
    if (step === 1) handleStep1Next()
    else if (step === 2) handleStep2Next()
    else if (step === 3) handleStep3Next()
    else if (step === 4) handleStep4Next()
  }

  const handlePublish = async () => {
    setSaving(true)
    try {
      if (restaurantId) {
        for (const table of tables) {
          await api
            .post(`/api/restaurants/${restaurantId}/tables`, {
              name: table.name,
              minCapacity: table.minGuests,
              maxCapacity: table.maxGuests,
              zone: table.zone,
            })
            .catch(() => {})
        }
        await api.put(`/api/restaurants/${restaurantId}`, {
          coverImage: coverPhoto,
          isPublished: true,
          status: 'active',
        })
      }
      localStorage.removeItem('dinto_onboarding')
      window.location.href = '/dashboard'
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // ── Photo upload ─────────────────────────────────────────────────────────────

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'cover' | 'logo' | 'gallery'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('token') ?? localStorage.getItem('stolik_token') : null
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'https://stolik-production.up.railway.app'}/api/upload`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      )
      const data = await res.json()
      if (type === 'cover') setCoverPhoto(data.url)
      else if (type === 'logo') setLogo(data.url)
      else setGallery(prev => [...prev, data.url])
    } catch (err) {
      console.error('Upload failed', err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // ── Table helpers ────────────────────────────────────────────────────────────

  const updateTable = (index: number, field: keyof TableRow, value: string | number) => {
    setTables(prev =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    )
  }

  // ── Checklist (step 5) ───────────────────────────────────────────────────────

  const checklist = [
    { label: 'Basic info complete', done: !!basicInfo.name },
    { label: 'Working hours set', done: hours.some(h => h.open) },
    { label: 'Cover photo uploaded', done: !!coverPhoto },
    { label: 'Tables configured', done: tables.length > 0 },
  ]

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-start py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-text">
            Din<em>to</em>
          </span>
          <p className="text-sm text-muted mt-1">Set up your restaurant</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map(s => (
            <React.Fragment key={s}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  s < step
                    ? 'bg-accent text-white'
                    : s === step
                    ? 'bg-accent text-white ring-4 ring-accent/20'
                    : 'bg-surface-2 text-muted border border-border'
                }`}
              >
                {s < step ? '✓' : s}
              </div>
              {s < 5 && (
                <div
                  className={`flex-1 max-w-12 h-0.5 transition-colors ${
                    s < step ? 'bg-accent' : 'bg-border'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <p className="text-center text-sm text-muted mb-8">{STEP_LABELS[step - 1]}</p>

        {/* Card */}
        <div className="bg-surface border border-border rounded-card p-6 shadow-card">
          {/* ── Step 1: Basic Info ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Restaurant name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={basicInfo.name}
                  onChange={e => setBasicInfo(b => ({ ...b, name: e.target.value }))}
                  placeholder="e.g. Trattoria Roma"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Description</label>
                <textarea
                  value={basicInfo.description}
                  onChange={e => setBasicInfo(b => ({ ...b, description: e.target.value }))}
                  rows={3}
                  placeholder="Tell guests what makes your restaurant special..."
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Cuisine type</label>
                  <select
                    value={basicInfo.cuisine}
                    onChange={e => setBasicInfo(b => ({ ...b, cuisine: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">Select...</option>
                    {[
                      'Polish',
                      'Italian',
                      'Japanese',
                      'French',
                      'Georgian',
                      'American',
                      'Mediterranean',
                      'Asian',
                      'Mexican',
                      'Indian',
                    ].map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">District</label>
                  <select
                    value={basicInfo.district}
                    onChange={e => setBasicInfo(b => ({ ...b, district: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">Select...</option>
                    {[
                      'Śródmieście',
                      'Mokotów',
                      'Wola',
                      'Praga-Południe',
                      'Ursynów',
                      'Żoliborz',
                      'Ochota',
                      'Targówek',
                      'Bemowo',
                      'Bielany',
                    ].map(d => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-2">Price range</label>
                <div className="flex gap-2">
                  {['$', '$$', '$$$', '$$$$'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setBasicInfo(b => ({ ...b, priceRange: p }))}
                      className={`px-4 py-2 rounded-btn border text-sm font-medium transition-colors ${
                        basicInfo.priceRange === p
                          ? 'bg-accent text-white border-accent'
                          : 'border-border text-muted hover:border-accent'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <input
                value={basicInfo.address}
                onChange={e => setBasicInfo(b => ({ ...b, address: e.target.value }))}
                placeholder="Address"
                className={inputCls}
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  value={basicInfo.phone}
                  onChange={e => setBasicInfo(b => ({ ...b, phone: e.target.value }))}
                  placeholder="Phone"
                  className={inputCls}
                />
                <input
                  value={basicInfo.email}
                  onChange={e => setBasicInfo(b => ({ ...b, email: e.target.value }))}
                  type="email"
                  placeholder="Email"
                  className={inputCls}
                />
              </div>
              <input
                value={basicInfo.website}
                onChange={e => setBasicInfo(b => ({ ...b, website: e.target.value }))}
                placeholder="Website (optional)"
                className={inputCls}
              />
            </div>
          )}

          {/* ── Step 2: Hours ── */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted mb-2">
                Set your opening hours and booking settings.
              </p>
              {DAYS_LIST.map((day, i) => (
                <div
                  key={day}
                  className="flex items-center gap-3 p-3 bg-surface-2 border border-border rounded-btn"
                >
                  <input
                    type="checkbox"
                    id={`day-${i}`}
                    checked={hours[i].open}
                    onChange={e =>
                      setHours(prev =>
                        prev.map((h, idx) =>
                          idx === i ? { ...h, open: e.target.checked } : h
                        )
                      )
                    }
                    className="w-4 h-4 accent-accent"
                  />
                  <label htmlFor={`day-${i}`} className="w-24 text-sm font-medium text-text">
                    {day}
                  </label>
                  {hours[i].open ? (
                    <>
                      <input
                        type="time"
                        value={hours[i].openTime}
                        onChange={e =>
                          setHours(prev =>
                            prev.map((h, idx) =>
                              idx === i ? { ...h, openTime: e.target.value } : h
                            )
                          )
                        }
                        className="border border-border rounded-btn px-2 py-1.5 text-sm text-text bg-surface focus:outline-none focus:border-accent"
                      />
                      <span className="text-muted text-sm">to</span>
                      <input
                        type="time"
                        value={hours[i].closeTime}
                        onChange={e =>
                          setHours(prev =>
                            prev.map((h, idx) =>
                              idx === i ? { ...h, closeTime: e.target.value } : h
                            )
                          )
                        }
                        className="border border-border rounded-btn px-2 py-1.5 text-sm text-text bg-surface focus:outline-none focus:border-accent"
                      />
                    </>
                  ) : (
                    <span className="text-sm text-muted italic">Closed</span>
                  )}
                </div>
              ))}

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Slot duration (min)
                  </label>
                  <select
                    value={slotDuration}
                    onChange={e => setSlotDuration(Number(e.target.value))}
                    className={inputCls}
                  >
                    {[30, 45, 60, 90, 120].map(v => (
                      <option key={v} value={v}>
                        {v} min
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Max advance booking (days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={maxAdvanceDays}
                    onChange={e => setMaxAdvanceDays(Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Photos ── */}
          {step === 3 && (
            <div>
              {/* Cover photo */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-text mb-2">Cover Photo</label>
                {coverPhoto ? (
                  <div className="relative">
                    <img
                      src={coverPhoto}
                      alt="Cover"
                      className="w-full h-48 object-cover rounded-card"
                    />
                    <button
                      type="button"
                      onClick={() => setCoverPhoto('')}
                      className="absolute top-2 right-2 bg-white rounded-full w-7 h-7 text-sm text-red-500 shadow flex items-center justify-center hover:bg-red-50 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-card cursor-pointer hover:border-accent transition-colors">
                    <span className="text-3xl mb-2">📷</span>
                    <span className="text-sm text-muted">
                      {uploading ? 'Uploading...' : 'Drag & drop or click to upload'}
                    </span>
                    <span className="text-xs text-muted mt-1">Recommended: 1200×630px</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleUpload(e, 'cover')}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>

              {/* Logo */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-text mb-2">Logo</label>
                {logo ? (
                  <div className="relative inline-block">
                    <img
                      src={logo}
                      alt="Logo"
                      className="w-24 h-24 object-cover rounded-card border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => setLogo('')}
                      className="absolute top-1 right-1 bg-white rounded-full w-6 h-6 text-xs text-red-500 shadow flex items-center justify-center hover:bg-red-50 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-border rounded-card cursor-pointer hover:border-accent transition-colors">
                    <span className="text-xl mb-1">🏷</span>
                    <span className="text-xs text-muted text-center">Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleUpload(e, 'logo')}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>

              {/* Gallery */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Gallery ({gallery.length} photos)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {gallery.map((url, i) => (
                    <div key={i} className="relative">
                      <img
                        src={url}
                        alt={`Gallery ${i + 1}`}
                        className="w-full h-20 object-cover rounded-btn border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => setGallery(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 bg-white rounded-full w-5 h-5 text-xs text-red-500 shadow flex items-center justify-center hover:bg-red-50 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-border rounded-btn cursor-pointer hover:border-accent transition-colors">
                    <span className="text-lg">+</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleUpload(e, 'gallery')}
                      disabled={uploading}
                    />
                  </label>
                </div>
                {uploading && (
                  <p className="text-xs text-muted animate-pulse">Uploading image...</p>
                )}
              </div>
            </div>
          )}

          {/* ── Step 4: Tables ── */}
          {step === 4 && (
            <div>
              <p className="text-sm text-muted mb-4">
                Add the tables guests can book. You can always edit these later.
              </p>
              <div className="space-y-3">
                {tables.map((table, i) => (
                  <div
                    key={table.id}
                    className="flex items-center gap-3 p-3 bg-surface border border-border rounded-btn"
                  >
                    <input
                      value={table.name}
                      onChange={e => updateTable(i, 'name', e.target.value)}
                      placeholder="Table name"
                      className="flex-1 border border-border rounded-btn px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:border-accent"
                    />
                    <input
                      type="number"
                      value={table.minGuests}
                      onChange={e => updateTable(i, 'minGuests', parseInt(e.target.value) || 1)}
                      min={1}
                      placeholder="Min"
                      className="w-16 border border-border rounded-btn px-2 py-2 text-sm text-text bg-surface focus:outline-none focus:border-accent"
                    />
                    <span className="text-muted text-sm">–</span>
                    <input
                      type="number"
                      value={table.maxGuests}
                      onChange={e => updateTable(i, 'maxGuests', parseInt(e.target.value) || 1)}
                      min={1}
                      placeholder="Max"
                      className="w-16 border border-border rounded-btn px-2 py-2 text-sm text-text bg-surface focus:outline-none focus:border-accent"
                    />
                    <select
                      value={table.zone}
                      onChange={e => updateTable(i, 'zone', e.target.value)}
                      className="border border-border rounded-btn px-2 py-2 text-sm text-text bg-surface focus:outline-none focus:border-accent"
                    >
                      {['indoor', 'outdoor', 'bar', 'terrace', 'private'].map(z => (
                        <option key={z}>{z}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setTables(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-red-400 hover:text-red-600 transition-colors text-lg leading-none"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setTables(prev => [
                      ...prev,
                      {
                        id: Date.now().toString(),
                        name: `Table ${prev.length + 1}`,
                        minGuests: 1,
                        maxGuests: 4,
                        zone: 'indoor',
                      },
                    ])
                  }
                  className="w-full py-2 border-2 border-dashed border-border rounded-btn text-sm text-muted hover:border-accent hover:text-accent transition-colors"
                >
                  + Add Table
                </button>
              </div>
              <p className="mt-3 text-sm text-muted">
                Total capacity:{' '}
                <strong className="text-text">
                  {tables.reduce((s, t) => s + t.maxGuests, 0)} guests
                </strong>{' '}
                across{' '}
                <strong className="text-text">{tables.length} tables</strong>
              </p>
            </div>
          )}

          {/* ── Step 5: Review & Publish ── */}
          {step === 5 && (
            <div>
              <h3 className="text-base font-semibold text-text mb-4">Review before publishing</h3>

              {/* Checklist */}
              <div className="space-y-2 mb-6">
                {checklist.map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                        item.done ? 'bg-accent/10 text-accent' : 'bg-surface-2 text-muted border border-border'
                      }`}
                    >
                      {item.done ? '✓' : '○'}
                    </span>
                    <span className={`text-sm ${item.done ? 'text-text' : 'text-muted'}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Summary card */}
              <div className="bg-surface-2 border border-border rounded-card p-4 mb-4">
                {coverPhoto && (
                  <img
                    src={coverPhoto}
                    alt="Cover"
                    className="w-full h-32 object-cover rounded-btn mb-3"
                  />
                )}
                <h4 className="text-lg font-bold text-text">
                  {basicInfo.name || 'Your Restaurant'}
                </h4>
                {basicInfo.cuisine && (
                  <p className="text-sm text-muted mt-0.5">{basicInfo.cuisine}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {basicInfo.district && (
                    <span className="text-xs bg-surface border border-border rounded-chip px-2 py-0.5 text-muted">
                      {basicInfo.district}
                    </span>
                  )}
                  {basicInfo.priceRange && (
                    <span className="text-xs bg-surface border border-border rounded-chip px-2 py-0.5 text-muted">
                      {basicInfo.priceRange}
                    </span>
                  )}
                  {tables.length > 0 && (
                    <span className="text-xs bg-surface border border-border rounded-chip px-2 py-0.5 text-muted">
                      {tables.length} tables
                    </span>
                  )}
                </div>
                {basicInfo.address && (
                  <p className="text-xs text-muted mt-2">{basicInfo.address}</p>
                )}
              </div>

              {!checklist.every(c => c.done) && (
                <p className="text-xs text-amber bg-amber/10 border border-amber/20 rounded-btn px-3 py-2">
                  Some items are incomplete. You can still publish and fill them in later from settings.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-6 border-t border-border">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="px-6 py-2 border border-border rounded-btn text-sm text-muted hover:bg-surface-2 transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}
          {step < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className="px-6 py-2 bg-accent text-white rounded-btn text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Next'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              disabled={saving}
              className="px-6 py-2 bg-accent text-white rounded-btn text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? 'Publishing...' : 'Publish Restaurant'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
