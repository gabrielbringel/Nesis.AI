import { ActionButton } from '../ActionButton'

interface Props {
  missingFields: string[]
  onFillManually: () => void
  onAnalyzeAnyway: () => void
}

export function IncompleteDataState({ missingFields, onFillManually, onAnalyzeAnyway }: Props) {
  return (
    <div
      className="state-enter"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '14px',
        padding: '24px 20px',
        textAlign: 'center',
      }}
    >
      <svg
        className="icon-enter"
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M14 3.5L25.5 24H2.5L14 3.5Z"
          stroke="#EF9F27"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <line x1="14" y1="11.5" x2="14" y2="17.5" stroke="#EF9F27" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="14" cy="20.5" r="1" fill="#EF9F27" />
      </svg>

      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 600,
          fontSize: '20px',
          color: 'var(--color-text-primary)',
        }}
      >
        Dados incompletos
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
        Não foi possível capturar todos os campos necessários:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
        {missingFields.map((field) => (
          <span
            key={field}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: '#EF9F27',
            }}
          >
            • {field}
          </span>
        ))}
      </div>

      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '12px',
          color: 'var(--color-text-faint)',
          lineHeight: 1.5,
          maxWidth: '200px',
        }}
      >
        Você pode preencher os dados manualmente e analisar assim mesmo.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
        <ActionButton onClick={onFillManually}>Preencher manualmente</ActionButton>
        <ActionButton onClick={onAnalyzeAnyway}>Analisar assim mesmo</ActionButton>
      </div>
    </div>
  )
}
