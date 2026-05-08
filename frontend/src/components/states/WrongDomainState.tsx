import { ActionButton } from '../ActionButton'

interface Props {
  onRetry: () => void
}

export function WrongDomainState({ onRetry }: Props) {
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
        <circle cx="16" cy="16" r="13.25" stroke="var(--color-text-placeholder)" strokeWidth="1.5" />
        <line x1="16" y1="2.75" x2="16" y2="29.25" stroke="var(--color-text-placeholder)" strokeWidth="1.5" />
        <path d="M2.75 16 Q8 10.5 16 10.5 Q24 10.5 29.25 16" stroke="var(--color-text-placeholder)" strokeWidth="1.5" fill="none" />
        <path d="M2.75 16 Q8 21.5 16 21.5 Q24 21.5 29.25 16" stroke="var(--color-text-placeholder)" strokeWidth="1.5" fill="none" />
        <line x1="21" y1="4.5" x2="27.5" y2="11" stroke="#E24B4A" strokeWidth="2" strokeLinecap="round" />
        <line x1="27.5" y1="4.5" x2="21" y2="11" stroke="#E24B4A" strokeWidth="2" strokeLinecap="round" />
      </svg>

      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 600,
          fontSize: '20px',
          color: 'var(--color-text-primary)',
          lineHeight: 1.3,
        }}
      >
        Esta extensão só funciona
        <br />
        dentro do eSUS
      </h2>

      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          lineHeight: 1.5,
          maxWidth: '220px',
        }}
      >
        Navegue até o prontuário de um paciente e tente novamente.
      </p>

      <ActionButton onClick={onRetry}>Tentar novamente</ActionButton>
    </div>
  )
}
