// Formatadores de exibição do paciente.

const PREPOSICOES = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])

/**
 * Abrevia o primeiro nome, mantendo o resto.
 *   "Antonio dos Santos Ramalho" → "A. dos Santos"
 *   "Maria Clara de Oliveira"    → "M. Clara de Oliveira"
 *
 * Regra: corta a última palavra (sobrenome de família) só se houver mais de
 * dois tokens não-preposicionais — assim "M. Costa" continua "M. Costa".
 * Preposições ficam lowercase.
 */
export function abbreviateName(fullName: string | null | undefined): string {
  if (!fullName) return ''
  const tokens = fullName.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return ''
  if (tokens.length === 1) return tokens[0]

  const first = tokens[0]
  const rest = tokens.slice(1).map((t) => {
    const lower = t.toLowerCase()
    return PREPOSICOES.has(lower) ? lower : capitalize(t)
  })

  // Se houver pelo menos 2 palavras não-preposicionais no resto, derruba a última
  // (geralmente o sobrenome final).
  const nonPrepCount = rest.filter((t) => !PREPOSICOES.has(t)).length
  const trimmed = nonPrepCount >= 2 ? rest.slice(0, -1) : rest

  // Limpa preposições penduradas no final ("dos Santos de" → "dos Santos")
  while (trimmed.length > 0 && PREPOSICOES.has(trimmed[trimmed.length - 1])) {
    trimmed.pop()
  }

  const initial = first.charAt(0).toUpperCase()
  return `${initial}. ${trimmed.join(' ')}`.trim()
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
  sexoRaw: string | null | undefined,
  idade: number | null | undefined,
): string {
  const nomeAbrev = abbreviateName(nome) || 'Paciente'
  const sexo = normalizeSexo(sexoRaw)
  const idadeStr = typeof idade === 'number' && idade > 0 ? `${idade} anos` : '? anos'
  return `${nomeAbrev} · ${sexo}, ${idadeStr}`
}
