import { NesisWordmark } from './icons/NesisWordmark'

export function SidebarHeader() {
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
      {/* Hamburger */}
      <button
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
        aria-label="Menu"
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              display: 'block',
              width: '18px',
              height: '1.5px',
              background: '#555',
              borderRadius: '1px',
            }}
          />
        ))}
      </button>

      {/* Wordmark */}
      <NesisWordmark height={16} fill="#1a1a1a" />

      {/* Avatar */}
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: '#e8e4de',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-sans)',
          fontSize: '12px',
          fontWeight: 500,
          color: '#555',
          flexShrink: 0,
        }}
      >
        M
      </div>
    </div>
  )
}
