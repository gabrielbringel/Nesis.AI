import { IconButton } from './IconButton'
import { NesisWordmark } from './icons/NesisWordmark'
import { SidebarClosedIcon } from './icons/SidebarClosedIcon'

interface Props {
  onOpenDrawer: () => void
}

export function SidebarHeader({ onOpenDrawer }: Props) {
  return (
    <div
      style={{
        padding: '12px 14px 10px',
        borderBottom: '0.5px solid var(--color-border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      <IconButton onClick={onOpenDrawer} ariaLabel="Abrir menu">
        <SidebarClosedIcon size={18} color="var(--color-text-muted)" />
      </IconButton>

      <NesisWordmark height={16} />

      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'var(--color-bg-hover)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-sans)',
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--color-text-muted)',
          flexShrink: 0,
        }}
      >
        M
      </div>
    </div>
  )
}
