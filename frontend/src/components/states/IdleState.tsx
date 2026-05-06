import { ActionButton } from '../ActionButton'
import { NesisMark } from '../icons/NesisMark'

interface Props {
  onStart: () => void
}

export function IdleState({ onStart }: Props) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '22px',
        padding: '24px 20px',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '32px',
          lineHeight: 1.2,
          color: 'var(--color-text-primary)',
          textAlign: 'center',
        }}
      >
        Vamos
        <br />
        <em style={{ color: '#888', fontStyle: 'italic' }}>começar?</em>
      </h1>
      <ActionButton onClick={onStart} icon={<NesisMark size={13} color="#555" />}>
        Ler prontuário
      </ActionButton>
    </div>
  )
}
