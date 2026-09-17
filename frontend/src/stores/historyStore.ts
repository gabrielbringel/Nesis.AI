import type { Alert, EditablePayload } from '../types'
import { createSeedRecords } from '../data/seedHistory'

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

export async function resetMemory(): Promise<void> {
  localStorage.removeItem(KEY)
  seedHistory()
}

export function seedHistory(): void {
  if (getHistory().length > 0) return
  const records = createSeedRecords()
  for (let i = records.length - 1; i >= 0; i--) {
    addRecord(records[i])
  }
}
