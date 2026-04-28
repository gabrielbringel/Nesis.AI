import type { SidebarState } from '../types'
import { useDrawer } from '../hooks/useDrawer'
import { SidebarHeader } from './SidebarHeader'
import { SidebarFooter } from './SidebarFooter'
import { Drawer } from './Drawer'
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
  const drawer = useDrawer()

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        background: 'var(--color-surface)',
        overflow: 'hidden',
      }}
    >
      {/* Main content — esmaece quando drawer está aberto */}
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          opacity: drawer.isOpen ? 0.25 : 1,
          pointerEvents: drawer.isOpen ? 'none' : 'auto',
          transition: 'opacity 200ms ease-out',
        }}
      >
        <SidebarHeader onOpenDrawer={drawer.open} />

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

      <Drawer drawer={drawer} />
    </div>
  )
}
