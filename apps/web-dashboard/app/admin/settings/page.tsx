'use client'
import { Settings } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'

export default function AdminSettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Platform configuration and admin preferences" />
      <div className="bg-surface border border-border rounded-card">
        <EmptyState icon={Settings} title="Admin settings" description="Platform configuration options" />
      </div>
    </div>
  )
}
