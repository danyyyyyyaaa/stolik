export interface ExportColumn {
  key: string
  label: string
}

export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  columns: ExportColumn[],
) {
  const BOM = '\ufeff' // UTF-8 BOM for Excel
  const header = columns.map(c => csvEscape(c.label)).join(',')
  const rows = data.map(row =>
    columns
      .map(c => {
        const val = row[c.key] ?? ''
        return csvEscape(String(val))
      })
      .join(','),
  )
  const csv = BOM + [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `dinto_${filename}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
