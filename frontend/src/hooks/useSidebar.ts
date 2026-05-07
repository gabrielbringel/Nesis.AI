declare var chrome: any
import { useCallback, useEffect, useRef, useState } from 'react'
import { READING_ATTRIBUTES } from '../constants'
import { scrapeESUSData } from '../scraper/esus-scraper'
import { getSettings } from '../stores/settingsStore'
import { buildPatientLabel, normalizeSexo } from '../utils/format'
import type { Alert, AlertCounts, ErrorType, Patient, SidebarState } from '../types'

const ESUS_URL_RE = /lista-atendimento\/atendimento/

const INITIAL_STATE: SidebarState = {
  view: 'idle',
  patient: null,
  loadedAttributes: [],
  totalAttributes: READING_ATTRIBUTES,
  alerts: [],
  counts: { grave: 0, moderado: 0, leve: 0 },
  lastAnalyzedAt: null,
  errorType: null,
}

function countAlerts(alerts: Alert[]): AlertCounts {
  return {
    grave: alerts.filter((a) => a.severidade === 'GRAVE').length,
    moderado: alerts.filter((a) => a.severidade === 'MODERADO').length,
    leve: alerts.filter((a) => a.severidade === 'LEVE').length,
  }
}

function sortAlerts(alerts: Alert[]): Alert[] {
  const order = { GRAVE: 0, MODERADO: 1, LEVE: 2 }
  return [...alerts].sort(
    (a, b) =>
      (order[a.severidade as keyof typeof order] ?? 3) -
      (order[b.severidade as keyof typeof order] ?? 3),
  )
}

function buildPayload(scraped: ReturnType<typeof scrapeESUSData>) {
  const p = scraped.paciente
  return {
    paciente: {
      nome: p.nome || 'Desconhecido',
      idade: p.idade ?? 0,
      sexo: normalizeSexo(p.sexo),
      peso: p.peso,
      altura: p.altura,
      alergias: p.alergias,
      motivo_consulta: p.motivoConsulta,
      objetivo: p.objetivo,
      avaliacao: p.avaliacao,
      problemas_condicoes: p.problemasCondicoes,
    },
    medicacoes: scraped.medicacoes.map((m) => ({
      nome: m.nome,
      dose: '',
      frequencia: '',
      via: '',
      posologia_completa: m.posologia || null,
    })),
  }
}

type ApiResult =
  | { type: 'ok'; alertas: Alert[] }
  | { type: 'api-error'; status: number }
  | { type: 'api-unreachable' }
  | { type: 'invalid-response' }

async function callApi(payload: object): Promise<ApiResult> {
  try {
    const res = await fetch('http://localhost:8000/api/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return { type: 'api-error', status: res.status }
    const data = await res.json()
    if (!data || !Array.isArray(data.alertas)) return { type: 'invalid-response' }
    return { type: 'ok', alertas: data.alertas }
  } catch {
    return { type: 'api-unreachable' }
  }
}

export function useSidebar() {
  const [state, setState] = useState<SidebarState>(INITIAL_STATE)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoStartedRef = useRef(false)
  const pendingPayloadRef = useRef<object | null>(null)
  const pendingPatientRef = useRef<Patient | null>(null)

  const runAnalysis = useCallback((payload: object, patient: Patient) => {
    setState((prev) => ({ ...prev, view: 'reading', loadedAttributes: [], patient }))

    const apiPromise = callApi(payload)

    let idx = 0
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      idx++
      setState((prev) => ({
        ...prev,
        loadedAttributes: READING_ATTRIBUTES.slice(0, idx),
      }))

      if (idx >= READING_ATTRIBUTES.length) {
        clearInterval(intervalRef.current!)
        setState((prev) => ({ ...prev, view: 'analyzing' }))

        apiPromise.then((result) => {
          if (result.type === 'ok') {
            const sorted = sortAlerts(result.alertas)
            if (sorted.length === 0) {
              setState((prev) => ({
                ...prev,
                view: 'no-alerts',
                alerts: [],
                counts: { grave: 0, moderado: 0, leve: 0 },
              }))
            } else {
              setState((prev) => ({
                ...prev,
                view: 'results',
                alerts: sorted,
                counts: countAlerts(sorted),
                lastAnalyzedAt: new Date(),
              }))
            }
          } else if (result.type === 'api-error') {
            setState((prev) => ({
              ...prev,
              view: 'error',
              errorType: 'api-error' as ErrorType,
              errorStatus: result.status,
            }))
          } else if (result.type === 'api-unreachable') {
            setState((prev) => ({
              ...prev,
              view: 'error',
              errorType: 'api-unreachable' as ErrorType,
            }))
          } else {
            setState((prev) => ({
              ...prev,
              view: 'error',
              errorType: 'invalid-response' as ErrorType,
            }))
          }
        })
      }
    }, 500)
  }, [])

  const startReading = useCallback(async () => {
    // 1. Check URL domain
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (!tab?.url || !ESUS_URL_RE.test(tab.url)) {
          setState({ ...INITIAL_STATE, view: 'wrong-domain' })
          return
        }
      } catch {
        // Cannot query tabs — proceed; scraping step will surface the error
      }
    }

    // 2. Scrape DOM
    let scraped: ReturnType<typeof scrapeESUSData> | null = null
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (!tab?.id) {
          setState({ ...INITIAL_STATE, view: 'error', errorType: 'scraping-failed' })
          return
        }
        const injectionResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: scrapeESUSData,
        })
        scraped = injectionResults[0]?.result ?? null
        if (!scraped) {
          setState({ ...INITIAL_STATE, view: 'error', errorType: 'scraping-failed' })
          return
        }
      } catch {
        setState({ ...INITIAL_STATE, view: 'error', errorType: 'scraping-failed' })
        return
      }
    } else {
      // Outside extension context (dev mode without chrome APIs)
      setState({ ...INITIAL_STATE, view: 'error', errorType: 'scraping-failed' })
      return
    }

    // 3. Check critical fields before calling API
    const missingFields: string[] = []
    if (!scraped.paciente.nome) missingFields.push('Nome do paciente ausente')
    if (scraped.medicacoes.length === 0) missingFields.push('Prescrição não detectada')

    const patient: Patient = scraped.paciente.nome
      ? {
          displayLabel: buildPatientLabel(
            scraped.paciente.nome,
            scraped.paciente.sexo,
            scraped.paciente.idade,
          ),
        }
      : { displayLabel: 'Paciente' }

    if (missingFields.length > 0) {
      const payload = buildPayload(scraped)
      pendingPayloadRef.current = payload
      pendingPatientRef.current = patient
      setState({ ...INITIAL_STATE, view: 'incomplete-data', missingFields, patient })
      return
    }

    // 4. All good — run reading animation + API call
    runAnalysis(buildPayload(scraped), patient)
  }, [runAnalysis])

  const analyzeAnyway = useCallback(() => {
    const payload = pendingPayloadRef.current
    const patient = pendingPatientRef.current
    if (!payload || !patient) return
    runAnalysis(payload, patient)
  }, [runAnalysis])

  const fillManually = useCallback(() => {
    setState((prev) => ({
      ...prev,
      view: 'results',
      alerts: [],
      counts: { grave: 0, moderado: 0, leve: 0 },
    }))
  }, [])

  const goToIdle = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setState(INITIAL_STATE)
  }, [])

  const reanalyze = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    startReading()
  }, [startReading])

  // Auto-start: fires only when autoRead is enabled and the active tab is an eSUS atendimento page
  useEffect(() => {
    if (autoStartedRef.current) return
    autoStartedRef.current = true

    if (!getSettings().autoRead) return

    const tryAutoStart = async () => {
      try {
        if (typeof chrome === 'undefined' || !chrome.tabs) return
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab?.url && ESUS_URL_RE.test(tab.url)) {
          startReading()
        }
      } catch (err) {
        console.error('[NesisAI] auto-start falhou:', err)
      }
    }
    tryAutoStart()
  }, [startReading])

  return { state, startReading, reanalyze, analyzeAnyway, fillManually, goToIdle }
}
