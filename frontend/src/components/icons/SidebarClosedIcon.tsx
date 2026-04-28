interface Props {
  size?: number
  color?: string
}

export function SidebarClosedIcon({ size = 18, color = 'currentColor' }: Props) {
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
    </svg>
  )
}
