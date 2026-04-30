import { MOCK_HISTORY } from '../data/mockHistory'
import { groupByDate } from '../utils/groupByDate'
import { normalizeText } from '../utils/normalizeText'
import { HistoryItem } from './HistoryItem'

interface Props {
  searchQuery: string
}

export function HistoryView({ searchQuery }: Props) {
  const filtered = searchQuery
    ? MOCK_HISTORY.filter((entry) =>
        normalizeText(entry.name).includes(normalizeText(searchQuery))
      )
    : MOCK_HISTORY

  const groups = groupByDate(filtered)

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
                <HistoryItem key={entry.id} entry={entry} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
