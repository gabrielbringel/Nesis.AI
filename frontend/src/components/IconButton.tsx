import { useState, type ReactNode } from 'react'

interface Props {
  onClick?: () => void
  children: ReactNode
  ariaLabel: string
  size?: number
}

export function IconButton({ onClick, children, ariaLabel, size = 28 }: Props) {
  const [hover, setHover] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={ariaLabel}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '6px',
        border: 'none',
        background: hover ? '#ebe8e2' : 'transparent',
        boxShadow: hover ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        flexShrink: 0,
        transition: 'background 0.12s ease, box-shadow 0.12s ease',
      }}
    >
      {children}
    </button>
  )
}
