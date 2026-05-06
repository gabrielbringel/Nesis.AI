// Store global de configurações persistidas em localStorage.
//
// Usa useSyncExternalStore para compartilhar estado entre componentes sem
// precisar de Context — qualquer componente que chamar useSettings() recebe
// o snapshot atual e re-renderiza quando os valores mudam.

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'nesis_settings'

export interface Settings {
  autoRead: boolean
  darkMode: boolean
}

const DEFAULTS: Settings = {
  autoRead: false,
  darkMode: false,
}

function load(): Settings {
  if (typeof localStorage === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw)
    return { ...DEFAULTS, ...parsed }
  } catch {
    return DEFAULTS
  }
}

function persist(value: Settings) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // localStorage cheio ou indisponível — sem fallback necessário.
  }
}

let state: Settings = load()
const listeners = new Set<() => void>()

function setState(next: Settings) {
  state = next
  persist(next)
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): Settings {
  return state
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function toggleAutoRead() {
  setState({ ...state, autoRead: !state.autoRead })
}

export function toggleDarkMode() {
  setState({ ...state, darkMode: !state.darkMode })
}

// Acesso direto ao snapshot atual (útil em código não-React, ex: leitura
// inicial em useSidebar antes do primeiro render).
export function getSettings(): Settings {
  return state
}
