import { BOOKING_STATUSES } from '@/lib/constants'

interface Props {
  status: string
  className?: string
  dot?: boolean
}

export function StatusBadge({ status, className = '', dot = false }: Props) {
  const cfg = BOOKING_STATUSES[status as keyof typeof BOOKING_STATUSES]
    ?? { label: status, color: 'bg-muted/20 text-muted' }

  if (dot) {
    const dotColor: Record<string, string> = {
      'text-success': 'bg-success',
      'text-warning':  'bg-warning',
      'text-error':    'bg-error',
      'text-amber':    'bg-amber',
      'text-muted':    'bg-muted',
    }
    const colorKey = Object.keys(dotColor).find(k => cfg.color.includes(k)) ?? 'text-muted'
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${colorKey} ${className}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor[colorKey] ?? 'bg-muted'} flex-shrink-0`} />
        {cfg.label}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-chip text-xs font-semibold whitespace-nowrap ${cfg.color} ${className}`}>
      {cfg.label}
    </span>
  )
}
