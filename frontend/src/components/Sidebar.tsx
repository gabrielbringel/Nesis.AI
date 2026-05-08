import type { EditablePayload, SidebarState } from '../types'
import type { AnalysisRecord } from '../stores/historyStore'
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
  onReanalyzeWithData: (payload: EditablePayload) => void
  onAnalyzeAnyway: () => void
  onFillManually: () => void
  onGoToIdle: () => void
  onLoadRecord: (record: AnalysisRecord) => void
}

export function Sidebar({
  state,
  onStart,
  onReanalyzeWithData,
  onAnalyzeAnyway,
  onFillManually,
  onGoToIdle,
  onLoadRecord,
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
          <ReadingState
            patient={patient}
            attributes={state.attributes}
            loadedAttributes={state.loadedAttributes}
          />
        )}

        {view === 'analyzing' && (
          <AnalyzingState patient={patient} attributes={state.attributes} />
        )}

        {view === 'results' && (
          <ResultsState
            patient={patient}
            alerts={state.alerts}
            scrapedPayload={state.scrapedPayload}
            onReanalyzeWithData={onReanalyzeWithData}
          />
        )}

        {view === 'wrong-domain' && <WrongDomainState onRetry={onGoToIdle} />}

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
          <NoAlertsState patient={patient} />
        )}

        <SidebarFooter state={state} onGoToIdle={onGoToIdle} />
      </div>

      <Drawer drawer={drawer} onLoadRecord={onLoadRecord} />
    </div>
  )
}
