export type Severity = 'GRAVE' | 'MODERADO' | 'LEVE'

export interface Alert {
  severidade: Severity
  titulo?: string
  descricao: string
  fonte?: string
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
  displayLabel: string
}

export type SidebarView =
  | 'idle'
  | 'reading'
  | 'analyzing'
  | 'results'
  | 'wrong-domain'
  | 'incomplete-data'
  | 'error'
  | 'no-alerts'

export type ErrorType =
  | 'api-unreachable'
  | 'api-error'
  | 'scraping-failed'
  | 'invalid-response'
  | null

export interface AlertCounts {
  grave: number
  moderado: number
  leve: number
}

export interface AttributeNode {
  id: string
  text: string
  isSubItem?: boolean
}

export interface EditablePayload {
  nome: string
  idade: string
  sexo: string
  peso: string
  altura: string
  alergias: string[]
  motivoConsulta: string
  objetivo: string
  avaliacao: string
  problemasCondicoes: string[]
  medicacoes: Array<{ nome: string; posologia: string }>
}

export interface SidebarState {
  view: SidebarView
  patient: Patient | null
  loadedAttributes: AttributeNode[]
  attributes: AttributeNode[]
  alerts: Alert[]
  counts: AlertCounts
  lastAnalyzedAt: Date | null
  scrapedPayload: EditablePayload | null
  errorType: ErrorType
  errorStatus?: number
  missingFields?: string[]
}
