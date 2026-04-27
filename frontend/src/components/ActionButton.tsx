import type { ReactNode } from 'react'

interface Props {
  onClick?: () => void
  icon: ReactNode
  children: ReactNode
}

export function ActionButton({ onClick, icon, children }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        fontFamily: 'var(--font-serif)',
        fontSize: '15px',
        color: 'var(--color-text-muted)',
        padding: '6px 13px',
        border: '0.5px solid var(--color-border)',
        borderRadius: '8px',
        background: 'var(--color-bg-muted)',
        cursor: 'pointer',
        lineHeight: 1.2,
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-hover)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-muted)'
      }}
    >
      {icon}
      {children}
    </button>
  )
}
