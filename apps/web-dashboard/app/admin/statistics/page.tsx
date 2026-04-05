'use client'
import { BarChart3 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'

export default function AdminStatisticsPage() {
  return (
    <div>
      <PageHeader title="Statistics" description="Platform-wide analytics and metrics" />
      <div className="bg-surface border border-border rounded-card">
        <EmptyState icon={BarChart3} title="Platform statistics" description="Revenue, user growth, and platform metrics" />
      </div>
    </div>
  )
}
