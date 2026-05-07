import type { SidebarState } from '../types'
import { useDrawer } from '../hooks/useDrawer'
import { SidebarHeader } from './SidebarHeader'
import { SidebarFooter } from './SidebarFooter'
import { Drawer } from './Drawer'
import { IdleState } from './states/IdleState'
import { ReadingState } from './states/ReadingState'
import { AnalyzingState } from './states/AnalyzingState'
import { ResultsState } from './states/ResultsState'
import { WrongDomainState } from './states/WrongDomainState'
import { IncompleteDataState } from './states/IncompleteDataState'
import { ErrorState } from './states/ErrorState'
import { NoAlertsState } from './states/NoAlertsState'

interface Props {
  state: SidebarState
  onStart: () => void
  onReanalyze: () => void
  onAnalyzeAnyway: () => void
  onFillManually: () => void
  onGoToIdle: () => void
}

export function Sidebar({
  state,
  onStart,
  onReanalyze,
  onAnalyzeAnyway,
  onFillManually,
  onGoToIdle,
}: Props) {
  const { view, patient } = state
  const drawer = useDrawer()

  const handleFillManually = () => {
    onFillManually()
    drawer.open()
  }

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

        {view === 'reading' && (
          <ReadingState patient={patient} loadedAttributes={state.loadedAttributes} />
        )}

        {view === 'analyzing' && <AnalyzingState patient={patient} />}

        {view === 'results' && (
          <ResultsState patient={patient} alerts={state.alerts} />
        )}

        {view === 'wrong-domain' && <WrongDomainState onRetry={onStart} />}

        {view === 'incomplete-data' && (
          <IncompleteDataState
            missingFields={state.missingFields ?? []}
            onFillManually={handleFillManually}
            onAnalyzeAnyway={onAnalyzeAnyway}
          />
        )}

        {view === 'error' && (
          <ErrorState
            errorType={state.errorType}
            errorStatus={state.errorStatus}
            onRetry={onGoToIdle}
          />
        )}

        {view === 'no-alerts' && (
          <NoAlertsState patient={patient} onReanalyze={onReanalyze} />
        )}

        <SidebarFooter state={state} onReanalyze={onReanalyze} />
      </div>

      <Drawer drawer={drawer} />
    </div>
  )
}
