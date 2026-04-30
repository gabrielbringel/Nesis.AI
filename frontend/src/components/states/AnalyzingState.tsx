import type { Patient } from '../../types'
import { READING_ATTRIBUTES } from '../../mock'

interface Props {
  patient: Patient
}

export function AnalyzingState({ patient }: Props) {
  return (
    <div style={{ flex: 1, padding: '20px 16px', overflowY: 'auto' }}>
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '22px',
          color: 'var(--color-text-primary)',
          lineHeight: 1.2,
        }}
      >
        {patient.abbreviated}
        <em style={{ color: '#888', fontStyle: 'italic' }}>, {patient.age}a</em>
      </h2>

      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {READING_ATTRIBUTES.map((attr) => (
          <div key={attr} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--color-text-primary)',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
              }}
            >
              {attr}
            </span>
          </div>
        ))}
      </div>

      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontStyle: 'italic',
          fontSize: '13px',
          color: 'var(--color-text-placeholder)',
          marginTop: '14px',
        }}
      >
        analisando...
      </p>
    </div>
  )
}
