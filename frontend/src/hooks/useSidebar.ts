declare var chrome: any
import { useCallback, useEffect, useRef, useState } from 'react'
import { scrapeESUSData } from '../scraper/esus-scraper'
import { getSettings } from '../stores/settingsStore'
import { buildPatientLabel, normalizeSexo } from '../utils/format'
import { buildAttributeList } from '../utils/buildAttributeList'
import type { Alert, AlertCounts, EditablePayload, SidebarState } from '../types'

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

function parsePosologia(posologia: string | null) {
  if (!posologia) return { dose: '', frequencia: '', via: '' }
  
  const parts = posologia.split('|').map(s => s.trim())
  const doseFreq = parts[0] || ''
  const via = parts[1] || ''
  
  let dose = ''
  let frequencia = ''
  
  if (doseFreq.includes(',')) {
    const dfParts = doseFreq.split(',')
    dose = dfParts[0].trim()
    frequencia = dfParts.slice(1).join(',').trim()
  } else {
    // Fallback if no comma is found
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

  // Refs para coordenação do paralelismo API + bullets
  const apiResultRef = useRef<{ sorted: Alert[]; counts: AlertCounts } | null>(null)
  const bulletsFinishedRef = useRef(false)

  const transitionToResults = useCallback((sorted: Alert[], counts: AlertCounts) => {
    setState((prev) => ({
      ...prev,
      view: 'results',
      alerts: sorted,
      counts,
      lastAnalyzedAt: new Date(),
    }))
  }, [])

  const startReading = useCallback(async () => {
    // Reset refs
    apiResultRef.current = null
    bulletsFinishedRef.current = false

    setState((prev) => ({
      ...prev,
      view: 'reading',
      loadedAttributes: [],
    }))

    let scraped: ReturnType<typeof scrapeESUSData> | null = null
    let realPatient = { displayLabel: 'Carregando...' }

    try {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab?.id && tab?.url?.startsWith('http')) {
          const injectionResults = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: scrapeESUSData,
          })
          scraped = injectionResults[0]?.result
        }
      }
    } catch (err) {
      console.error('Erro ao ler dados do e-SUS:', err)
    }

    if (!scraped) {
      scraped = {
        paciente: {
          nome: 'Teste Local',
          idade: 30,
          sexo: 'M',
          peso: '70 kg',
          altura: '170 cm',
          alergias: ['Amendoim'],
          motivoConsulta: 'Avaliação de rotina',
          objetivo: 'Check-up',
          avaliacao: 'Paciente relata dor de cabeça',
          problemasCondicoes: ['Hipertensão'],
          medEmUso: ['Losartana 50mg'],
        },
        medicacoes: [
          { nome: 'Dipirona 500mg', posologia: '1 comprimido a cada 6 horas' }
        ],
      }
    }

    if (scraped.paciente?.nome) {
      realPatient = {
        displayLabel: buildPatientLabel(
          scraped.paciente.nome,
          scraped.paciente.sexo,
          scraped.paciente.idade,
        ),
      }
    }

    const payload = buildPayload(scraped)
    const dynamicAttributes = buildAttributeList(scraped)

    setState((prev) => ({
      ...prev,
      patient: realPatient,
      attributes: dynamicAttributes,
      scrapedPayload: buildEditablePayload(scraped),
    }))

    // ── Dispara a API IMEDIATAMENTE (em paralelo com os bullets) ──
    fetch('http://localhost:8000/api/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`)
        const data = await res.json()
        const sorted = sortAlerts(data?.alertas || [])
        const counts = countAlerts(sorted)

        if (bulletsFinishedRef.current) {
          // Bullets já terminaram → transição direta para results
          transitionToResults(sorted, counts)
        } else {
          // Bullets ainda carregando → guarda resultado e espera
          apiResultRef.current = { sorted, counts }
        }
      })
      .catch((error) => {
        console.error('Erro de conexão com a API:', error)
        const sorted: Alert[] = []
        const counts = countAlerts(sorted)

        if (bulletsFinishedRef.current) {
          transitionToResults(sorted, counts)
        } else {
          apiResultRef.current = { sorted, counts }
        }
      })

    // ── Renderização progressiva dos bullets ──
    const attrCount = dynamicAttributes.length
    const baseInterval = attrCount <= 8 ? 800 : 500
    const maxTotalMs = 8000
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
          // API já respondeu → pula "analyzing", vai direto para results
          transitionToResults(apiResultRef.current.sorted, apiResultRef.current.counts)
        } else {
          // API ainda pendente → mostra "analyzing" e aguarda
          setState((prev) => ({ ...prev, view: 'analyzing' }))
        }
      }
    }, intervalMs)
  }, [transitionToResults])

  const reanalyze = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    startReading()
  }, [startReading])

  const reanalyzeWithData = useCallback(async (editedPayload: EditablePayload) => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    setState((prev) => ({ ...prev, view: 'analyzing' }))

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

    try {
      const res = await fetch('http://localhost:8000/api/v1/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      })
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`)
      const data = await res.json()
      const sorted = sortAlerts(data?.alertas || [])
      const counts = countAlerts(sorted)
      const newLabel = buildPatientLabel(
        editedPayload.nome,
        editedPayload.sexo,
        parseInt(editedPayload.idade) || 0,
      )
      setState((prev) => ({
        ...prev,
        view: 'results',
        patient: { displayLabel: newLabel },
        alerts: sorted,
        counts,
        lastAnalyzedAt: new Date(),
        scrapedPayload: editedPayload,
      }))
    } catch (err) {
      console.error('Erro ao reanalisar com dados editados:', err)
      setState((prev) => ({
        ...prev,
        view: 'results',
        alerts: [],
        counts: { grave: 0, moderado: 0, leve: 0 },
        lastAnalyzedAt: new Date(),
      }))
    }
  }, [])

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

  return { state, startReading, reanalyze, reanalyzeWithData }
}
