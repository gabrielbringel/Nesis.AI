import type { SidebarState } from '../types'
import { getHistory } from '../stores/historyStore'
import { ActionButton } from './ActionButton'
import { PlusIcon } from './icons/PlusIcon'

interface Props {
  state: SidebarState
  onGoToIdle: () => void
}

function formatDate(date: Date | null): string {
  if (!date) return 'ontem, 14h32'
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'agora mesmo'
  if (diffMin < 60) return `há ${diffMin} min`
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `hoje, ${h}h${m}`
}

export function SidebarFooter({ state, onGoToIdle }: Props) {
  const { view, counts } = state

  return (
    <div
      style={{
        padding: '8px 14px 10px',
        borderTop: '0.5px solid var(--color-border-light)',
        minHeight: '56px',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      {/* IDLE */}
      {view === 'idle' && (() => {
        const last = getHistory()[0] ?? null
        if (!last) return (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-placeholder)' }}>
            nenhuma análise recente
          </p>
        )
        const grave = last.alertas.filter((a) => a.severidade === 'GRAVE').length
        const moderado = last.alertas.filter((a) => a.severidade === 'MODERADO').length
        const leve = last.alertas.filter((a) => a.severidade === 'LEVE').length
        return (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                  {last.patient.displayLabel.split(',')[0]}
                </p>
                {last.alertas.length > 0 && (
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    {grave > 0 && <SeverityDot color="#E24B4A" count={grave} />}
                    {moderado > 0 && <SeverityDot color="#EF9F27" count={moderado} />}
                    {leve > 0 && <SeverityDot color="#639922" count={leve} />}
                  </div>
                )}
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-placeholder)', marginTop: '2px' }}>
                último analisado
              </p>
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-faint)' }}>
              {formatDate(new Date(last.timestamp))}
            </p>
          </div>
        )
      })()}

      {/* READING */}
      {view === 'reading' && (
        <div style={{ width: '100%' }}>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-text-placeholder)',
              marginBottom: '5px',
            }}
          >
            lendo prontuário
          </p>
          <div
            style={{
              width: '100%',
              height: '3px',
              background: 'var(--color-bg-hover)',
              borderRadius: '99px',
              overflow: 'hidden',
            }}
          >
            <div
              className="progress-bar-animated"
              style={{
                height: '100%',
                background: 'var(--color-text-primary)',
                borderRadius: '99px',
              }}
            />
          </div>
        </div>
      )}

      {/* ANALYZING — dots centered */}
      {view === 'analyzing' && (
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="dot-blink"
              style={{
                display: 'block',
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: 'var(--color-text-primary)',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* RESULTS */}
      {view === 'results' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {(() => {
                const total = counts.grave + counts.moderado + counts.leve
                if (total === 0) return 'Nenhum alerta'
                if (total === 1) return '1 alerta'
                return `${total} alertas`
              })()}
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '3px', alignItems: 'center' }}>
              <SeverityDot color="#E24B4A" count={counts.grave} />
              <SeverityDot color="#EF9F27" count={counts.moderado} />
              <SeverityDot color="#639922" count={counts.leve} />
            </div>
          </div>
          <ActionButton onClick={onGoToIdle} icon={<PlusIcon size={13} color="var(--color-text-muted)" />}>
            Nova análise
          </ActionButton>
        </div>
      )}

      {/* NO-ALERTS */}
      {view === 'no-alerts' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
          <ActionButton onClick={onGoToIdle} icon={<PlusIcon size={13} color="var(--color-text-muted)" />}>
            Nova análise
          </ActionButton>
        </div>
      )}
    </div>
  )
}

function SeverityDot({ color, count }: { color: string; count: number }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
      <span
        style={{
          display: 'block',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-faint)' }}>
        {count}
      </span>
    </span>
  )
}
