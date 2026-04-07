'use client'

import { useState, useEffect } from 'react'
import {
  Link2, Check, AlertTriangle, QrCode, Key, Copy, RefreshCw,
  ChevronDown, ChevronUp, X, Eye, EyeOff, Zap, Bell,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { api } from '@/lib/api'
import { useMyRestaurant } from '@/hooks/useRestaurant'

// ── Types ──────────────────────────────────────────────────────────────────

interface Integration {
  provider: string
  status: 'active' | 'error' | 'disconnected'
  lastSyncAt?: string
  config?: Record<string, unknown>
  credentials?: Record<string, unknown>
}

interface ApiKeyRecord {
  id: string
  name: string
  keyPreview: string
  lastUsedAt?: string
  createdAt: string
  isActive: boolean
}

interface TerminalStatus {
  connected: boolean
  deviceName?: string
  lastSeen?: string
}

// ── Poster POS Modal ───────────────────────────────────────────────────────

function PosterModal({
  restaurantId,
  onClose,
  onConnected,
}: {
  restaurantId: string
  onClose: () => void
  onConnected: () => void
}) {
  const [step, setStep] = useState(1)
  const [accountName, setAccountName] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; restaurantName?: string; error?: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({ syncTables: true, syncBookings: true, realTime: true, interval: '15' })
  const [helpOpen, setHelpOpen] = useState(false)

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.post<{ success: boolean; restaurantName: string }>('/api/integrations/poster/test', { accountName, apiToken })
      setTestResult({ success: true, restaurantName: res.restaurantName })
      setStep(3)
    } catch {
      setTestResult({ success: false, error: 'Connection failed. Check your credentials.' })
    } finally {
      setTesting(false)
    }
  }

  async function handleActivate() {
    setSaving(true)
    try {
      await api.post('/api/integrations/poster/connect', { accountName, apiToken, config })
      onConnected()
      onClose()
    } catch {
      // silently
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-text">Connect Poster POS</h2>
            <p className="text-xs text-muted mt-0.5">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-2 rounded-btn text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-6 pt-4">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                s < step ? 'bg-accent text-white' : s === step ? 'bg-accent text-white' : 'bg-surface-2 text-muted'
              }`}>
                {s < step ? <Check size={12} /> : s}
              </div>
              {s < 3 && <div className={`flex-1 h-0.5 w-8 rounded-full ${s < step ? 'bg-accent' : 'bg-surface-2'}`} />}
            </div>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {step === 1 && (
            <>
              <p className="text-sm text-muted">Enter your Poster POS credentials to connect your account.</p>
              <div>
                <label className="block text-xs font-semibold text-text mb-1">Poster Account Name (subdomain)</label>
                <input
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder="yourrestaurant"
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-btn text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
                />
                <p className="text-xs text-muted mt-1">The part before .joinposter.com</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text mb-1">API Token</label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={apiToken}
                    onChange={e => setApiToken(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full px-3 py-2 pr-10 bg-surface-2 border border-border rounded-btn text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                  >
                    {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(!helpOpen)}
                className="flex items-center gap-1 text-xs text-accent hover:underline"
              >
                How to get your API token
                {helpOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {helpOpen && (
                <div className="bg-surface-2 border border-border rounded-btn p-3 text-xs text-muted space-y-1">
                  <p>1. Log in to your Poster account at <span className="text-accent">joinposter.com</span></p>
                  <p>2. Go to Settings → Integrations → API</p>
                  <p>3. Copy the API token</p>
                </div>
              )}
              <button
                onClick={() => setStep(2)}
                disabled={!accountName || !apiToken}
                className="w-full py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-btn transition-colors disabled:opacity-40"
              >
                Continue
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted">Test connection to verify your credentials.</p>
              <div className="bg-surface-2 border border-border rounded-btn p-4">
                <p className="text-xs text-muted">Account: <span className="text-text font-medium">{accountName}.joinposter.com</span></p>
              </div>
              {testResult && !testResult.success && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-btn text-sm text-red-400">
                  <AlertTriangle size={14} /> {testResult.error}
                </div>
              )}
              {testResult?.success && (
                <div className="flex items-center gap-2 p-3 bg-accent/10 border border-accent/20 rounded-btn text-sm text-accent">
                  <Check size={14} /> Connected to &ldquo;{testResult.restaurantName}&rdquo;
                </div>
              )}
              <button
                onClick={handleTest}
                disabled={testing}
                className="w-full py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-btn transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {testing && <RefreshCw size={14} className="animate-spin" />}
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-muted">Configure what to sync between Poster and Dinto.</p>
              {[
                { key: 'syncTables', label: 'Sync tables', desc: 'Import table layout from Poster' },
                { key: 'syncBookings', label: 'Sync bookings', desc: 'Send Dinto bookings to Poster' },
                { key: 'realTime', label: 'Real-time table status', desc: 'Live table availability' },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text">{label}</p>
                    <p className="text-xs text-muted">{desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig(c => ({ ...c, [key]: !c[key as keyof typeof c] }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 mt-0.5 ${
                      config[key as keyof typeof config] ? 'bg-accent' : 'bg-surface-2'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      config[key as keyof typeof config] ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </label>
              ))}
              <div>
                <label className="block text-xs font-semibold text-text mb-1">Sync interval</label>
                <select
                  value={config.interval}
                  onChange={e => setConfig(c => ({ ...c, interval: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-btn text-sm text-text focus:outline-none focus:border-accent"
                >
                  <option value="5">Every 5 minutes</option>
                  <option value="15">Every 15 minutes</option>
                  <option value="30">Every 30 minutes</option>
                  <option value="0">Manual only</option>
                </select>
              </div>
              <button
                onClick={handleActivate}
                disabled={saving}
                className="w-full py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-btn transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {saving && <RefreshCw size={14} className="animate-spin" />}
                Activate Integration
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── QR Modal ───────────────────────────────────────────────────────────────

function QRModal({ restaurantId, onClose }: { restaurantId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [qrData, setQrData] = useState<{ token: string; qrUrl: string; expiresAt: string } | null>(null)

  useEffect(() => {
    api.post<{ token: string; qrUrl: string; expiresAt: string }>('/api/terminal/generate-qr', { restaurantId })
      .then(d => setQrData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [restaurantId])

  const minutesLeft = qrData
    ? Math.max(0, Math.round((new Date(qrData.expiresAt).getTime() - Date.now()) / 60000))
    : 0

  // Generate a simple QR-like visual placeholder when no QR URL
  const qrContent = qrData?.token ? `dinto://connect?token=${qrData.token}&restaurantId=${restaurantId}` : ''

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold text-text">Connect Terminal</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-2 rounded-btn text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 text-center space-y-4">
          {loading ? (
            <div className="w-48 h-48 bg-surface-2 rounded-xl mx-auto animate-pulse" />
          ) : qrData ? (
            <>
              {/* QR Code placeholder — in production use a QR library */}
              <div className="w-48 h-48 bg-white rounded-xl mx-auto p-3 flex items-center justify-center">
                <div className="w-full h-full grid grid-cols-10 gap-px opacity-80">
                  {Array.from({ length: 100 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-[1px] ${Math.random() > 0.5 ? 'bg-gray-900' : 'bg-white'}`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted">Scan with the Dinto Terminal app</p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-btn px-3 py-2">
                <p className="text-xs text-amber-400">Expires in {minutesLeft} minutes</p>
              </div>
              <div className="bg-surface-2 border border-border rounded-btn p-2 text-left">
                <p className="text-[10px] text-muted font-mono break-all">{qrContent.slice(0, 60)}…</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">Failed to generate QR code. Try again.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── API Key Panel ──────────────────────────────────────────────────────────

function ApiKeyPanel({ restaurantId }: { restaurantId: string }) {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function fetchKeys() {
    setLoading(true)
    try {
      const res = await api.get<{ keys: ApiKeyRecord[] }>('/api/api-keys', { restaurantId })
      setKeys(res.keys ?? [])
    } catch {
      setKeys([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchKeys() }, [restaurantId])

  async function handleCreate() {
    setCreating(true)
    try {
      const res = await api.post<{ key: string; record: ApiKeyRecord }>('/api/api-keys', { restaurantId })
      setNewKey(res.key)
      setKeys(k => [res.record, ...k])
    } catch {
      // silently
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/api/api-keys/${id}`)
      setKeys(k => k.filter(k => k.id !== id))
    } catch {
      // silently
    }
  }

  function copyKey() {
    if (!newKey) return
    navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://stolik-production.up.railway.app'

  return (
    <div className="space-y-4">
      {newKey && (
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-accent mb-2">New API Key — copy it now, it won&apos;t be shown again</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-surface border border-border rounded-btn px-3 py-2 text-xs font-mono text-text break-all">
              {newKey}
            </code>
            <button
              onClick={copyKey}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-btn transition-colors"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Endpoint reference */}
      <div className="bg-surface-2 border border-border rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-text">API Endpoint</p>
        <code className="text-xs text-muted font-mono">{API_URL}/api/v1/</code>
        <div className="border-t border-border pt-2 space-y-1">
          {[
            'GET  /api/v1/bookings?date=YYYY-MM-DD',
            'POST /api/v1/bookings',
            'PUT  /api/v1/bookings/:id/status',
            'GET  /api/v1/tables',
            'PUT  /api/v1/tables/:id/status',
          ].map(line => (
            <p key={line} className="text-[10px] font-mono text-muted">{line}</p>
          ))}
        </div>
      </div>

      {/* Keys list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-12 bg-surface-2 rounded-btn animate-pulse" />)}
        </div>
      ) : keys.length === 0 ? (
        <p className="text-sm text-muted text-center py-4">No API keys yet.</p>
      ) : (
        <div className="space-y-2">
          {keys.map(k => (
            <div key={k.id} className="flex items-center gap-3 p-3 bg-surface-2 border border-border rounded-btn">
              <Key size={14} className="text-muted flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text">{k.name}</p>
                <p className="text-[10px] font-mono text-muted">{k.keyPreview}</p>
              </div>
              {k.lastUsedAt && (
                <p className="text-[10px] text-muted">Last used {new Date(k.lastUsedAt).toLocaleDateString()}</p>
              )}
              <button
                onClick={() => handleDelete(k.id)}
                className="p-1.5 hover:bg-red-500/10 rounded text-muted hover:text-error transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={creating}
        className="flex items-center gap-2 px-4 py-2 bg-surface-2 border border-border hover:border-accent text-sm font-semibold text-text rounded-btn transition-colors disabled:opacity-40"
      >
        {creating ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
        Generate API Key
      </button>
    </div>
  )
}

// ── Integration Card ───────────────────────────────────────────────────────

interface CardProps {
  logo: string
  title: string
  description: string
  status: 'connected' | 'disconnected' | 'coming_soon'
  onConnect?: () => void
  onDisconnect?: () => void
  actionLabel?: string
}

function IntegrationCard({ logo, title, description, status, onConnect, onDisconnect, actionLabel }: CardProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center flex-shrink-0 text-xl">
          {logo}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-bold text-text">{title}</h3>
            {status === 'coming_soon' && (
              <span className="px-1.5 py-0.5 bg-surface-2 border border-border text-[10px] font-semibold text-muted rounded-full">
                Coming Soon
              </span>
            )}
            {status === 'connected' && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-accent/10 border border-accent/20 text-[10px] font-semibold text-accent rounded-full">
                <Check size={10} /> Connected
              </span>
            )}
          </div>
          <p className="text-xs text-muted">{description}</p>
        </div>
      </div>
      <div className="flex gap-2">
        {status === 'connected' ? (
          <button
            onClick={onDisconnect}
            className="px-3 py-1.5 border border-error/30 text-error hover:bg-error/10 text-xs font-semibold rounded-btn transition-colors"
          >
            Disconnect
          </button>
        ) : status === 'disconnected' ? (
          <button
            onClick={onConnect}
            className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-btn transition-colors"
          >
            {actionLabel ?? 'Connect'}
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="px-3 py-1.5 bg-surface-2 border border-border text-muted text-xs font-semibold rounded-btn cursor-default"
          >
            Notify Me
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const { restaurant } = useMyRestaurant()
  const [integrations, setIntegrations] = useState<Record<string, Integration>>({})
  const [terminalStatus, setTerminalStatus] = useState<TerminalStatus>({ connected: false })
  const [loading, setLoading] = useState(true)
  const [posterModal, setPosterModal] = useState(false)
  const [qrModal, setQrModal] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifySent, setNotifySent] = useState(false)

  async function fetchAll() {
    if (!restaurant?.id) return
    setLoading(true)
    try {
      const [intRes, termRes] = await Promise.allSettled([
        api.get<{ poster?: Integration; terminal?: Integration; apiKeys: ApiKeyRecord[] }>('/api/integrations', { restaurantId: restaurant.id }),
        api.get<TerminalStatus>('/api/terminal/status', { restaurantId: restaurant.id }),
      ])
      if (intRes.status === 'fulfilled') {
        const d = intRes.value
        const map: Record<string, Integration> = {}
        if (d.poster) map.poster = d.poster
        setIntegrations(map)
      }
      if (termRes.status === 'fulfilled') {
        setTerminalStatus(termRes.value)
      }
    } catch {
      // silently
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [restaurant?.id])

  async function handleDisconnectPoster() {
    if (!restaurant?.id) return
    try {
      await api.delete('/api/integrations/poster')
      setIntegrations(i => { const copy = { ...i }; delete copy.poster; return copy })
    } catch {
      // silently
    }
  }

  if (!restaurant) return null

  const posterStatus = integrations.poster?.status === 'active' ? 'connected' : 'disconnected'
  const termStatus = terminalStatus.connected ? 'connected' : 'disconnected'

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Connect your restaurant systems and third-party tools"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Poster POS */}
        <IntegrationCard
          logo="🧾"
          title="Poster POS"
          description="Sync tables, orders, and availability with your Poster account"
          status={posterStatus}
          onConnect={() => setPosterModal(true)}
          onDisconnect={handleDisconnectPoster}
        />

        {/* Dinto Terminal */}
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center flex-shrink-0 text-xl">
              📱
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-sm font-bold text-text">Dinto Terminal</h3>
                {termStatus === 'connected' && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-accent/10 border border-accent/20 text-[10px] font-semibold text-accent rounded-full">
                    <Check size={10} /> Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">Manage walk-ins and bookings from a tablet at your host stand</p>
              {termStatus === 'connected' && terminalStatus.deviceName && (
                <p className="text-xs text-accent mt-1">Device: {terminalStatus.deviceName}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setQrModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-btn transition-colors w-fit"
          >
            <QrCode size={14} /> Generate QR Code
          </button>
        </div>

        {/* iiko */}
        <IntegrationCard
          logo="🖥️"
          title="iiko"
          description="Popular POS system in Eastern Europe — coming soon"
          status="coming_soon"
          onConnect={() => {
            if (notifyEmail) {
              setNotifySent(true)
              setTimeout(() => setNotifySent(false), 3000)
            }
          }}
        />

        {/* R-Keeper */}
        <IntegrationCard
          logo="⚡"
          title="R-Keeper"
          description="Enterprise POS system — coming soon"
          status="coming_soon"
        />
      </div>

      {/* Notify me form for coming soon */}
      {!notifySent ? (
        <div className="mt-4 flex items-center gap-2">
          <input
            value={notifyEmail}
            onChange={e => setNotifyEmail(e.target.value)}
            placeholder="your@email.com — get notified when new integrations launch"
            className="flex-1 max-w-sm px-3 py-2 bg-surface border border-border rounded-btn text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
          />
          <button
            onClick={() => { if (notifyEmail) { setNotifySent(true); setTimeout(() => setNotifySent(false), 3000) } }}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-2 border border-border hover:border-accent text-xs font-semibold text-text rounded-btn transition-colors"
          >
            <Bell size={12} /> Notify Me
          </button>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 text-sm text-accent">
          <Check size={14} /> You&apos;ll be notified when new integrations are available.
        </div>
      )}

      {/* Custom API section */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-accent" />
          <h2 className="text-base font-bold text-text">Custom API</h2>
          <p className="text-xs text-muted">— Connect any system via REST API</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-6">
          <ApiKeyPanel restaurantId={restaurant.id} />
        </div>
      </div>

      {/* Modals */}
      {posterModal && (
        <PosterModal
          restaurantId={restaurant.id}
          onClose={() => setPosterModal(false)}
          onConnected={fetchAll}
        />
      )}
      {qrModal && (
        <QRModal
          restaurantId={restaurant.id}
          onClose={() => setQrModal(false)}
        />
      )}
    </div>
  )
}
