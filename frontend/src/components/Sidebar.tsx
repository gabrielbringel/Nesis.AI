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
        width: '380px',
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: '880px',
        maxHeight: '880px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
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
