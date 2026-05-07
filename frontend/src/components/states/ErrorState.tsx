import { ActionButton } from '../ActionButton'
import type { ErrorType } from '../../types'

interface Props {
  errorType: ErrorType
  errorStatus?: number
  onRetry: () => void
}

type LegendFn = (status?: number) => string[]

const LEGENDS: Record<NonNullable<ErrorType>, LegendFn> = {
  'api-unreachable': () => [
    'Não foi possível conectar ao servidor NesisAI.',
    'Verifique se o backend está rodando na porta 8000.',
  ],
  'api-error': (status) => [
    `O servidor retornou um erro ${status ?? ''}.`,
    'Tente novamente ou verifique os logs do backend.',
  ],
  'scraping-failed': () => [
    'Não foi possível ler o prontuário.',
    'A página pode ainda estar carregando. Aguarde e tente novamente.',
  ],
  'invalid-response': () => [
    'O servidor retornou uma resposta inesperada.',
    'Tente novamente. Se o erro persistir, verifique os logs.',
  ],
}

export function ErrorState({ errorType, errorStatus, onRetry }: Props) {
  const lines = errorType
    ? LEGENDS[errorType](errorStatus)
    : ['Ocorreu um erro inesperado.', 'Tente novamente.']

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
        <circle cx="16" cy="16" r="13.25" stroke="#E24B4A" strokeWidth="1.5" />
        <line x1="10.5" y1="10.5" x2="21.5" y2="21.5" stroke="#E24B4A" strokeWidth="2" strokeLinecap="round" />
        <line x1="21.5" y1="10.5" x2="10.5" y2="21.5" stroke="#E24B4A" strokeWidth="2" strokeLinecap="round" />
      </svg>

      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '20px',
          color: 'var(--color-text-primary)',
        }}
      >
        Algo deu errado
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {lines.map((line, i) => (
          <p
            key={i}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              lineHeight: 1.5,
              maxWidth: '220px',
            }}
          >
            {line}
          </p>
        ))}
      </div>

      <ActionButton onClick={onRetry}>Tentar novamente</ActionButton>
    </div>
  )
}
