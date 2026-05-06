export type Severity = 'GRAVE' | 'MODERADO' | 'LEVE'

export interface AlternativaSegura {
  medicamento: string
  justificativa: string
}

export interface Alert {
  severidade: Severity
  titulo?: string
  descricao: string
  medicamentos_envolvidos: string[]
  recomendacao: string
  alternativas_seguras?: AlternativaSegura[]
}

export interface AnalyzeResponse {
  alertas: Alert[]
  total_grave: number
  total_moderado: number
  total_leve: number
}

export interface Patient {
  displayLabel: string
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
