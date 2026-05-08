import { useState } from 'react'
import { getHistory } from '../stores/historyStore'
import type { AnalysisRecord } from '../stores/historyStore'
import { groupByDate } from '../utils/groupByDate'
import { normalizeText } from '../utils/normalizeText'
import { HistoryItem } from './HistoryItem'

interface Props {
  searchQuery: string
  onLoadRecord: (record: AnalysisRecord) => void
  onClose: () => void
}

export function HistoryView({ searchQuery, onLoadRecord, onClose }: Props) {
  const [records, setRecords] = useState<AnalysisRecord[]>(() => getHistory())

  const refresh = () => setRecords(getHistory())

  const filtered = searchQuery
    ? records.filter((r) =>
        normalizeText(r.patient.displayLabel).includes(normalizeText(searchQuery)) ||
        normalizeText(r.patient.nome).includes(normalizeText(searchQuery))
      )
    : records

  // groupByDate expects { date: Date } — add it from timestamp
  const withDate = filtered.map((r) => ({ ...r, date: new Date(r.timestamp) }))
  const groups = groupByDate(withDate)

  const handleLoad = (record: AnalysisRecord) => {
    onLoadRecord(record)
    onClose()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '8px' }}>
        {groups.length === 0 ? (
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontStyle: 'italic',
              fontSize: '11px',
              color: '#aaa',
              textAlign: 'center',
              marginTop: '24px',
            }}
          >
            Nenhum paciente encontrado.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 400,
                  fontStyle: 'italic',
                  fontSize: '12px',
                  color: '#aaa',
                  padding: '8px 8px 3px',
                  textTransform: 'lowercase',
                }}
              >
                {group.label}
              </p>
              {group.items.map((entry) => (
                <HistoryItem
                  key={entry.id}
                  record={entry}
                  onClick={() => handleLoad(entry)}
                  onDelete={refresh}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
