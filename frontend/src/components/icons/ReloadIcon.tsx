interface Props {
  size?: number
  color?: string
}

export function ReloadIcon({ size = 13, color = '#555' }: Props) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="M13.5 8a5.5 5.5 0 1 1-1.1-3.3" />
      <polyline points="14,3 13.5,6.5 10,6" />
    </svg>
  )
}
