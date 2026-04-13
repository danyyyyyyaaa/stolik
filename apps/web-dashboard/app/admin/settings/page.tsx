'use client'
import { useEffect, useState } from 'react'
import { Settings, CheckCircle, XCircle, Globe, DollarSign, Bell, Shield } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { api } from '@/lib/api'

interface PlatformSettings {
  platform: {
    name: string
    supportEmail: string
    defaultLanguage: string
  }
  plans: {
    pro:      { price: number; currency: string }
    business: { price: number; currency: string }
  }
  integrations: {
    stripe:  boolean
    twilio:  boolean
    google:  boolean
    r2:      boolean
    jwt:     boolean
  }
}

function IntegrationRow({ name, connected, description }: { name: string; connected: boolean; description: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-text">{name}</p>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>
      <div className={`flex items-center gap-1.5 text-xs font-medium ${connected ? 'text-success' : 'text-error'}`}>
        {connected ? <CheckCircle size={14} /> : <XCircle size={14} />}
        {connected ? 'Connected' : 'Not configured'}
      </div>
    </div>
  )
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<PlatformSettings>('/api/admin/settings')
      .then(setSettings)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <PageHeader title="Settings" description="Platform configuration and integration status" />

      {loading && (
        <div className="flex items-center justify-center h-48">
          <span className="text-muted animate-pulse text-sm">Loading settings...</span>
        </div>
      )}

      {!loading && settings && (
        <div className="space-y-6">
          {/* Platform info */}
          <div className="bg-surface border border-border rounded-card p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={16} className="text-accent" />
              <h3 className="font-semibold text-text">Platform</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted mb-1">Platform Name</p>
                <p className="text-sm text-text font-medium">{settings.platform.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Support Email</p>
                <p className="text-sm text-text font-medium">{settings.platform.supportEmail}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Default Language</p>
                <p className="text-sm text-text font-medium uppercase">{settings.platform.defaultLanguage}</p>
              </div>
            </div>
          </div>

          {/* Subscription Plans */}
          <div className="bg-surface border border-border rounded-card p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={16} className="text-accent" />
              <h3 className="font-semibold text-text">Subscription Plans</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-surface-2/50 border border-border rounded-card">
                <p className="text-xs text-muted mb-1 uppercase tracking-wide">Free</p>
                <p className="text-2xl font-bold text-text">0 zł</p>
                <p className="text-xs text-muted mt-1">Basic features, up to 5 tables</p>
              </div>
              <div className="p-4 bg-accent/10 border border-accent/30 rounded-card">
                <p className="text-xs text-accent mb-1 uppercase tracking-wide font-semibold">Pro</p>
                <p className="text-2xl font-bold text-text">{settings.plans.pro.price} {settings.plans.pro.currency}</p>
                <p className="text-xs text-muted mt-1">Unlimited tables, SMS, analytics</p>
              </div>
              <div className="p-4 bg-amber/10 border border-amber/30 rounded-card">
                <p className="text-xs text-amber mb-1 uppercase tracking-wide font-semibold">Business</p>
                <p className="text-2xl font-bold text-text">{settings.plans.business.price} {settings.plans.business.currency}</p>
                <p className="text-xs text-muted mt-1">All features, priority support, API</p>
              </div>
            </div>
          </div>

          {/* Integration Status */}
          <div className="bg-surface border border-border rounded-card p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-accent" />
              <h3 className="font-semibold text-text">API Keys & Integrations</h3>
            </div>
            <IntegrationRow name="Stripe" connected={settings.integrations.stripe} description="Payment processing and subscriptions" />
            <IntegrationRow name="Twilio" connected={settings.integrations.twilio} description="SMS reminders and notifications" />
            <IntegrationRow name="Google Places API" connected={settings.integrations.google} description="Restaurant search, maps, reviews sync" />
            <IntegrationRow name="Cloudflare R2" connected={settings.integrations.r2} description="File and image storage" />
            <IntegrationRow name="JWT Secret" connected={settings.integrations.jwt} description="Authentication token signing" />
          </div>

          {/* Notification templates info */}
          <div className="bg-surface border border-border rounded-card p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={16} className="text-accent" />
              <h3 className="font-semibold text-text">Notification Templates</h3>
            </div>
            <p className="text-sm text-muted mb-3">
              SMS templates are configured per-restaurant. Each restaurant owner can customize their own templates from the dashboard.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { name: 'Booking Confirmation', key: 'booking_confirmation' },
                { name: 'Booking Reminder',     key: 'booking_reminder' },
                { name: 'Booking Cancelled',    key: 'booking_cancelled' },
                { name: 'Waitlist Notification', key: 'waitlist_notification' },
              ].map(t => (
                <div key={t.key} className="p-3 bg-surface-2/50 border border-border rounded-btn">
                  <p className="text-xs font-semibold text-text">{t.name}</p>
                  <p className="text-xs text-muted mt-0.5 font-mono">{t.key}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Admin actions */}
          <div className="bg-surface border border-border rounded-card p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Settings size={16} className="text-accent" />
              <h3 className="font-semibold text-text">Admin Actions</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-surface-2/50 border border-border rounded-btn">
                <div>
                  <p className="text-sm font-medium text-text">Seed Admin User</p>
                  <p className="text-xs text-muted mt-0.5">Create initial admin@stolik.pl if no admin exists</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await api.post('/api/admin/seed', {})
                      alert('Admin user created')
                    } catch (e: unknown) {
                      alert((e as Error).message ?? 'Failed or already exists')
                    }
                  }}
                  className="px-3 py-1.5 text-xs bg-accent text-white rounded-btn hover:bg-accent/90 transition-colors"
                >
                  Seed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !settings && (
        <div className="flex items-center justify-center h-48">
          <p className="text-muted text-sm">Failed to load settings</p>
        </div>
      )}
    </div>
  )
}
