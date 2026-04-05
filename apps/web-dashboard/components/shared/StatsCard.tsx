import { type LucideIcon } from 'lucide-react'

interface Props {
  title: string
  value: string | number
  subtitle?: string
  trend?: number | null
  icon: LucideIcon
  iconColor?: string
}

export function StatsCard({ title, value, subtitle, trend, icon: Icon, iconColor = 'text-accent' }: Props) {
  return (
    <div className="bg-surface border border-border rounded-card p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted font-medium truncate">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-text">{value}</p>
          {(subtitle || trend !== undefined) && (
            <div className="mt-1 flex items-center gap-1.5">
              {trend !== null && trend !== undefined && (
                <span className={`text-xs font-semibold ${trend >= 0 ? 'text-success' : 'text-error'}`}>
                  {trend >= 0 ? '+' : ''}{trend}%
                </span>
              )}
              {subtitle && <span className="text-xs text-muted">{subtitle}</span>}
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-btn bg-accent-light/20 ${iconColor}`}>
          <Icon size={20} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  )
}
