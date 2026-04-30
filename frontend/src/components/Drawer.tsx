import type { UseDrawerReturn } from '../hooks/useDrawer'
import { DrawerHeader } from './DrawerHeader'
import { HistoryView } from './HistoryView'
import { SettingsView } from './SettingsView'
import { IconButton } from './IconButton'
import { GearIcon } from './icons/GearIcon'

interface Props {
  drawer: UseDrawerReturn
}

export function Drawer({ drawer }: Props) {
  const { isOpen, view, close, setView } = drawer

  const toggleSettings = () => {
    setView(view === 'settings' ? 'history' : 'settings')
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: '78%',
        background: '#fafaf8',
        borderRight: '0.5px solid var(--color-border)',
        boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: isOpen
          ? 'transform 200ms ease-out'
          : 'transform 180ms ease-in',
        // Quando fechado, evitar interação acidental nos elementos atrás.
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
      aria-hidden={!isOpen}
    >
      <DrawerHeader onClose={close} />

      {view === 'history' && <HistoryView />}
      {view === 'settings' && <SettingsView />}

      <div
        style={{
          padding: '10px',
          borderTop: '0.5px solid var(--color-border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontStyle: 'italic',
            fontSize: '9px',
            color: '#bbb',
          }}
        >
          [ perfil do médico — em breve ]
        </span>
        <IconButton onClick={toggleSettings} ariaLabel="Configurações" size={24}>
          <GearIcon size={14} color={view === 'settings' ? '#1a1a1a' : '#999'} />
        </IconButton>
      </div>
    </div>
  )
}
