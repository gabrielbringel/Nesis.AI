import { useCallback, useEffect, useRef, useState } from 'react'
import { callAnalyze } from '../api/analyze'
import { READING_ATTRIBUTES } from '../mock'
import { getSettings } from '../stores/settingsStore'
import type { Alert, AlertCounts, SidebarState } from '../types'

const INITIAL_STATE: SidebarState = {
  view: 'idle',
  patient: { abbreviated: 'J. Vitor', age: 18 },
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
  return [...alerts].sort((a, b) => order[a.severidade] - order[b.severidade])
}

export function useSidebar() {
  const [state, setState] = useState<SidebarState>(INITIAL_STATE)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoStartedRef = useRef(false)

  const startReading = useCallback(() => {
    setState((prev) => ({
      ...prev,
      view: 'reading',
      loadedAttributes: [],
    }))

    // Kick off API call immediately (runs in background while reading animation plays)
    const apiPromise = callAnalyze()

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

        apiPromise.then((response) => {
          const sorted = sortAlerts(response.alertas)
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
    setState((prev) => ({
      ...prev,
      view: 'reading',
      loadedAttributes: [],
      alerts: [],
    }))

    const apiPromise = callAnalyze()

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

        apiPromise.then((response) => {
          const sorted = sortAlerts(response.alertas)
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

  // Leitura automática: se a flag estiver ligada, pula o estado IDLE
  // disparando startReading no primeiro render. autoStartedRef evita
  // re-disparo no StrictMode (que executa effects duas vezes em dev).
  useEffect(() => {
    if (autoStartedRef.current) return
    autoStartedRef.current = true
    if (getSettings().autoRead) {
      startReading()
    }
  }, [startReading])

  return { state, startReading, reanalyze }
}
