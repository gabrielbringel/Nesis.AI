import { useRef } from 'react'
import type { Patient, AttributeNode } from '../../types'
import { PatientLabel } from '../PatientLabel'

interface Props {
  patient: Patient | null
  attributes: AttributeNode[]
  loadedAttributes: AttributeNode[]
}

export function ReadingState({ patient, attributes, loadedAttributes }: Props) {
  const pending = attributes.slice(loadedAttributes.length)

  const nextLabel = (() => {
    const next = pending.find((a) => !a.isSubItem) ?? pending[0]
    if (!next) return null
    const colon = next.text.indexOf(':')
    if (colon > 0) return next.text.slice(0, colon)
    const dash = next.text.indexOf(' —')
    if (dash > 0) return next.text.slice(0, dash)
    return next.text.slice(0, 28)
  })()
  // enterClass só é aplicada uma vez (na montagem). Refs não causam re-render.
  const enterClassRef = useRef('state-enter')

  return (
    <div className={enterClassRef.current} style={{ flex: 1, padding: '20px 16px', overflowY: 'auto' }}>
      <PatientHeading patient={patient} />

      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {loadedAttributes.map((attr, i) => {
          // Aplica bullet-enter apenas no último item carregado (o que acabou de surgir)
          const isNew = i === loadedAttributes.length - 1
          return <AttributeRow key={attr.id} node={attr} loaded isNew={isNew} />
        })}
        {pending.map((attr) => (
          <AttributeRow key={attr.id} node={attr} loaded={false} isNew={false} />
        ))}
      </div>

      {nextLabel && (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontStyle: 'italic',
            fontSize: '13px',
            color: 'var(--color-text-placeholder)',
            marginTop: '14px',
          }}
        >
          Carregando {nextLabel}...
        </p>
      )}
    </div>
  )
}

function PatientHeading({ patient }: { patient: Patient | null }) {
  return (
    <h2
      style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '22px',
        lineHeight: 1.2,
      }}
    >
      <PatientLabel label={patient?.displayLabel ?? 'Carregando paciente...'} />
    </h2>
  )
}

function AttributeRow({ node, loaded, isNew }: { node: AttributeNode; loaded: boolean; isNew: boolean }) {
  const isSubItem = node.isSubItem

  return (
    <div
      className={isNew ? 'bullet-enter' : ''}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        marginLeft: isSubItem ? '16px' : '0px',
        animationDelay: isNew && isSubItem ? '40ms' : '0ms',
      }}
    >
      {isSubItem ? (
        <span
          className={loaded ? '' : 'skeleton-pulse'}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '12px',
            color: loaded ? 'var(--color-text-faint)' : 'var(--color-text-placeholder)',
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          —
        </span>
      ) : (
        <span
          className={loaded ? '' : 'skeleton-pulse'}
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: loaded ? 'var(--color-text-primary)' : 'var(--color-text-placeholder)',
            flexShrink: 0,
          }}
        />
      )}
      
      {loaded ? (
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontSize: isSubItem ? '12px' : '13px',
          color: isSubItem ? 'var(--color-text-faint)' : 'var(--color-text-secondary)',
        }}>
          {node.text}
        </span>
      ) : (
        <span
          className="skeleton-pulse"
          style={{
            display: 'block',
            height: isSubItem ? '10px' : '12px',
            width: isSubItem ? '100px' : '120px',
            background: 'var(--color-bg-hover)',
            borderRadius: '4px',
          }}
        />
      )}
    </div>
  )
}

