import { useState } from 'react'
import { toggleAutoRead, toggleDarkMode, useSettings } from '../stores/settingsStore'
import { resetMemory } from '../stores/historyStore'
import { ToggleSwitch } from './ToggleSwitch'

export function SettingsView() {
  const settings = useSettings()

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Section title="Geral">
        <SettingRow
          label="Leitura automática"
          description="Analisa o prontuário sem precisar clicar em 'Ler prontuário'."
          checked={settings.autoRead}
          onChange={toggleAutoRead}
          first
        />
        <SettingRow
          label="Modo escuro"
          description="Tema com fundo escuro para reduzir cansaço visual."
          checked={settings.darkMode}
          onChange={toggleDarkMode}
        />
      </Section>

      <Section title="Sistema">
        <ResetButton />
      </Section>
    </div>
  )
}

function ResetButton() {
  const [confirming, setConfirming] = useState(false)

  const handleConfirm = async () => {
    await resetMemory()
    setConfirming(false)
  }

  if (confirming) {
    return (
      <div
        style={{
          padding: '12px',
          background: 'var(--color-bg-muted)',
          border: '0.5px solid var(--color-border)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.4,
          }}
        >
          Isso apagará todo o histórico e restaurará os casos de exemplo. As configurações serão mantidas.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            style={{
              flex: 1,
              fontFamily: 'var(--font-button)',
              fontSize: '13px',
              fontWeight: 400,
              color: 'var(--color-text-secondary)',
              background: 'transparent',
              border: '0.5px solid var(--color-border)',
              borderRadius: '8px',
              padding: '8px 14px',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              flex: 1,
              fontFamily: 'var(--font-button)',
              fontSize: '13px',
              fontWeight: 500,
              color: '#ffffff',
              background: '#E24B4A',
              border: '0.5px solid #E24B4A',
              borderRadius: '8px',
              padding: '8px 14px',
              cursor: 'pointer',
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      onMouseEnter={(e) => {
        e.currentTarget.style.background =
          document.documentElement.getAttribute('data-theme') === 'dark' ? '#2a1212' : '#fce4e4'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
      style={{
        width: '100%',
        fontFamily: 'var(--font-button)',
        fontSize: '13px',
        fontWeight: 500,
        color: '#E24B4A',
        background: 'transparent',
        border: '0.5px solid #E24B4A',
        borderRadius: '8px',
        padding: '8px 14px',
        cursor: 'pointer',
        transition: 'background 150ms ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
      }}
    >
      <TrashIcon />
      Redefinir memória
    </button>
  )
}

function TrashIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ stroke: '#E24B4A', flexShrink: 0 }}
    >
      <path d="M2.5 4h11M6 4V2.5h4V4M4 4l.5 9a1 1 0 001 1h5a1 1 0 001-1L12 4M6.5 7v4M9.5 7v4" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 600,
          fontSize: '16px',
          color: 'var(--color-text-primary)',
          marginBottom: '10px',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  )
}

interface RowProps {
  label: string
  description: string
  checked: boolean
  onChange: () => void
  first?: boolean
}

function SettingRow({ label, description, checked, onChange, first }: RowProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 0',
        borderTop: first ? 'none' : '0.5px solid var(--color-border-light)',
      }}
    >
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '10px',
            color: 'var(--color-text-faint)',
            marginTop: '2px',
            lineHeight: 1.4,
          }}
        >
          {description}
        </p>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} ariaLabel={label} />
    </div>
  )
}
