'use client'
import { Calendar } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'

export default function CalendarPage() {
  return (
    <div>
      <PageHeader title="Calendar" description="Monthly and weekly booking view" />
      <div className="bg-surface border border-border rounded-card">
        <EmptyState icon={Calendar} title="Calendar coming soon" description="Full calendar view with month/week/day modes" />
      </div>
    </div>
  )
}
