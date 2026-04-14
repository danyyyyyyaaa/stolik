import { type LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  compact?: boolean
}

export function EmptyState({ icon: Icon, title, description, action, compact = false }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-10 px-4' : 'py-16 px-4'}`}>
      <div className="p-3.5 rounded-full bg-surface-2 mb-4 ring-1 ring-border">
        <Icon size={compact ? 24 : 28} className="text-muted" strokeWidth={1.5} />
      </div>
      <h3 className={`font-semibold text-text mb-1.5 ${compact ? 'text-sm' : 'text-base'}`}>{title}</h3>
      {description && (
        <p className={`text-muted max-w-xs ${compact ? 'text-xs' : 'text-sm'}`}>{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
