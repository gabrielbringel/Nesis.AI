import { ActionButton } from '../ActionButton'
import { NesisMark } from '../icons/NesisMark'

interface Props {
  onStart: () => void
}

export function IdleState({ onStart }: Props) {
  return (
    <div
      className="state-enter"
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
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '28px',
          lineHeight: 1.25,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '2px',
        }}
      >
        <span style={{ fontWeight: 500, fontStyle: 'italic', color: 'var(--color-text-placeholder)' }}>Nesis.AI</span>
        <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>Nenhuma decisão sem revisão</span>
      </div>
      <ActionButton onClick={onStart} icon={<NesisMark size={13} color="#555" />}>
        Ler prontuário
      </ActionButton>
    </div>
  )
}
