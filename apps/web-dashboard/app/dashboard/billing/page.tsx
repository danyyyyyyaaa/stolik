'use client'
import { CreditCard } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'

export default function BillingPage() {
  return (
    <div>
      <PageHeader title="Billing" description="Subscription plans and payment management" />
      <div className="bg-surface border border-border rounded-card">
        <EmptyState icon={CreditCard} title="Billing" description="Manage your subscription plan and payment methods" />
      </div>
    </div>
  )
}
