import { IconButton } from './IconButton'
import { SidebarOpenIcon } from './icons/SidebarOpenIcon'

interface Props {
  onClose: () => void
  searchQuery: string
  onSearchChange: (value: string) => void
}

export function DrawerHeader({ onClose, searchQuery, onSearchChange }: Props) {
  return (
    <div
      style={{
        padding: '12px 14px 10px',
        borderBottom: '0.5px solid var(--color-border-light)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0,
      }}
    >
      <IconButton onClick={onClose} ariaLabel="Fechar menu">
        <SidebarOpenIcon size={18} color="#1a1a1a" />
      </IconButton>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: '#f0ede8',
          border: '0.5px solid #ddd8d0',
          borderRadius: '8px',
          padding: '5px 10px',
          height: '28px',
          boxSizing: 'border-box',
        }}
      >
        <SearchIcon />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="buscar paciente..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            color: '#888',
          }}
        />
      </div>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      style={{ opacity: 0.5, color: '#888', flexShrink: 0 }}
    >
      <circle cx="7" cy="7" r="5" />
      <path d="M11 11l3.5 3.5" strokeLinecap="round" />
    </svg>
  )
}
