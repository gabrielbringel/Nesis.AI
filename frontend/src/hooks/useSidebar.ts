declare var chrome: any
import { useCallback, useEffect, useRef, useState } from 'react'
import { READING_ATTRIBUTES } from '../mock'
import { scrapeESUSData } from '../scraper/esus-scraper'
import { getSettings } from '../stores/settingsStore'
import { buildPatientLabel, normalizeSexo } from '../utils/format'
import type { Alert, AlertCounts, SidebarState } from '../types'

const ESUS_URL_RE = /lista-atendimento\/atendimento/

const INITIAL_STATE: SidebarState = {
  view: 'idle',
  patient: { displayLabel: 'Carregando...' },
  loadedAttributes: [],
  totalAttributes: READING_ATTRIBUTES,
  alerts: [],
  counts: { grave: 0, moderado: 0, leve: 0 },
  lastAnalyzedAt: null,
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

export function useSidebar() {
  const [state, setState] = useState<SidebarState>(INITIAL_STATE)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoStartedRef = useRef(false)

  const performAnalysis = async () => {
    let payload: ReturnType<typeof buildPayload> | null = null
    let realPatient = { displayLabel: 'Carregando...' }

    try {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (!tab?.id || !tab?.url?.startsWith('http')) {
          console.error('[NesisAI] Aba inválida:', tab?.url)
          return { data: { alertas: [] }, payload: null }
        }
        const injectionResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: scrapeESUSData,
        })

        const scraped = injectionResults[0]?.result
        if (scraped && scraped.paciente?.nome) {
          realPatient = {
            displayLabel: buildPatientLabel(
              scraped.paciente.nome,
              scraped.paciente.sexo,
              scraped.paciente.idade,
            ),
          }
          payload = buildPayload(scraped)
        }
      }
    } catch (err) {
      console.error('Erro ao ler dados do e-SUS:', err)
    }

    // Fora da extensão (dev local): payload mínimo para o backend resolver.
    if (!payload) {
      payload = {
        paciente: {
          nome: 'Teste Local',
          idade: 30,
          sexo: '?',
          peso: null,
          altura: null,
          alergias: [],
          motivo_consulta: null,
          objetivo: null,
          avaliacao: null,
          problemas_condicoes: [],
        },
        medicacoes: [],
      }
    }

    setState((prev) => ({ ...prev, patient: realPatient }))

    try {
      const res = await fetch('http://localhost:8000/api/v1/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`)
      const data = await res.json()
      return { data, payload }
    } catch (error) {
      console.error('Erro de conexão com a API:', error)
      return { data: { alertas: [] }, payload }
    }
  }

  const startReading = useCallback(() => {
    setState((prev) => ({
      ...prev,
      view: 'reading',
      loadedAttributes: [],
    }))

    const apiPromise = performAnalysis()

    let idx = 0
    intervalRef.current = setInterval(() => {
      idx++
      setState((prev) => ({
        ...prev,
        loadedAttributes: READING_ATTRIBUTES.slice(0, idx),
      }))

      if (idx >= READING_ATTRIBUTES.length) {
        clearInterval(intervalRef.current!)
        setState((prev) => ({ ...prev, view: 'analyzing' }))

        apiPromise.then(({ data: response }) => {
          const sorted = sortAlerts(response?.alertas || [])
          setState((prev) => ({
            ...prev,
            view: 'results',
            alerts: sorted,
            counts: countAlerts(sorted),
            lastAnalyzedAt: new Date(),
          }))
        })
      }
    }, 500)
  }, [])

  const reanalyze = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    startReading()
  }, [startReading])

  // Auto-start: dispara apenas se autoRead estiver ativo E a aba ativa for
  // uma página de atendimento do eSUS. Em tabs fora do eSUS o panel fica idle.
  useEffect(() => {
    if (autoStartedRef.current) return
    autoStartedRef.current = true

    if (!getSettings().autoRead) return

    const tryAutoStart = async () => {
      try {
        if (typeof chrome === 'undefined' || !chrome.tabs) {
          startReading()
          return
        }
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

  return { state, startReading, reanalyze }
}
