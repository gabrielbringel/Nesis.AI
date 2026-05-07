import type { Patient, AttributeNode } from '../../types'

interface Props {
  patient: Patient | null
  attributes: AttributeNode[]
}

export function AnalyzingState({ patient, attributes }: Props) {
  return (
    <div className="state-enter" style={{ flex: 1, padding: '20px 16px', overflowY: 'auto' }}>
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '22px',
          color: 'var(--color-text-primary)',
          lineHeight: 1.2,
        }}
      >
        {patient?.displayLabel ?? 'Carregando paciente...'}
      </h2>

      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {attributes.map((attr) => {
          const isSubItem = attr.isSubItem

          return (
            <div key={attr.id} style={{ display: 'flex', alignItems: 'center', gap: '9px', marginLeft: isSubItem ? '16px' : '0px' }}>
              {isSubItem ? (
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '12px',
                    color: 'var(--color-text-faint)',
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  —
                </span>
              ) : (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--color-text-primary)',
                    flexShrink: 0,
                  }}
                />
              )}
              
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: isSubItem ? '12px' : '13px',
                  color: isSubItem ? 'var(--color-text-faint)' : 'var(--color-text-secondary)',
                }}
              >
                {attr.text}
              </span>
            </div>
          )
        })}
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
        <span className="ellipsis-animate">analisando</span>
      </p>
    </div>
  )
}
