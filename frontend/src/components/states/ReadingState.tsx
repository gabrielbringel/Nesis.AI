import { useRef } from 'react'
import type { Patient, AttributeNode } from '../../types'

interface Props {
  patient: Patient | null
  attributes: AttributeNode[]
  loadedAttributes: AttributeNode[]
}

export function ReadingState({ patient, attributes, loadedAttributes }: Props) {
  const pending = attributes.slice(loadedAttributes.length)
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

      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontStyle: 'italic',
          fontSize: '13px',
          color: 'var(--color-text-placeholder)',
          marginTop: '14px',
        }}
      >
        carregando atributos...
      </p>
    </div>
  )
}

function PatientHeading({ patient }: { patient: Patient | null }) {
  return (
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
            color: loaded ? 'var(--color-text-faint)' : '#ccc',
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
            background: loaded ? 'var(--color-text-primary)' : '#ccc',
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
            background: '#e8e4de',
            borderRadius: '4px',
          }}
        />
      )}
    </div>
  )
}

