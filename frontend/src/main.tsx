import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { seedHistory } from './data/seedHistory'
import { getSettings } from './stores/settingsStore'

seedHistory()

// Apply initial theme before first render to avoid flash
document.documentElement.setAttribute(
  'data-theme',
  getSettings().darkMode ? 'dark' : 'light',
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
