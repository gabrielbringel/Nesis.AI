interface Props {
  size?: number
  color?: string
}

export function SidebarOpenIcon({ size = 18, color = '#000000ff' }: Props) {
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
        d="M28.36,108.5c0,67.95,3.95,74.62,44.15,74.62,40.2,0,44.15-6.68,44.15-74.62h-.08c0-67.95-3.95-74.62-44.15-74.62-40.2,0-44.15,6.68-44.15,74.62"
        fill="currentColor"
      />
    </svg>
  )
}
