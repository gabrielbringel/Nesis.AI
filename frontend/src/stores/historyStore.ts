import type { Alert, EditablePayload } from '../types'

export interface AnalysisRecord {
  id: string
  timestamp: number
  patient: {
    displayLabel: string
    nome: string
    idade: number
  }
  alertas: Alert[]
  scrapedData: EditablePayload
  payload: unknown
}

const KEY = 'nesis_history'

export function getHistory(): AnalysisRecord[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function addRecord(record: AnalysisRecord): void {
  const history = getHistory()
  history.unshift(record)
  localStorage.setItem(KEY, JSON.stringify(history))
}

export function deleteRecord(id: string): void {
  const history = getHistory().filter((r) => r.id !== id)
  localStorage.setItem(KEY, JSON.stringify(history))
}

export function getRecord(id: string): AnalysisRecord | null {
  return getHistory().find((r) => r.id === id) ?? null
}

export async function resetMemory(): Promise<void> {
  localStorage.removeItem(KEY)
  const { seedHistory } = await import('../data/seedHistory')
  seedHistory()
}
