// Agrupa entries do histórico por dia ("hoje", "ontem", "23 abr").

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function dateLabel(date: Date, today: Date = new Date()): string {
  const d0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = Math.round((d0.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))

  if (diff === 0) return 'hoje'
  if (diff === 1) return 'ontem'
  return `${date.getDate()} ${MESES[date.getMonth()]}`
}

export interface DateGroup<T> {
  label: string
  items: T[]
}

export function groupByDate<T extends { date: Date }>(
  entries: T[],
  today: Date = new Date(),
): DateGroup<T>[] {
  const buckets = new Map<string, T[]>()

  for (const entry of entries) {
    const label = dateLabel(entry.date, today)
    const bucket = buckets.get(label) ?? []
    bucket.push(entry)
    buckets.set(label, bucket)
  }

  return Array.from(buckets.entries()).map(([label, items]) => ({
    label,
    items: items.sort((a, b) => b.date.getTime() - a.date.getTime()),
  }))
}
