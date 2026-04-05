import { BOOKING_STATUSES } from '@/lib/constants'

interface Props {
  status: string
  className?: string
}

export function StatusBadge({ status, className = '' }: Props) {
  const cfg = BOOKING_STATUSES[status as keyof typeof BOOKING_STATUSES]
    ?? { label: status, color: 'bg-muted/20 text-muted' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-chip text-xs font-semibold ${cfg.color} ${className}`}>
      {cfg.label}
    </span>
  )
}
