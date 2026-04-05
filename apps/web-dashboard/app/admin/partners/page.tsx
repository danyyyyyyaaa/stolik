'use client'
import { Handshake } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'

export default function AdminPartnersPage() {
  return (
    <div>
      <PageHeader title="Partners" description="Manage platform partners and commissions" />
      <div className="bg-surface border border-border rounded-card">
        <EmptyState icon={Handshake} title="Partners" description="Partner management and commission tracking" />
      </div>
    </div>
  )
}
