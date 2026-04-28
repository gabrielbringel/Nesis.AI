import { IconButton } from './IconButton'
import { SidebarOpenIcon } from './icons/SidebarOpenIcon'

interface Props {
  onClose: () => void
}

export function DrawerHeader({ onClose }: Props) {
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
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '14px',
          color: 'var(--color-text-primary)',
        }}
      >
        Menu
      </span>
    </div>
  )
}
