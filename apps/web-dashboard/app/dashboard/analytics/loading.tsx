import { StatsCardSkeleton, SkeletonChart, Skeleton } from '@/components/shared/LoadingSkeleton'

export default function Loading() {
  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-9 w-32 rounded-btn" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />)}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SkeletonChart height={220} />
        <SkeletonChart height={220} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart height={180} />
        <SkeletonChart height={180} />
      </div>
    </div>
  )
}
