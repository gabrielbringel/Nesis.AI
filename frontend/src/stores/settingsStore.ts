// Global settings store persisted in localStorage.
//
// Uses useSyncExternalStore to share state across components without
// Context: any component that calls useSettings() receives the current
// snapshot and re-renders when values change.

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
    // localStorage is full or unavailable; no fallback needed.
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

export function toggleDarkMode() {
  setState({ ...state, darkMode: !state.darkMode })
}

// Direct access to the current snapshot (useful outside React, e.g. the
// initial read in useSidebar before the first render).
export function getSettings(): Settings {
  return state
}
