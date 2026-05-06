import { useSidebar } from './hooks/useSidebar'
import { Sidebar } from './components/Sidebar'

export function App() {
  const { state, startReading, reanalyze } = useSidebar()

  return (
    <Sidebar state={state} onStart={startReading} onReanalyze={reanalyze} />
  )
}
