interface Props {
  children: React.ReactNode
  className?: string
}

/**
 * Wraps a <table> with the standard card container + responsive horizontal scroll.
 * Usage: <TableWrapper><table>...</table></TableWrapper>
 */
export function TableWrapper({ children, className = '' }: Props) {
  return (
    <div className={`bg-surface border border-border rounded-card shadow-card overflow-hidden ${className}`}>
      <div className="overflow-x-auto scrollbar-none">
        {children}
      </div>
    </div>
  )
}

/** Standard <th> for non-sortable columns */
export function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap ${className}`}>
      {children}
    </th>
  )
}
