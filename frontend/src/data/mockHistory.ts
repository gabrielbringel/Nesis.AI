import type { AlertCounts } from '../types'

export interface HistoryEntry {
  id: string
  name: string
  date: Date
  alertCounts: AlertCounts
}

function makeDate(daysAgo: number, hour: number, minute: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, 0, 0)
  return d
}

export const MOCK_HISTORY: HistoryEntry[] = [
  {
    id: '1',
    name: 'J. Vitor, 18a',
    date: new Date(),
    alertCounts: { grave: 1, moderado: 1, leve: 1 },
  },
  {
    id: '2',
    name: 'M. Costa, 64a',
    date: makeDate(0, 14, 32),
    alertCounts: { grave: 0, moderado: 1, leve: 0 },
  },
  {
    id: '3',
    name: 'A. Souza, 45a',
    date: makeDate(1, 16, 5),
    alertCounts: { grave: 1, moderado: 0, leve: 1 },
  },
  {
    id: '4',
    name: 'L. Pereira, 72a',
    date: makeDate(1, 11, 20),
    alertCounts: { grave: 0, moderado: 0, leve: 0 },
  },
  {
    id: '5',
    name: 'R. Silva, 33a',
    date: makeDate(5, 9, 15),
    alertCounts: { grave: 0, moderado: 0, leve: 1 },
  },
]
