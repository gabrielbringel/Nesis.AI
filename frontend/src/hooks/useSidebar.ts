declare var chrome: any
import { useCallback, useEffect, useRef, useState } from 'react'
import { scrapeESUSData } from '../scraper/esus-scraper'
import { getSettings } from '../stores/settingsStore'
import { addRecord } from '../stores/historyStore'
import type { AnalysisRecord } from '../stores/historyStore'
import { buildPatientLabel, normalizeSexo } from '../utils/format'
import { buildAttributeList } from '../utils/buildAttributeList'
import type { ScrapedResult } from '../scraper/esus-scraper'
import type { Alert, AlertCounts, EditablePayload, ErrorType, SidebarState } from '../types'

const ESUS_URL_RE = /lista-atendimento\/atendimento/

const INITIAL_STATE: SidebarState = {
  view: 'idle',
  patient: { displayLabel: 'Carregando...' },
  loadedAttributes: [],
  attributes: [],
  alerts: [],
  counts: { grave: 0, moderado: 0, leve: 0 },
  lastAnalyzedAt: null,
  scrapedPayload: null,
  errorType: null,
}

type ApiOutcome =
  | { kind: 'results'; sorted: Alert[]; counts: AlertCounts }
  | { kind: 'no-alerts' }
  | { kind: 'error'; errorType: NonNullable<ErrorType>; errorStatus?: number }

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

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function parsePosologia(posologia: string | null) {
  if (!posologia) return { dose: '', frequencia: '', via: '' }

  const parts = posologia.split('|').map((s) => s.trim())
  const doseFreq = parts[0] || ''
  const via = parts[1] || ''

  let dose = ''
  let frequencia = ''

  if (doseFreq.includes(',')) {
    const dfParts = doseFreq.split(',')
    dose = dfParts[0].trim()
    frequencia = dfParts.slice(1).join(',').trim()
  } else {
    dose = doseFreq
  }

  return { dose, frequencia, via }
}

function buildEditablePayload(scraped: ReturnType<typeof scrapeESUSData>): EditablePayload {
  const p = scraped.paciente
  return {
    nome: p.nome || '',
    idade: p.idade != null ? String(p.idade) : '',
    sexo: p.sexo || '',
    peso: p.peso || '',
    altura: p.altura || '',
    alergias: p.alergias || [],
    motivoConsulta: p.motivoConsulta || '',
    objetivo: p.objetivo || '',
    avaliacao: p.avaliacao || '',
    problemasCondicoes: p.problemasCondicoes || [],
    medicacoes: scraped.medicacoes.map((m) => ({ nome: m.nome, posologia: m.posologia || '' })),
  }
}

function editableToScraped(payload: EditablePayload): ScrapedResult {
  return {
    paciente: {
      nome: payload.nome || null,
      idade: parseInt(payload.idade) || null,
      sexo: payload.sexo || null,
      peso: payload.peso || null,
      altura: payload.altura || null,
      alergias: payload.alergias,
      motivoConsulta: payload.motivoConsulta || null,
      objetivo: payload.objetivo || null,
      avaliacao: payload.avaliacao || null,
      problemasCondicoes: payload.problemasCondicoes,
      medEmUso: [],
    },
    medicacoes: payload.medicacoes.map((m) => ({ nome: m.nome, posologia: m.posologia })),
  }
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
      alergias: p.alergias || [],
      motivo_consulta: p.motivoConsulta,
      objetivo: p.objetivo,
      avaliacao: p.avaliacao,
      problemas_condicoes: p.problemasCondicoes || [],
      med_em_uso: p.medEmUso || [],
    },
    medicacoes: scraped.medicacoes.map((m) => {
      const parsed = parsePosologia(m.posologia)
      return {
        nome: m.nome,
        dose: parsed.dose,
        frequencia: parsed.frequencia,
        via: parsed.via,
        posologia_completa: m.posologia || null,
      }
    }),
  }
}

export function useSidebar() {
  const [state, setState] = useState<SidebarState>(INITIAL_STATE)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoStartedRef = useRef(false)

  // Coordination refs for API + bullets parallelism
  const apiResultRef = useRef<ApiOutcome | null>(null)
  const bulletsFinishedRef = useRef(false)
  // Alertas to save when bullets finish (set when API returns before bullets)
  const pendingAlertasRef = useRef<Alert[] | null>(null)

  // Stores scraped data for the "analyze anyway" path from incomplete-data
  const scrapedRef = useRef<ReturnType<typeof scrapeESUSData> | null>(null)

  // When non-null, "Reanalisar" re-uses this payload instead of scraping
  const reanalyzePayloadRef = useRef<EditablePayload | null>(null)

  const applyOutcome = useCallback((outcome: ApiOutcome) => {
    if (outcome.kind === 'results') {
      setState((prev) => ({
        ...prev,
        view: 'results',
        alerts: outcome.sorted,
        counts: outcome.counts,
        lastAnalyzedAt: new Date(),
        errorType: null,
      }))
    } else if (outcome.kind === 'no-alerts') {
      setState((prev) => ({
        ...prev,
        view: 'no-alerts',
        alerts: [],
        counts: { grave: 0, moderado: 0, leve: 0 },
        lastAnalyzedAt: new Date(),
        errorType: null,
      }))
    } else {
      setState((prev) => ({
        ...prev,
        view: 'error',
        errorType: outcome.errorType,
        errorStatus: outcome.errorStatus,
      }))
    }
  }, [])

  const runAnalysis = useCallback(
    (scraped: ReturnType<typeof scrapeESUSData>, patient: { displayLabel: string }) => {
      apiResultRef.current = null
      bulletsFinishedRef.current = false
      pendingAlertasRef.current = null
      reanalyzePayloadRef.current = null
      if (intervalRef.current) clearInterval(intervalRef.current)

      const payload = buildPayload(scraped)
      const editablePayload = buildEditablePayload(scraped)
      const dynamicAttributes = buildAttributeList(scraped)

      setState((prev) => ({
        ...prev,
        view: 'reading',
        patient,
        attributes: dynamicAttributes,
        scrapedPayload: editablePayload,
        loadedAttributes: [],
        errorType: null,
      }))

      const saveRecord = (alertas: Alert[]) => {
        addRecord({
          id: generateId(),
          timestamp: Date.now(),
          patient: {
            displayLabel: patient.displayLabel,
            nome: scraped.paciente.nome ?? '',
            idade: scraped.paciente.idade ?? 0,
          },
          alertas,
          scrapedData: editablePayload,
          payload,
        } satisfies AnalysisRecord)
      }

      // ── API call (parallel with bullets) ──
      fetch('http://localhost:8000/api/v1/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          let outcome: ApiOutcome

          if (!res.ok) {
            outcome = { kind: 'error', errorType: 'api-error', errorStatus: res.status }
          } else {
            const data = await res.json()
            if (!Array.isArray(data?.alertas)) {
              outcome = { kind: 'error', errorType: 'invalid-response' }
            } else if (data.alertas.length === 0) {
              outcome = { kind: 'no-alerts' }
            } else {
              const sorted = sortAlerts(data.alertas)
              outcome = { kind: 'results', sorted, counts: countAlerts(sorted) }
            }
          }

          if (bulletsFinishedRef.current) {
            if (outcome.kind !== 'error') {
              saveRecord(outcome.kind === 'results' ? outcome.sorted : [])
            }
            applyOutcome(outcome)
          } else if (outcome.kind === 'error') {
            // Errors apply immediately — stop bullets
            clearInterval(intervalRef.current!)
            applyOutcome(outcome)
          } else {
            apiResultRef.current = outcome
            pendingAlertasRef.current = outcome.kind === 'results' ? outcome.sorted : []
          }
        })
        .catch(() => {
          clearInterval(intervalRef.current!)
          applyOutcome({ kind: 'error', errorType: 'api-unreachable' })
        })

      // ── Progressive bullet rendering ──
      const attrCount = dynamicAttributes.length
      const baseInterval = attrCount <= 8 ? 1000 : 650
      const maxTotalMs = 10000
      const intervalMs = Math.min(baseInterval, Math.floor(maxTotalMs / Math.max(attrCount, 1)))

      let idx = 0
      intervalRef.current = setInterval(() => {
        idx++
        setState((prev) => ({
          ...prev,
          loadedAttributes: dynamicAttributes.slice(0, idx),
        }))

        if (idx >= dynamicAttributes.length) {
          clearInterval(intervalRef.current!)
          bulletsFinishedRef.current = true

          if (apiResultRef.current) {
            if (pendingAlertasRef.current !== null) {
              saveRecord(pendingAlertasRef.current)
            }
            applyOutcome(apiResultRef.current)
          } else {
            setState((prev) => ({ ...prev, view: 'analyzing' }))
          }
        }
      }, intervalMs)
    },
    [applyOutcome],
  )

  const startReading = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    reanalyzePayloadRef.current = null
    setState((prev) => ({ ...prev, view: 'reading', loadedAttributes: [], errorType: null }))

    let scraped: ReturnType<typeof scrapeESUSData> | null = null

    try {
      if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
        setState((prev) => ({ ...prev, view: 'wrong-domain' }))
        return
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab?.url || !ESUS_URL_RE.test(tab.url)) {
        setState((prev) => ({ ...prev, view: 'wrong-domain' }))
        return
      }

      if (tab.id && tab.url.startsWith('http')) {
        const injectionResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: scrapeESUSData,
        })
        scraped = injectionResults[0]?.result ?? null
      }
    } catch (err) {
      console.error('Erro ao ler dados do e-SUS:', err)
      setState((prev) => ({ ...prev, view: 'error', errorType: 'scraping-failed' }))
      return
    }

    if (!scraped) {
      setState((prev) => ({ ...prev, view: 'error', errorType: 'scraping-failed' }))
      return
    }

    const missingFields: string[] = []
    if (!scraped.paciente?.nome) missingFields.push('Nome do paciente ausente')
    if (!scraped.medicacoes || scraped.medicacoes.length === 0) missingFields.push('Prescrição não detectada')

    if (missingFields.length > 0) {
      scrapedRef.current = scraped
      setState((prev) => ({
        ...prev,
        view: 'incomplete-data',
        scrapedPayload: buildEditablePayload(scraped!),
        missingFields,
        errorType: null,
      }))
      return
    }

    const patient = {
      displayLabel: buildPatientLabel(
        scraped.paciente.nome,
        scraped.paciente.sexo,
        scraped.paciente.idade,
      ),
    }

    runAnalysis(scraped, patient)
  }, [runAnalysis])

  const reanalyzeWithData = useCallback(async (editedPayload: EditablePayload) => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    const newLabel = buildPatientLabel(
      editedPayload.nome,
      editedPayload.sexo,
      parseInt(editedPayload.idade) || 0,
    )
    const dynAttrs = buildAttributeList(editableToScraped(editedPayload))

    setState((prev) => ({
      ...prev,
      view: 'analyzing',
      errorType: null,
      patient: { displayLabel: newLabel },
      attributes: dynAttrs,
      scrapedPayload: editedPayload,
    }))

    const apiPayload = {
      paciente: {
        nome: editedPayload.nome || 'Desconhecido',
        idade: parseInt(editedPayload.idade) || 0,
        sexo: normalizeSexo(editedPayload.sexo),
        peso: editedPayload.peso || null,
        altura: editedPayload.altura || null,
        alergias: editedPayload.alergias.filter((a) => a.trim()),
        motivo_consulta: editedPayload.motivoConsulta || null,
        objetivo: editedPayload.objetivo || null,
        avaliacao: editedPayload.avaliacao || null,
        problemas_condicoes: editedPayload.problemasCondicoes.filter((p) => p.trim()),
        med_em_uso: [],
      },
      medicacoes: editedPayload.medicacoes
        .filter((m) => m.nome.trim())
        .map((m) => {
          const parsed = parsePosologia(m.posologia)
          return {
            nome: m.nome,
            dose: parsed.dose,
            frequencia: parsed.frequencia,
            via: parsed.via,
            posologia_completa: m.posologia || null,
          }
        }),
    }

    const saveRecord = (alertas: Alert[]) => {
      addRecord({
        id: generateId(),
        timestamp: Date.now(),
        patient: {
          displayLabel: newLabel,
          nome: editedPayload.nome,
          idade: parseInt(editedPayload.idade) || 0,
        },
        alertas,
        scrapedData: editedPayload,
        payload: apiPayload,
      })
    }

    try {
      const res = await fetch('http://localhost:8000/api/v1/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      })
      if (!res.ok) {
        setState((prev) => ({ ...prev, view: 'error', errorType: 'api-error', errorStatus: res.status }))
        return
      }
      const data = await res.json()
      if (!Array.isArray(data?.alertas)) {
        setState((prev) => ({ ...prev, view: 'error', errorType: 'invalid-response' }))
        return
      }
      const sorted = sortAlerts(data.alertas)
      const counts = countAlerts(sorted)

      if (sorted.length === 0) {
        saveRecord([])
        setState((prev) => ({
          ...prev,
          view: 'no-alerts',
          patient: { displayLabel: newLabel },
          alerts: [],
          counts: { grave: 0, moderado: 0, leve: 0 },
          lastAnalyzedAt: new Date(),
          scrapedPayload: editedPayload,
          errorType: null,
        }))
      } else {
        saveRecord(sorted)
        setState((prev) => ({
          ...prev,
          view: 'results',
          patient: { displayLabel: newLabel },
          alerts: sorted,
          counts,
          lastAnalyzedAt: new Date(),
          scrapedPayload: editedPayload,
          errorType: null,
        }))
      }
    } catch {
      setState((prev) => ({ ...prev, view: 'error', errorType: 'api-unreachable' }))
    }
  }, [])

  const reanalyze = useCallback(() => {
    const histPayload = reanalyzePayloadRef.current
    if (histPayload) {
      reanalyzeWithData(histPayload)
    } else {
      startReading()
    }
  }, [startReading, reanalyzeWithData])

  const analyzeAnyway = useCallback(() => {
    const scraped = scrapedRef.current
    if (!scraped) return
    const patient = scraped.paciente?.nome
      ? {
          displayLabel: buildPatientLabel(
            scraped.paciente.nome,
            scraped.paciente.sexo,
            scraped.paciente.idade,
          ),
        }
      : { displayLabel: 'Paciente' }
    runAnalysis(scraped, patient)
  }, [runAnalysis])

  const fillManually = useCallback(() => {
    setState((prev) => ({
      ...prev,
      view: 'results',
      alerts: [],
      counts: { grave: 0, moderado: 0, leve: 0 },
      lastAnalyzedAt: null,
      errorType: null,
    }))
  }, [])

  const loadRecord = useCallback((record: AnalysisRecord) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    reanalyzePayloadRef.current = record.scrapedData
    setState((prev) => ({
      ...prev,
      view: 'results',
      patient: { displayLabel: record.patient.displayLabel },
      alerts: sortAlerts(record.alertas),
      counts: countAlerts(record.alertas),
      lastAnalyzedAt: new Date(record.timestamp),
      scrapedPayload: record.scrapedData,
      errorType: null,
    }))
  }, [])

  const goToIdle = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setState((prev) => ({ ...prev, view: 'idle', errorType: null }))
  }, [])

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

  return { state, startReading, reanalyze, reanalyzeWithData, analyzeAnyway, fillManually, goToIdle, loadRecord }
}
