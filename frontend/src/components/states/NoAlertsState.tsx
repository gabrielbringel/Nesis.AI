import type { Patient } from '../../types'
import { ActionButton } from '../ActionButton'
import { ReloadIcon } from '../icons/ReloadIcon'

interface Props {
  patient: Patient | null
  onReanalyze: () => void
}

export function NoAlertsState({ patient, onReanalyze }: Props) {
  return (
    <div
      className="state-enter"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '24px 20px',
        textAlign: 'center',
      }}
    >
      <svg
        className="icon-enter"
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="16" cy="16" r="13.25" stroke="#639922" strokeWidth="1.5" />
        <path
          d="M10 16.5L14 20.5L22 12"
          stroke="#639922"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '20px',
          color: 'var(--color-text-primary)',
          lineHeight: 1.3,
        }}
      >
        Nenhum alerta
        <br />
        encontrado
      </h2>

      {patient && (
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            color: 'var(--color-text-muted)',
          }}
        >
          {patient.displayLabel}
        </p>
      )}

      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '12px',
          color: '#888',
          lineHeight: 1.5,
          maxWidth: '220px',
        }}
      >
        Nenhuma interação, contraindicação ou problema foi identificado na prescrição atual.
      </p>

      <ActionButton onClick={onReanalyze} icon={<ReloadIcon size={13} color="#555" />}>
        Reanalisar
      </ActionButton>
    </div>
  )
}
