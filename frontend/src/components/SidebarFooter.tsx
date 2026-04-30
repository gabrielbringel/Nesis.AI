import type { SidebarState } from '../types'
import { ActionButton } from './ActionButton'
import { ReloadIcon } from './icons/ReloadIcon'

interface Props {
  state: SidebarState
  onReanalyze: () => void
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

export function SidebarFooter({ state, onReanalyze }: Props) {
  const { view, counts, lastAnalyzedAt } = state

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
      {view === 'idle' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-text-primary)' }}>
              <strong>J. Vitor</strong>
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-placeholder)', marginTop: '2px' }}>
              último analisado
            </p>
          </div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-faint)' }}>
            {formatDate(lastAnalyzedAt)}
          </p>
        </div>
      )}

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
              background: '#f0ede8',
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

      {/* ANALYZING */}
      {view === 'analyzing' && (
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
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
              {counts.grave + counts.moderado + counts.leve} alertas
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '3px', alignItems: 'center' }}>
              <SeverityDot color="#E24B4A" count={counts.grave} />
              <SeverityDot color="#EF9F27" count={counts.moderado} />
              <SeverityDot color="#639922" count={counts.leve} />
            </div>
          </div>
          <ActionButton onClick={onReanalyze} icon={<ReloadIcon size={13} color="#555" />}>
            Reanalisar
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
