import type { AlertCounts } from '../types'

export interface HistoryEntry {
  id: string
  // Nome completo do paciente. A UI abrevia via utils/format#abbreviateName.
  fullName: string
  sexo: string // "H" | "M" | "?"
  idade: number
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
    fullName: 'José Vitor Ramalho',
    sexo: 'H',
    idade: 18,
    date: new Date(),
    alertCounts: { grave: 1, moderado: 1, leve: 1 },
  },
  {
    id: '2',
    fullName: 'Maria Costa Albuquerque',
    sexo: 'M',
    idade: 64,
    date: makeDate(0, 14, 32),
    alertCounts: { grave: 0, moderado: 1, leve: 0 },
  },
  {
    id: '3',
    fullName: 'Antônio dos Santos Souza',
    sexo: 'H',
    idade: 45,
    date: makeDate(1, 16, 5),
    alertCounts: { grave: 1, moderado: 0, leve: 1 },
  },
  {
    id: '4',
    fullName: 'Lúcia Pereira da Silva',
    sexo: 'M',
    idade: 72,
    date: makeDate(1, 11, 20),
    alertCounts: { grave: 0, moderado: 0, leve: 0 },
  },
  {
    id: '5',
    fullName: 'Roberto Silva Mendes',
    sexo: 'H',
    idade: 33,
    date: makeDate(5, 9, 15),
    alertCounts: { grave: 0, moderado: 0, leve: 1 },
  },
]
