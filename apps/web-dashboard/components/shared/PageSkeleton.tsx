import { Skeleton, StatsCardSkeleton } from './LoadingSkeleton'

export function PageSkeleton({ cards = 0, rows = 5 }: { cards?: number; rows?: number }) {
  return (
    <div>
      {/* Page header skeleton */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28 rounded-btn" />
      </div>

      {/* Optional stat cards */}
      {cards > 0 && (
        <div className={`grid grid-cols-2 lg:grid-cols-${Math.min(cards, 4)} gap-4 mb-6`}>
          {Array.from({ length: cards }).map((_, i) => <StatsCardSkeleton key={i} />)}
        </div>
      )}

      {/* Table skeleton */}
      <div className="bg-surface border border-border rounded-card overflow-hidden">
        {/* Filter bar */}
        <div className="flex gap-3 px-4 py-3 border-b border-border">
          <Skeleton className="h-8 w-64 rounded-btn" />
          <Skeleton className="h-8 w-32 rounded-btn" />
          <Skeleton className="h-8 w-32 rounded-btn" />
        </div>
        {/* Table head */}
        <div className="flex gap-4 px-4 py-3 border-b border-border bg-surface-2/30">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1 rounded" />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3.5 border-b border-border last:border-0">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton
                key={j}
                className={`h-4 rounded ${j === 0 ? 'w-36' : j === 4 ? 'w-16' : 'flex-1'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
