import type { SidebarState } from '../types'
import { SidebarHeader } from './SidebarHeader'
import { SidebarFooter } from './SidebarFooter'
import { IdleState } from './states/IdleState'
import { ReadingState } from './states/ReadingState'
import { AnalyzingState } from './states/AnalyzingState'
import { ResultsState } from './states/ResultsState'

interface Props {
  state: SidebarState
  onStart: () => void
  onReanalyze: () => void
}

export function Sidebar({ state, onStart, onReanalyze }: Props) {
  const { view, patient } = state

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <SidebarHeader />

      {view === 'idle' && <IdleState onStart={onStart} />}

      {view === 'reading' && patient && (
        <ReadingState patient={patient} loadedAttributes={state.loadedAttributes} />
      )}

      {view === 'analyzing' && patient && <AnalyzingState patient={patient} />}

      {view === 'results' && patient && (
        <ResultsState patient={patient} alerts={state.alerts} />
      )}

      <SidebarFooter state={state} onReanalyze={onReanalyze} />
    </div>
  )
}
