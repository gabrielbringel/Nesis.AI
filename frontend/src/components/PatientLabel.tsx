interface Props {
  label: string
}

export function PatientLabel({ label }: Props) {
  const commaIdx = label.indexOf(',')
  if (commaIdx === -1) {
    return <span style={{ fontWeight: 300, color: 'var(--color-text-secondary)' }}>{label}</span>
  }
  return (
    <>
      <span style={{ fontWeight: 300, color: 'var(--color-text-secondary)' }}>{label.slice(0, commaIdx)}</span>
      <span style={{ fontWeight: 100, fontStyle: 'italic', color: 'var(--color-text-placeholder)' }}>{label.slice(commaIdx)}</span>
    </>
  )
}
