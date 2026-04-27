import { useState } from 'react'
import type { Alert, Severity } from '../types'

const SEVERITY_STYLES: Record<
  Severity,
  { border: string; bg: string; badgeBg: string; badgeText: string; dot: string }
> = {
  GRAVE: {
    border: '#E24B4A',
    bg: '#fefafa',
    badgeBg: '#fcebeb',
    badgeText: '#A32D2D',
    dot: '#E24B4A',
  },
  MODERADO: {
    border: '#EF9F27',
    bg: '#fefdf9',
    badgeBg: '#faeeda',
    badgeText: '#854F0B',
    dot: '#EF9F27',
  },
  LEVE: {
    border: '#639922',
    bg: '#fafdf6',
    badgeBg: '#eaf3de',
    badgeText: '#3B6D11',
    dot: '#639922',
  },
}

function truncate(text: string, max = 80) {
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}

interface Props {
  alert: Alert
}

export function AlertCard({ alert }: Props) {
  const [expanded, setExpanded] = useState(false)
  const s = SEVERITY_STYLES[alert.severidade]
  const medName = alert.medicamentos_envolvidos.join(' + ')

  return (
    <div
      onClick={() => setExpanded((v) => !v)}
      style={{
        borderRadius: '10px',
        border: `0.5px solid #ebe8e2`,
        borderLeft: `3px solid ${s.border}`,
        background: s.bg,
        padding: '12px 14px',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
        {/* Badge */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            background: s.badgeBg,
            color: s.badgeText,
            padding: '2px 6px',
            borderRadius: '4px',
            flexShrink: 0,
          }}
        >
          {alert.severidade}
        </span>

        {/* Med name */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-text-faint)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {medName}
        </span>

        {/* Chevron */}
        <span
          className={`chevron ${expanded ? 'open' : ''}`}
          style={{ fontSize: '11px', color: '#bbb', flexShrink: 0 }}
        >
          ▾
        </span>
      </div>

      {/* Short description */}
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.45,
        }}
      >
        {truncate(alert.descricao)}
      </p>

      {/* Expanded details */}
      <div className={`alert-details ${expanded ? 'expanded' : 'collapsed'}`}>
        <div
          style={{
            borderTop: '0.5px solid var(--color-border-light)',
            marginTop: '10px',
            paddingTop: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <DetailRow label="Prescrição" value={medName} />
          <DetailRow label="Mecanismo" value={alert.descricao} />
          <DetailRow label="Fonte" value="Base de conhecimento" />
          <DetailRow label="Alternativa/Ação" value={alert.recomendacao} />
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--color-text-faint)',
          flexShrink: 0,
          minWidth: '90px',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '11px',
          color: 'var(--color-text-muted)',
          lineHeight: 1.5,
        }}
      >
        {value}
      </span>
    </div>
  )
}
