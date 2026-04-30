export type Severity = 'GRAVE' | 'MODERADO' | 'LEVE'

export interface Alert {
  severidade: Severity
  descricao: string
  medicamentos_envolvidos: string[]
  recomendacao: string
}

export interface AnalyzeResponse {
  alertas: Alert[]
  total_grave: number
  total_moderado: number
  total_leve: number
}

export interface Patient {
  abbreviated: string
  age: number
}

export type SidebarView = 'idle' | 'reading' | 'analyzing' | 'results'

export interface AlertCounts {
  grave: number
  moderado: number
  leve: number
}

export interface SidebarState {
  view: SidebarView
  patient: Patient | null
  loadedAttributes: string[]
  totalAttributes: string[]
  alerts: Alert[]
  counts: AlertCounts
  lastAnalyzedAt: Date | null
}
