import { useState } from 'react'
import type { UseDrawerReturn } from '../hooks/useDrawer'
import type { AnalysisRecord } from '../stores/historyStore'
import { DrawerHeader } from './DrawerHeader'
import { HistoryView } from './HistoryView'
import { SettingsView } from './SettingsView'
import { IconButton } from './IconButton'
import { GearIcon } from './icons/GearIcon'

interface Props {
  drawer: UseDrawerReturn
  onLoadRecord: (record: AnalysisRecord) => void
}

export function Drawer({ drawer, onLoadRecord }: Props) {
  const { isOpen, view, close, setView } = drawer
  const [searchQuery, setSearchQuery] = useState('')

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
        background: 'var(--color-surface)',
        borderRight: '0.5px solid var(--color-border)',
        boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        opacity: isOpen ? 1 : 0,
        transition: isOpen
          ? 'opacity 180ms ease-out'
          : 'opacity 150ms ease-in',
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
      aria-hidden={!isOpen}
    >
      <DrawerHeader onClose={close} searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {view === 'history' && <HistoryView searchQuery={searchQuery} onLoadRecord={onLoadRecord} onClose={close} />}
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
            color: 'var(--color-text-placeholder)',
          }}
        >
          [ perfil do médico — em breve ]
        </span>
        <IconButton onClick={toggleSettings} ariaLabel="Configurações" size={24}>
          <GearIcon size={14} color={view === 'settings' ? 'var(--color-text-primary)' : 'var(--color-text-faint)'} />
        </IconButton>
      </div>
    </div>
  )
}
