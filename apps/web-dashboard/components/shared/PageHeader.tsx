interface Props {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, description, actions }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-text leading-tight tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted leading-relaxed">{description}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  )
}
