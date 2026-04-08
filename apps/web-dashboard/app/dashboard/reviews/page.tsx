'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useMyRestaurant } from '@/hooks/useRestaurant'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/shared/LoadingSkeleton'
import { formatDate, getInitials } from '@/lib/utils'
import { Star } from 'lucide-react'
import { useT } from '@/lib/i18n'

interface Review {
  id: string
  rating: number
  text?: string
  createdAt: string
  guestName?: string
  ownerReply?: string
  ownerRepliedAt?: string
  user?: {
    firstName: string
    lastName: string
    avatarUrl?: string
  }
}

interface ReviewsResponse {
  reviews: Review[]
  avgRating: number
  totalCount: number
  distribution: Record<number, number>
}

export default function ReviewsPage() {
  const { restaurant, loading: restaurantLoading } = useMyRestaurant()
  const [reviews, setReviews] = useState<Review[]>([])
  const [avgRating, setAvgRating] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [distribution, setDistribution] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const t = useT()

  useEffect(() => {
    if (!restaurant) return
    setLoading(true)
    api.get<ReviewsResponse>(`/api/restaurants/${restaurant.id}/reviews`)
      .then(data => {
        setReviews(data.reviews ?? [])
        setAvgRating(data.avgRating ?? 0)
        setTotalCount(data.totalCount ?? 0)
        setDistribution(data.distribution ?? {})
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [restaurant])

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return
    try {
      await api.post(`/api/reviews/${reviewId}/reply`, { text: replyText })
      setReviews(prev =>
        prev.map(r =>
          r.id === reviewId
            ? { ...r, ownerReply: replyText, ownerRepliedAt: new Date().toISOString() }
            : r
        )
      )
      setReplyingId(null)
      setReplyText('')
    } catch (err) {
      // silently fail — user can retry
    }
  }

  const filtered = reviews
    .filter(r => filterRating === null || r.rating === filterRating)
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sortBy === 'highest') return b.rating - a.rating
      return a.rating - b.rating
    })

  if (restaurantLoading || loading) {
    return (
      <div>
        <PageHeader title={t.reviews} description={t.reviewsDesc} />
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title={t.reviews} description={t.reviewsDesc} />
        <div className="bg-surface border border-border rounded-card p-6 text-sm text-red-500">
          {t.failedLoadReviews}: {error}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={t.reviews} description={t.reviewsDesc} />

      {/* Summary section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Left: large rating */}
        <div className="bg-surface border border-border rounded-card p-6 flex flex-col items-center justify-center">
          <div className="text-5xl font-bold text-text">{avgRating.toFixed(1)}</div>
          <div className="flex gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map(i => (
              <span key={i} className={i <= Math.round(avgRating) ? 'text-amber text-xl' : 'text-muted text-xl'}>
                ★
              </span>
            ))}
          </div>
          <div className="text-sm text-muted mt-1">{t.guestsCount(totalCount)}</div>
        </div>

        {/* Right: distribution bars */}
        <div className="bg-surface border border-border rounded-card p-6 flex flex-col justify-center">
          {[5, 4, 3, 2, 1].map(star => {
            const count = distribution[star] ?? 0
            const pct = totalCount > 0 ? (count / totalCount) * 100 : 0
            return (
              <div key={star} className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-muted w-4">{star}★</span>
                <div className="flex-1 bg-surface-2 rounded-full h-2">
                  <div
                    className="bg-amber h-2 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted w-6 text-right">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filter & Sort row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterRating(null)}
            className={`px-3 py-1.5 rounded-chip text-xs font-medium transition-colors ${
              filterRating === null
                ? 'bg-accent text-white'
                : 'bg-surface border border-border text-muted hover:text-text'
            }`}
          >
            {t.reviewsAll}
          </button>
          {[5, 4, 3, 2, 1].map(star => (
            <button
              key={star}
              onClick={() => setFilterRating(filterRating === star ? null : star)}
              className={`px-3 py-1.5 rounded-chip text-xs font-medium transition-colors ${
                filterRating === star
                  ? 'bg-accent text-white'
                  : 'bg-surface border border-border text-muted hover:text-text'
              }`}
            >
              {star}★
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="border border-border rounded-btn px-3 py-1.5 text-sm bg-surface text-text focus:outline-none focus:border-accent"
        >
          <option value="newest">{t.reviewsNewest}</option>
          <option value="oldest">{t.reviewsOldest}</option>
          <option value="highest">{t.reviewsHighest}</option>
          <option value="lowest">{t.reviewsLowest}</option>
        </select>
      </div>

      {/* Reviews list */}
      {filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-card">
          <EmptyState
            icon={Star}
            title={t.noReviewsYet}
            description={t.noReviewsDesc}
          />
        </div>
      ) : (
        <div>
          {filtered.map(review => (
            <div key={review.id} className="bg-surface border border-border rounded-card p-4 mb-3">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {review.user
                      ? getInitials(review.user.firstName, review.user.lastName)
                      : getInitials(review.guestName ?? 'Guest')}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text">
                      {review.user
                        ? `${review.user.firstName} ${review.user.lastName}`
                        : review.guestName ?? 'Guest'}
                    </div>
                    <div className="text-xs text-muted">{formatDate(review.createdAt)}</div>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <span
                      key={i}
                      className={`text-sm ${i <= review.rating ? 'text-amber' : 'text-surface-2'}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              {/* Review text */}
              {review.text && <p className="text-sm text-text mb-3">{review.text}</p>}

              {/* Reply section */}
              {review.ownerReply ? (
                <div className="bg-surface-2 rounded-btn p-3 border-l-2 border-accent">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-semibold text-accent">{t.restaurantShort}</span>
                    <span className="text-xs text-muted">{formatDate(review.ownerRepliedAt!)}</span>
                  </div>
                  <p className="text-sm text-text">{review.ownerReply}</p>
                </div>
              ) : replyingId === review.id ? (
                <div className="mt-2">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder={t.writeReplyPlaceholder}
                    rows={3}
                    className="w-full border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none bg-surface text-text"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleReply(review.id)}
                      className="px-4 py-1.5 bg-accent text-white rounded-btn text-sm font-medium hover:bg-accent/90"
                    >
                      {t.sendReply}
                    </button>
                    <button
                      onClick={() => { setReplyingId(null); setReplyText('') }}
                      className="px-4 py-1.5 border border-border rounded-btn text-sm text-muted hover:bg-surface-2"
                    >
                      {t.cancel}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setReplyingId(review.id); setReplyText('') }}
                  className="text-xs text-accent hover:underline mt-1"
                >
                  {t.replyToReview}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
