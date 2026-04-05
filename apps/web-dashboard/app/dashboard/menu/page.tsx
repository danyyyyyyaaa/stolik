'use client'
import { UtensilsCrossed } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'

export default function MenuPage() {
  return (
    <div>
      <PageHeader title="Menu" description="Manage your restaurant menu and categories" />
      <div className="bg-surface border border-border rounded-card">
        <EmptyState icon={UtensilsCrossed} title="Menu management" description="Add and manage your menu categories and items" />
      </div>
    </div>
  )
}
