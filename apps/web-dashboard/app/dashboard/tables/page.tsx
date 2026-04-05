'use client'
import { Table2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'

export default function TablesPage() {
  return (
    <div>
      <PageHeader title="Tables" description="Manage your floor plan and table configuration" />
      <div className="bg-surface border border-border rounded-card">
        <EmptyState icon={Table2} title="Tables management" description="Floor plan and table configuration view" />
      </div>
    </div>
  )
}
