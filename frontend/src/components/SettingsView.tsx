import { toggleAutoRead, toggleDarkMode, useSettings } from '../stores/settingsStore'
import { ToggleSwitch } from './ToggleSwitch'

export function SettingsView() {
  const settings = useSettings()

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
      <Section title="Comportamento">
        <SettingRow
          label="Leitura automática"
          description="Analisa o prontuário sem precisar clicar em 'Ler prontuário'."
          checked={settings.autoRead}
          onChange={toggleAutoRead}
          first
        />
      </Section>

      <div style={{ height: '18px' }} />

      <Section title="Aparência">
        <SettingRow
          label="Modo escuro"
          description="Tema com fundo escuro para reduzir cansaço visual."
          checked={settings.darkMode}
          onChange={toggleDarkMode}
          first
        />
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3
        style={{
          fontFamily: 'var(--font-serif)',
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
            color: '#888',
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
