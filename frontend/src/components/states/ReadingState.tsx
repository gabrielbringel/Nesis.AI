import type { Patient } from '../../types'
import { READING_ATTRIBUTES } from '../../mock'

interface Props {
  patient: Patient
  loadedAttributes: string[]
}

export function ReadingState({ patient, loadedAttributes }: Props) {
  const pending = READING_ATTRIBUTES.slice(loadedAttributes.length)

  return (
    <div style={{ flex: 1, padding: '20px 16px', overflowY: 'auto' }}>
      <PatientHeading patient={patient} />

      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {loadedAttributes.map((attr) => (
          <AttributeRow key={attr} text={attr} loaded />
        ))}
        {pending.map((attr) => (
          <AttributeRow key={attr} text={attr} loaded={false} />
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

function PatientHeading({ patient }: { patient: Patient }) {
  return (
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
  )
}

function AttributeRow({ text, loaded }: { text: string; loaded: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
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
      {loaded ? (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {text}
        </span>
      ) : (
        <span
          className="skeleton-pulse"
          style={{
            display: 'block',
            height: '12px',
            width: '120px',
            background: '#e8e4de',
            borderRadius: '4px',
          }}
        />
      )}
    </div>
  )
}
