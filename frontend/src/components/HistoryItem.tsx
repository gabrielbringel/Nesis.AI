import { useState } from 'react'
import { deleteRecord } from '../stores/historyStore'
import type { AnalysisRecord } from '../stores/historyStore'
import type { Severity } from '../types'

interface Props {
  record: AnalysisRecord
  onClick: () => void
  onDelete: () => void
  active?: boolean
}

const SEVERITY_COLOR: Record<Severity, string> = {
  GRAVE: '#E24B4A',
  MODERADO: '#EF9F27',
  LEVE: '#639922',
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const today = new Date()
  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  if (sameDay) {
    const diffMin = Math.floor((today.getTime() - date.getTime()) / 60000)
    if (diffMin < 2) return 'agora'
  }
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}h${m}`
}

export function HistoryItem({ record, onClick, onDelete, active = false }: Props) {
  const [hover, setHover] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)

  const graveDots = record.alertas.filter((a) => a.severidade === 'GRAVE')
  const moderadoDots = record.alertas.filter((a) => a.severidade === 'MODERADO')
  const leveDots = record.alertas.filter((a) => a.severidade === 'LEVE')
  const dots = [...graveDots, ...moderadoDots, ...leveDots]

  const time = formatTime(record.timestamp)
  const background = active ? 'var(--color-bg-muted)' : hover ? 'var(--color-bg-hover)' : 'transparent'

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPopoverOpen(false) }}
      style={{
        position: 'relative',
        padding: '6px 10px',
        margin: '0 2px',
        borderRadius: '8px',
        cursor: 'pointer',
        background,
        transition: 'background 0.12s ease',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          lineHeight: 1.35,
          paddingRight: '20px',
        }}
      >
        {record.patient.displayLabel}
      </p>
      <div
        style={{
          marginTop: '2px',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--color-text-faint)',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
        }}
      >
        <span>{time}</span>
        {dots.length > 0 && (
          <>
            <span>·</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              {dots.map((a, i) => (
                <span
                  key={i}
                  style={{
                    display: 'block',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: SEVERITY_COLOR[a.severidade],
                  }}
                />
              ))}
            </span>
          </>
        )}
      </div>

      {/* "···" trigger */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setPopoverOpen((o) => !o)
        }}
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: hover ? 1 : 0,
          transition: 'opacity 150ms',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          color: 'var(--color-text-faint)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 4px',
          lineHeight: 1,
        }}
      >
        ···
      </button>

      {/* Delete popover */}
      {popoverOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={(e) => { e.stopPropagation(); setPopoverOpen(false) }}
          />
          <div
            style={{
              position: 'absolute',
              right: '6px',
              top: '100%',
              zIndex: 100,
              background: 'var(--color-surface)',
              border: '0.5px solid var(--color-border)',
              borderRadius: '8px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              overflow: 'hidden',
              marginTop: '2px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteRecord(record.id)
                onDelete()
                setPopoverOpen(false)
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 14px',
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                color: '#E24B4A',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-grave-bg)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              Excluir registro
            </button>
          </div>
        </>
      )}
    </div>
  )
}
