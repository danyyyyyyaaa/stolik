import { ChevronUp, ChevronDown } from 'lucide-react'

interface Props {
  label: string
  sortKey: string
  currentSort: string
  currentOrder: 'asc' | 'desc'
  onSort: (key: string) => void
  className?: string
}

export function SortableHeader({ label, sortKey, currentSort, currentOrder, onSort, className = '' }: Props) {
  const active = currentSort === sortKey
  return (
    <th
      className={`text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide cursor-pointer select-none hover:text-text transition-colors whitespace-nowrap ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className="inline-flex flex-col -space-y-0.5">
          <ChevronUp
            size={9}
            className={active && currentOrder === 'asc' ? 'text-accent' : 'text-muted/40'}
          />
          <ChevronDown
            size={9}
            className={active && currentOrder === 'desc' ? 'text-accent' : 'text-muted/40'}
          />
        </span>
      </span>
    </th>
  )
}
