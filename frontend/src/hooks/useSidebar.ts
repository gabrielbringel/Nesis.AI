// Hook que gerencia a UI da sidebar.
//
// O scraping e a chamada ao backend são responsabilidade do content script
// (src/content/content-script.ts), que extrai os dados via XPath no contexto
// da página do eSUS e envia o resultado para cá via chrome.runtime.sendMessage.
//
// Aqui só fazemos:
//   - manter o estado da view (idle/reading/analyzing/results)
//   - ouvir ANALYSIS_COMPLETE / ANALYSIS_ERROR vindas do content script
//   - disparar TRIGGER_SCRAPE quando o usuário clica em "Ler prontuário"

declare const chrome: any
import { useCallback, useEffect, useRef, useState } from 'react'
import { READING_ATTRIBUTES, FALLBACK_ALERTS } from '../mock'
import { getSettings } from '../stores/settingsStore'
import type { Alert, AlertCounts, SidebarState } from '../types'

const INITIAL_STATE: SidebarState = {
  view: 'idle',
  patient: null,
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

function disparaTriggerScrape() {
  if (typeof chrome === 'undefined' || !chrome.tabs) return
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
    const tab = tabs?.[0]
    if (tab?.id != null) {
      chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_SCRAPE' }, () => {
        // ignora chrome.runtime.lastError — content script pode ainda
        // não estar carregado em abas que não sejam do eSUS.
        void chrome.runtime.lastError
      })
    }
  })
}

export function useSidebar() {
  const [state, setState] = useState<SidebarState>(INITIAL_STATE)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoStartedRef = useRef(false)

  // Listener das mensagens enviadas pelo content script.
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return

    const handler = (message: any) => {
      if (!message?.type) return

      if (message.type === 'ANALYSIS_COMPLETE') {
        const alertasRaw: Alert[] = message.payload?.alertas || []
        const sorted = sortAlerts(alertasRaw)
        setState((prev) => ({
          ...prev,
          view: 'results',
          patient: message.paciente || prev.patient,
          alerts: sorted,
          counts: countAlerts(sorted),
          lastAnalyzedAt: new Date(),
        }))
      }

      if (message.type === 'ANALYSIS_ERROR') {
        const sorted = sortAlerts(FALLBACK_ALERTS)
        setState((prev) => ({
          ...prev,
          view: 'results',
          patient: message.paciente || prev.patient,
          alerts: sorted,
          counts: countAlerts(sorted),
          lastAnalyzedAt: new Date(),
        }))
      }
    }

    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  const startReading = useCallback(() => {
    setState((prev) => ({
      ...prev,
      view: 'reading',
      loadedAttributes: [],
    }))

    disparaTriggerScrape()

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
      }
    }, 500)
  }, [])

  const reanalyze = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    startReading()
  }, [startReading])

  useEffect(() => {
    if (autoStartedRef.current) return
    autoStartedRef.current = true
    if (getSettings().autoRead) {
      startReading()
    }
  }, [startReading])

  return { state, startReading, reanalyze }
}
