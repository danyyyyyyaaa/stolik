import { Skeleton } from '@/components/shared/LoadingSkeleton'
import { SkeletonCalendar } from '@/components/shared/LoadingSkeleton'

export default function Loading() {
  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Skeleton className="h-7 w-36 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-btn" />
          <Skeleton className="h-9 w-24 rounded-btn" />
          <Skeleton className="h-9 w-24 rounded-btn" />
        </div>
      </div>
      <SkeletonCalendar />
    </div>
  )
}
