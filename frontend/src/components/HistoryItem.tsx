import { useState } from 'react'
import type { HistoryEntry } from '../data/mockHistory'

interface Props {
  entry: HistoryEntry
  active?: boolean
  onClick?: () => void
}

const SEVERITY_COLOR = {
  grave: '#E24B4A',
  moderado: '#EF9F27',
  leve: '#639922',
} as const

function formatTime(date: Date, today: Date = new Date()): string {
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

function buildDots(counts: HistoryEntry['alertCounts']) {
  const dots: Array<keyof typeof SEVERITY_COLOR> = []
  for (let i = 0; i < counts.grave; i++) dots.push('grave')
  for (let i = 0; i < counts.moderado; i++) dots.push('moderado')
  for (let i = 0; i < counts.leve; i++) dots.push('leve')
  return dots
}

export function HistoryItem({ entry, active = false, onClick }: Props) {
  const [hover, setHover] = useState(false)
  const dots = buildDots(entry.alertCounts)
  const time = formatTime(entry.date)

  const background = active ? '#ebe8e2' : hover ? '#f0ede8' : 'transparent'

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
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
        }}
      >
        {entry.name}
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
              {dots.map((sev, i) => (
                <span
                  key={i}
                  style={{
                    display: 'block',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: SEVERITY_COLOR[sev],
                  }}
                />
              ))}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
