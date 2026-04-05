'use client'
import { Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'

export default function StaffPage() {
  return (
    <div>
      <PageHeader title="Staff" description="Manage your team members and roles" />
      <div className="bg-surface border border-border rounded-card">
        <EmptyState icon={Users} title="Staff management" description="Invite and manage your restaurant staff" />
      </div>
    </div>
  )
}
