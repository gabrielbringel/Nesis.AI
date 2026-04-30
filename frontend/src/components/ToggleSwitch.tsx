interface Props {
  checked: boolean
  onChange: () => void
  ariaLabel: string
}

export function ToggleSwitch({ checked, onChange, ariaLabel }: Props) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      style={{
        width: '28px',
        height: '16px',
        borderRadius: '10px',
        background: checked ? '#1a1a1a' : '#ddd8d0',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        padding: 0,
        flexShrink: 0,
        transition: 'background 0.15s ease',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          left: '2px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: '#ffffff',
          transform: checked ? 'translateX(12px)' : 'translateX(0)',
          transition: 'transform 0.15s ease',
        }}
      />
    </button>
  )
}
