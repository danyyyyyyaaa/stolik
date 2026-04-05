export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-2 rounded ${className}`} />
}

export function StatsCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-card p-5">
      <div className="flex justify-between">
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-20 mt-2" />
        </div>
        <Skeleton className="h-10 w-10 rounded-btn" />
      </div>
    </div>
  )
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}
