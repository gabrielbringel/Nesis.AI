import { useEffect } from 'react'
import { useSidebar } from './hooks/useSidebar'
import { useSettings } from './stores/settingsStore'
import { Sidebar } from './components/Sidebar'

export function App() {
  const settings = useSettings()
  const { state, startReading, reanalyzeWithData, analyzeAnyway, fillManually, goToIdle, loadRecord } = useSidebar()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light')
  }, [settings.darkMode])

  return (
    <Sidebar
      state={state}
      onStart={startReading}
      onReanalyzeWithData={reanalyzeWithData}
      onAnalyzeAnyway={analyzeAnyway}
      onFillManually={fillManually}
      onGoToIdle={goToIdle}
      onLoadRecord={loadRecord}
    />
  )
}
