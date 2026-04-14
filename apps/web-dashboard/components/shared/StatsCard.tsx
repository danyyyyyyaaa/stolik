import { type LucideIcon } from 'lucide-react'

interface Props {
  title: string
  value: string | number
  subtitle?: string
  trend?: number | null
  icon: LucideIcon
  iconColor?: string
  accentColor?: string  // left border color class, e.g. 'bg-accent'
}

const ICON_BG: Record<string, string> = {
  'text-accent':    'bg-accent/10',
  'text-blue-400':  'bg-blue-400/10',
  'text-amber':     'bg-amber/10',
  'text-success':   'bg-success/10',
  'text-error':     'bg-error/10',
}

export function StatsCard({ title, value, subtitle, trend, icon: Icon, iconColor = 'text-accent', accentColor }: Props) {
  const iconBg = ICON_BG[iconColor] ?? 'bg-accent/10'

  return (
    <div className="relative bg-surface border border-border rounded-card p-5 shadow-card overflow-hidden group hover:shadow-md transition-shadow duration-200">
      {/* Colored left border accent */}
      {accentColor && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-card ${accentColor}`} />
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide truncate">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-text tabular-nums">{value}</p>
          {(subtitle !== undefined || (trend !== undefined && trend !== null)) && (
            <div className="mt-1.5 flex items-center gap-1.5">
              {trend !== null && trend !== undefined && (
                <span className={`inline-flex items-center text-xs font-semibold rounded-full px-1.5 py-0.5 ${
                  trend >= 0
                    ? 'bg-success/10 text-success'
                    : 'bg-error/10 text-error'
                }`}>
                  {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                </span>
              )}
              {subtitle && <span className="text-xs text-muted">{subtitle}</span>}
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-btn ${iconBg} ${iconColor} ml-3 flex-shrink-0`}>
          <Icon size={20} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  )
}
