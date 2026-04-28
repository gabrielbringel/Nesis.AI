import { MOCK_HISTORY } from '../data/mockHistory'
import { groupByDate } from '../utils/groupByDate'
import { HistoryItem } from './HistoryItem'

export function HistoryView() {
  const groups = groupByDate(MOCK_HISTORY)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Search field — visual only */}
      <div style={{ padding: '10px 10px 6px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#f0ede8',
            border: '0.5px solid var(--color-border)',
            borderRadius: '8px',
            padding: '6px 10px',
          }}
        >
          <SearchIcon />
          <input
            type="text"
            placeholder="buscar paciente..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '8px' }}>
        {groups.map((group) => (
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
        ))}
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
