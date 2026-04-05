'use client'
import { Star } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'

export default function ReviewsPage() {
  return (
    <div>
      <PageHeader title="Reviews" description="Guest feedback and ratings" />
      <div className="bg-surface border border-border rounded-card">
        <EmptyState icon={Star} title="Reviews" description="Guest reviews and ratings will appear here" />
      </div>
    </div>
  )
}
