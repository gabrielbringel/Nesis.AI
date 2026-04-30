import type { Alert, AnalyzeResponse } from './types'

export const MOCK_PAYLOAD = {
  paciente: {
    nome: 'José Vitor',
    idade: 18,
    alergias: ['Penicilinas'],
  },
  medicacoes: [
    {
      nome: 'Benzetacil',
      dose: '2.400.000 UI',
      frequencia: 'Única',
      via: 'Intramuscular',
    },
  ],
}

export const READING_ATTRIBUTES = [
  'Alergias: Penicilinas',
  'Benzetacil 2.4M UI',
  'Via: Intramuscular',
  'Freq: dose única',
  'Comorbidades: —',
]

export const FALLBACK_ALERTS: Alert[] = [
  {
    severidade: 'GRAVE',
    descricao:
      'Paciente com alergia registrada a Penicilinas. Benzetacil (benzilpenicilina) é uma penicilina de depósito — risco elevado de reação anafilática.',
    medicamentos_envolvidos: ['Benzetacil (Benzilpenicilina)'],
    recomendacao:
      'Suspender prescrição. Considerar alternativa não-betalactâmica, ex: Azitromicina ou Clindamicina conforme indicação.',
  },
  {
    severidade: 'MODERADO',
    descricao:
      'Combinação de Enalapril e Espironolactona pode causar hipercalemia, especialmente em pacientes idosos ou com DRC.',
    medicamentos_envolvidos: ['Enalapril', 'Espironolactona'],
    recomendacao: 'Monitorar potássio sérico semanalmente nas primeiras 4 semanas.',
  },
  {
    severidade: 'LEVE',
    descricao:
      'AAS e Ibuprofeno prescritos simultaneamente — duplicidade de antiinflamatório/antiagregante.',
    medicamentos_envolvidos: ['AAS', 'Ibuprofeno'],
    recomendacao: 'Avaliar necessidade de ambos. Preferir monoterapia.',
  },
]

export const FALLBACK_RESPONSE: AnalyzeResponse = {
  alertas: FALLBACK_ALERTS,
  total_grave: 1,
  total_moderado: 1,
  total_leve: 1,
}
