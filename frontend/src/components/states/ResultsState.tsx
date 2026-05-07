import { useState } from 'react'
import type { Alert, EditablePayload, Patient } from '../../types'
import { AlertCard } from '../AlertCard'

interface Props {
  patient: Patient | null
  alerts: Alert[]
  scrapedPayload: EditablePayload | null
  onReanalyzeWithData: (payload: EditablePayload) => void
}

const EMPTY_PAYLOAD: EditablePayload = {
  nome: '', idade: '', sexo: '', peso: '', altura: '',
  alergias: [], motivoConsulta: '', objetivo: '', avaliacao: '',
  problemasCondicoes: [], medicacoes: [],
}

const INPUT: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '12px',
  border: '0.5px solid var(--color-border)',
  borderRadius: '6px',
  padding: '4px 8px',
  background: 'var(--color-bg-muted)',
  outline: 'none',
  width: '100%',
}

const LABEL: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--color-text-faint)',
  flexShrink: 0,
}

const BTN_SMALL: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: 'var(--color-text-faint)',
  padding: '0',
  flexShrink: 0,
}

const SECTION_TOP: React.CSSProperties = {
  borderTop: '0.5px solid var(--color-border-light)',
  paddingTop: '10px',
  marginTop: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
}

function focusOn(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'var(--color-text-primary)'
}
function focusOff(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'var(--color-border)'
}

export function ResultsState({ patient, alerts, scrapedPayload, onReanalyzeWithData }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editedData, setEditedData] = useState<EditablePayload>(
    () => scrapedPayload ?? EMPTY_PAYLOAD
  )

  function set<K extends keyof EditablePayload>(key: K, value: EditablePayload[K]) {
    setEditedData((prev) => ({ ...prev, [key]: value }))
  }

  function handleReanalyze() {
    setDrawerOpen(false)
    onReanalyzeWithData(editedData)
  }

  // Alergias
  function updateAlergia(i: number, v: string) {
    setEditedData((prev) => {
      const next = [...prev.alergias]; next[i] = v; return { ...prev, alergias: next }
    })
  }
  function removeAlergia(i: number) {
    setEditedData((prev) => ({ ...prev, alergias: prev.alergias.filter((_, idx) => idx !== i) }))
  }
  function addAlergia() {
    setEditedData((prev) => ({ ...prev, alergias: [...prev.alergias, ''] }))
  }

  // Medicações
  function updateMed(i: number, field: 'nome' | 'posologia', v: string) {
    setEditedData((prev) => {
      const next = [...prev.medicacoes]; next[i] = { ...next[i], [field]: v }; return { ...prev, medicacoes: next }
    })
  }
  function removeMed(i: number) {
    setEditedData((prev) => ({ ...prev, medicacoes: prev.medicacoes.filter((_, idx) => idx !== i) }))
  }
  function addMed() {
    setEditedData((prev) => ({ ...prev, medicacoes: [...prev.medicacoes, { nome: '', posologia: '' }] }))
  }

  // Problemas
  function updateProblema(i: number, v: string) {
    setEditedData((prev) => {
      const next = [...prev.problemasCondicoes]; next[i] = v; return { ...prev, problemasCondicoes: next }
    })
  }
  function removeProblema(i: number) {
    setEditedData((prev) => ({ ...prev, problemasCondicoes: prev.problemasCondicoes.filter((_, idx) => idx !== i) }))
  }
  function addProblema() {
    setEditedData((prev) => ({ ...prev, problemasCondicoes: [...prev.problemasCondicoes, ''] }))
  }

  return (
    <div
      className="state-enter"
      style={{ flex: 1, padding: '20px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0' }}
    >
      {/* Patient header + drawer wrapper */}
      <div style={{ marginBottom: '16px', flexShrink: 0 }}>
        {/* Clickable header */}
        <div
          onClick={() => setDrawerOpen((o) => !o)}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '22px',
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
            }}
          >
            {patient?.displayLabel ?? 'Paciente'}
          </h2>
          <span
            className={`chevron ${drawerOpen ? 'open' : ''}`}
            style={{ fontSize: '11px', color: '#bbb', marginTop: '4px' }}
          >
            ▾
          </span>
        </div>

        {/* Editable drawer */}
        <div className={`alert-details patient-drawer ${drawerOpen ? 'expanded' : 'collapsed'}`}>
          {/* Scrollable form sections */}
          <div
            style={{ maxHeight: '370px', overflowY: 'auto', paddingTop: '10px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Identificação */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={LABEL}>Identificação</span>
              <input
                style={INPUT} value={editedData.nome} placeholder="Nome"
                onChange={(e) => set('nome', e.target.value)}
                onFocus={focusOn} onBlur={focusOff}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                {([
                  { key: 'idade', placeholder: 'Idade', type: 'number' },
                  { key: 'sexo',  placeholder: 'Sexo',  type: 'text'   },
                  { key: 'peso',  placeholder: 'Peso',  type: 'text'   },
                  { key: 'altura',placeholder: 'Altura',type: 'text'   },
                ] as const).map(({ key, placeholder, type }) => (
                  <input
                    key={key}
                    style={{ ...INPUT, flex: '1' }}
                    value={editedData[key]}
                    placeholder={placeholder}
                    type={type}
                    onChange={(e) => set(key, e.target.value)}
                    onFocus={focusOn} onBlur={focusOff}
                  />
                ))}
              </div>
            </div>

            {/* Alergias */}
            <div style={SECTION_TOP}>
              <span style={LABEL}>Alergias</span>
              {editedData.alergias.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input style={INPUT} value={a}
                    onChange={(e) => updateAlergia(i, e.target.value)}
                    onFocus={focusOn} onBlur={focusOff}
                  />
                  <button style={BTN_SMALL} onClick={() => removeAlergia(i)}>✕</button>
                </div>
              ))}
              <button style={{ ...BTN_SMALL, textAlign: 'left' }} onClick={addAlergia}>+ adicionar alergia</button>
            </div>

            {/* Medicações */}
            <div style={SECTION_TOP}>
              <span style={LABEL}>Medicações</span>
              {editedData.medicacoes.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input style={{ ...INPUT, flex: '1' }} value={m.nome} placeholder="Nome"
                    onChange={(e) => updateMed(i, 'nome', e.target.value)}
                    onFocus={focusOn} onBlur={focusOff}
                  />
                  <input style={{ ...INPUT, flex: '2' }} value={m.posologia} placeholder="Posologia"
                    onChange={(e) => updateMed(i, 'posologia', e.target.value)}
                    onFocus={focusOn} onBlur={focusOff}
                  />
                  <button style={BTN_SMALL} onClick={() => removeMed(i)}>✕</button>
                </div>
              ))}
              <button style={{ ...BTN_SMALL, textAlign: 'left' }} onClick={addMed}>+ adicionar medicação</button>
            </div>

            {/* Contexto clínico */}
            <div style={SECTION_TOP}>
              <span style={LABEL}>Contexto Clínico</span>
              {([
                { label: 'Motivo',    key: 'motivoConsulta' },
                { label: 'Objetivo',  key: 'objetivo'       },
                { label: 'Avaliação', key: 'avaliacao'      },
              ] as const).map(({ label, key }) => (
                <div key={key} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ ...LABEL, minWidth: '64px' }}>{label}</span>
                  <input style={INPUT} value={editedData[key]}
                    onChange={(e) => set(key, e.target.value)}
                    onFocus={focusOn} onBlur={focusOff}
                  />
                </div>
              ))}
            </div>

            {/* Problemas / Condições */}
            <div style={{ ...SECTION_TOP, paddingBottom: '6px' }}>
              <span style={LABEL}>Problemas / Condições</span>
              {editedData.problemasCondicoes.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input style={INPUT} value={p}
                    onChange={(e) => updateProblema(i, e.target.value)}
                    onFocus={focusOn} onBlur={focusOff}
                  />
                  <button style={BTN_SMALL} onClick={() => removeProblema(i)}>✕</button>
                </div>
              ))}
              <button style={{ ...BTN_SMALL, textAlign: 'left' }} onClick={addProblema}>+ adicionar</button>
            </div>
          </div>

          {/* Botão reanalisar — fora do scroll, sempre visível */}
          <div
            style={{ borderTop: '0.5px solid var(--color-border-light)', paddingTop: '10px', paddingBottom: '4px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleReanalyze}
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '15px',
                border: '0.5px solid var(--color-border)',
                borderRadius: '8px',
                padding: '6px 14px',
                background: 'var(--color-bg-muted)',
                cursor: 'pointer',
                color: 'var(--color-text-primary)',
                width: '100%',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-hover)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-muted)' }}
            >
              Reanalisar com estes dados
            </button>
          </div>
        </div>
      </div>

      {/* Alert list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {alerts.map((alert, i) => (
          <div key={i} className="alert-enter" style={{ animationDelay: `${i * 80}ms` }}>
            <AlertCard alert={alert} />
          </div>
        ))}
      </div>
    </div>
  )
}
