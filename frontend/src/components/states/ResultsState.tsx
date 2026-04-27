import type { Alert, Patient } from '../../types'
import { AlertCard } from '../AlertCard'

interface Props {
  patient: Patient
  alerts: Alert[]
}

export function ResultsState({ patient, alerts }: Props) {
  return (
    <div style={{ flex: 1, padding: '20px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0' }}>
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '22px',
          color: 'var(--color-text-primary)',
          lineHeight: 1.2,
          marginBottom: '16px',
          flexShrink: 0,
        }}
      >
        {patient.abbreviated}
        <em style={{ color: '#888', fontStyle: 'italic' }}>, {patient.age}a</em>
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {alerts.map((alert, i) => (
          <AlertCard key={i} alert={alert} />
        ))}
      </div>
    </div>
  )
}
