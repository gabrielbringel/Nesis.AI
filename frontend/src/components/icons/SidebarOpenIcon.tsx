interface Props {
  size?: number
  color?: string
}

export function SidebarOpenIcon({ size = 18, color = 'currentColor' }: Props) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <rect x="2.5" y="3" width="15" height="14" rx="3" ry="3" strokeWidth="1.3" />
      <rect
        x="2.5"
        y="3"
        width="5.5"
        height="14"
        rx="3"
        ry="3"
        fill={color}
        stroke="none"
        opacity="0.2"
      />
    </svg>
  )
}
