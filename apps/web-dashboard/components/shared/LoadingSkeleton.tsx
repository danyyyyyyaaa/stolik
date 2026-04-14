export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-surface-2 rounded ${className}`} />
  )
}

export function StatsCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-card p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-3 w-20 mb-3" />
          <Skeleton className="h-7 w-24 mb-2" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-10 w-10 rounded-btn flex-shrink-0 ml-3" />
      </div>
    </div>
  )
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  const widths = ['w-36', 'flex-1', 'w-24', 'w-20', 'w-16']
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <Skeleton className={`h-4 ${widths[i] ?? 'flex-1'}`} />
        </td>
      ))}
    </tr>
  )
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-surface border border-border rounded-card p-5 shadow-card space-y-3">
      <Skeleton className="h-5 w-32" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} />
      ))}
    </div>
  )
}

export function ListRowSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-border last:border-0">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded-chip" />
        </div>
      ))}
    </>
  )
}

export function SkeletonChart({ height = 240 }: { height?: number }) {
  return (
    <div className="bg-surface border border-border rounded-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-20 rounded-chip" />
      </div>
      <div className="skeleton-shimmer rounded-btn" style={{ height }} />
    </div>
  )
}

export function SkeletonCalendar() {
  const days = Array.from({ length: 35 })
  return (
    <div className="bg-surface border border-border rounded-card shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <Skeleton className="h-5 w-36" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-btn" />
          <Skeleton className="h-8 w-8 rounded-btn" />
        </div>
      </div>
      {/* Day labels */}
      <div className="grid grid-cols-7 gap-px bg-border px-4 py-2">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
          <div key={d} className="flex justify-center">
            <Skeleton className="h-3 w-5" />
          </div>
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-border p-4">
        {days.map((_, i) => (
          <div key={i} className="bg-surface aspect-square rounded flex flex-col p-1 gap-1">
            <Skeleton className="h-4 w-4 rounded" />
            {i % 5 === 0 && <Skeleton className="h-2.5 w-full rounded" />}
            {i % 7 === 2 && <Skeleton className="h-2.5 w-3/4 rounded" />}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonStat() {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Skeleton className="w-10 h-10 rounded-full" />
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}
