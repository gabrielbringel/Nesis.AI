interface Props {
  size?: number
  color?: string
}

export function PlusIcon({ size = 13, color = 'currentColor' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      strokeLinecap="round"
      strokeWidth="1.5"
      style={{ display: 'block', flexShrink: 0, stroke: color }}
    >
      <line x1="6" y1="1" x2="6" y2="11" />
      <line x1="1" y1="6" x2="11" y2="6" />
    </svg>
  )
}
