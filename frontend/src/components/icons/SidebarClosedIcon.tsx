interface Props {
  size?: number
  color?: string
}

export function SidebarClosedIcon({ size = 18, color = '#000000ff' }: Props) {
  return (
    <svg
      viewBox="0 0 172.28 217"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', color }}
    >
      <path
        d="M163.78,108.5c0,82.11-13.89,100-77.64,100-63.75,0-77.64-17.89-77.64-100,0-82.11,13.89-100,77.64-100,63.75,0,77.64,17.89,77.64,100Z"
        stroke="currentColor"
        strokeWidth="17"
        fill="none"
      />
      <path
        d="M28.32,108.5c0,67.95,2.22,74.62,24.87,74.62,22.65,0,24.87-6.68,24.87-74.62h-.04c0-67.95-2.22-74.62-24.87-74.62-22.65,0-24.87,6.68-24.87,74.62"
        fill="currentColor"
      />
    </svg>
  )
}
