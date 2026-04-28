interface Props {
  size?: number
  color?: string
}

export function GearIcon({ size = 14, color = 'currentColor' }: Props) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth="1.2"
      strokeLinecap="round"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.05 1.05M11.55 11.55l1.05 1.05M12.6 3.4l-1.05 1.05M4.45 11.55l-1.05 1.05" />
    </svg>
  )
}
