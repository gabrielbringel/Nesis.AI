// Formatadores de exibição do paciente.

const PREPOSICOES = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])

/**
 * Abrevia para "Primeiro Sobrenome.":
 *   "Gabriel Bringel"            → "Gabriel B."
 *   "Antonio dos Santos Ramalho" → "Antonio R."
 *   "Maria Clara de Oliveira"    → "Maria O."
 */
export function abbreviateName(fullName: string | null | undefined): string {
  if (!fullName) return ''
  const tokens = fullName.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return ''
  const firstName = capitalize(tokens[0])
  if (tokens.length === 1) return firstName
  const lastToken = [...tokens].reverse().find((t) => !PREPOSICOES.has(t.toLowerCase()))
  if (!lastToken || lastToken.toLowerCase() === tokens[0].toLowerCase()) return firstName
  return `${firstName} ${lastToken.charAt(0).toUpperCase()}.`
}

function capitalize(word: string): string {
  if (!word) return word
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

/**
 * Normaliza texto bruto de sexo do DOM para "H" / "M" / "?".
 */
export function normalizeSexo(raw: string | null | undefined): string {
  if (!raw) return '?'
  const lower = raw.toLowerCase()
  if (lower.includes('masc')) return 'H'
  if (lower.includes('fem')) return 'M'
  const trimmed = raw.trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

/**
 * Monta o displayLabel padrão: "A. dos Santos · H, 45 anos"
 * Os campos faltantes degradam graciosamente.
 */
export function buildPatientLabel(
  nome: string | null | undefined,
  _sexoRaw: string | null | undefined,
  idade: number | null | undefined,
): string {
  const nomeAbrev = abbreviateName(nome) || 'Paciente'
  const idadeStr = typeof idade === 'number' && idade > 0 ? `${idade} anos` : '? anos'
  return `${nomeAbrev}, ${idadeStr}`
}
