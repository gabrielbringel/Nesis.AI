import { addRecord, getHistory } from '../stores/historyStore'
import type { AnalysisRecord } from '../stores/historyStore'

function makeId(i: number): string {
  return `seed-${i}-${Math.random().toString(36).slice(2, 7)}`
}

type SeedInput = Omit<AnalysisRecord, 'id'>

const NOW = () => Date.now()

const SEEDS: SeedInput[] = [
  // 1 — INT-003 — GRAVE — Digoxina + Amiodarona
  {
    timestamp: NOW() - 1000 * 60 * 20,
    patient: { displayLabel: 'Roberto F., 72 anos', nome: 'Roberto Ferreira', idade: 72 },
    alertas: [
      {
        severidade: 'GRAVE',
        titulo: 'Aumento dos níveis de Digoxina',
        descricao:
          'A amiodarona inibe a glicoproteína-P, reduzindo a eliminação da digoxina, com risco de intoxicação digitálica, arritmias, náuseas e distúrbios visuais. Fonte: Base cardiovascular NesisAI (INT-003).',
        medicamentos_envolvidos: ['Digoxina', 'Amiodarona'],
        recomendacao: 'Reduzir a dose de digoxina em 30-50% e monitorar níveis plasmáticos.',
      },
    ],
    scrapedData: {
      nome: 'Roberto Ferreira',
      idade: '72',
      sexo: 'Masculino',
      peso: '68kg',
      altura: '170cm',
      alergias: [],
      motivoConsulta: 'Insuficiência cardíaca descompensada',
      objetivo: '',
      avaliacao: '',
      problemasCondicoes: ['Insuficiência cardíaca', 'Fibrilação atrial'],
      medicacoes: [
        { nome: 'Digoxina', posologia: '0,25mg 1x ao dia via oral' },
        { nome: 'Amiodarona', posologia: '200mg 2x ao dia via oral' },
      ],
    },
    payload: {
      paciente: {
        nome: 'Roberto Ferreira',
        idade: 72,
        sexo: 'H',
        peso: '68kg',
        altura: '170cm',
        alergias: [],
        motivo_consulta: 'Insuficiência cardíaca descompensada',
        problemas_condicoes: ['Insuficiência cardíaca', 'Fibrilação atrial'],
      },
      medicacoes: [
        { nome: 'Digoxina', posologia_completa: '0,25mg 1x ao dia via oral' },
        { nome: 'Amiodarona', posologia_completa: '200mg 2x ao dia via oral' },
      ],
    },
  },

  // 2 — INT-007 — GRAVE — Warfarina + AAS
  {
    timestamp: NOW() - 1000 * 60 * 60 * 2,
    patient: { displayLabel: 'Maria O., 65 anos', nome: 'Maria Oliveira', idade: 65 },
    alertas: [
      {
        severidade: 'GRAVE',
        titulo: 'Risco hemorrágico aditivo',
        descricao:
          'A antiagregação plaquetária do AAS somada à inibição dos fatores de coagulação pela warfarina aumenta o risco de sangramentos gastrointestinais e intracranianos. Fonte: Base cardiovascular NesisAI (INT-007).',
        medicamentos_envolvidos: ['Varfarina', 'AAS'],
        recomendacao: 'Evitar combinação a menos que o benefício (ex: prótese valvar) supere o risco.',
      },
    ],
    scrapedData: {
      nome: 'Maria Oliveira',
      idade: '65',
      sexo: 'Feminino',
      peso: '62kg',
      altura: '158cm',
      alergias: ['Dipirona'],
      motivoConsulta: 'Controle de fibrilação atrial',
      objetivo: '',
      avaliacao: '',
      problemasCondicoes: ['Fibrilação atrial', 'Osteoartrose'],
      medicacoes: [
        { nome: 'Varfarina', posologia: '5mg 1x ao dia via oral' },
        { nome: 'AAS', posologia: '100mg 1x ao dia via oral' },
      ],
    },
    payload: {
      paciente: {
        nome: 'Maria Oliveira',
        idade: 65,
        sexo: 'M',
        peso: '62kg',
        altura: '158cm',
        alergias: ['Dipirona'],
        motivo_consulta: 'Controle de fibrilação atrial',
        problemas_condicoes: ['Fibrilação atrial', 'Osteoartrose'],
      },
      medicacoes: [
        { nome: 'Varfarina', posologia_completa: '5mg 1x ao dia via oral' },
        { nome: 'AAS', posologia_completa: '100mg 1x ao dia via oral' },
      ],
    },
  },

  // 3 — INT-002 — MODERADO — Enalapril + Espironolactona
  {
    timestamp: NOW() - 1000 * 60 * 60 * 4,
    patient: { displayLabel: 'Ana C., 58 anos', nome: 'Ana Costa', idade: 58 },
    alertas: [
      {
        severidade: 'MODERADO',
        titulo: 'Risco de Hipercalemia',
        descricao:
          'IECA e antagonista de aldosterona reduzem a excreção renal de potássio, podendo elevar os níveis séricos e causar arritmias. Fonte: Base cardiovascular NesisAI (INT-002).',
        medicamentos_envolvidos: ['Enalapril', 'Espironolactona'],
        recomendacao: 'Monitorar potássio sérico e creatinina em 1 e 4 semanas após início ou ajuste.',
      },
    ],
    scrapedData: {
      nome: 'Ana Costa',
      idade: '58',
      sexo: 'Feminino',
      peso: '70kg',
      altura: '163cm',
      alergias: ['AAS'],
      motivoConsulta: 'Insuficiência cardíaca',
      objetivo: '',
      avaliacao: '',
      problemasCondicoes: ['Insuficiência cardíaca', 'Hipertensão arterial'],
      medicacoes: [
        { nome: 'Enalapril', posologia: '10mg 2x ao dia via oral' },
        { nome: 'Espironolactona', posologia: '25mg 1x ao dia via oral' },
      ],
    },
    payload: {
      paciente: {
        nome: 'Ana Costa',
        idade: 58,
        sexo: 'M',
        peso: '70kg',
        altura: '163cm',
        alergias: ['AAS'],
        motivo_consulta: 'Insuficiência cardíaca',
        problemas_condicoes: ['Insuficiência cardíaca', 'Hipertensão arterial'],
      },
      medicacoes: [
        { nome: 'Enalapril', posologia_completa: '10mg 2x ao dia via oral' },
        { nome: 'Espironolactona', posologia_completa: '25mg 1x ao dia via oral' },
      ],
    },
  },

  // 4 — INT-005 — MODERADO — Sinvastatina + Amiodarona
  {
    timestamp: NOW() - 1000 * 60 * 60 * 6,
    patient: { displayLabel: 'Carlos L., 55 anos', nome: 'Carlos Lima', idade: 55 },
    alertas: [
      {
        severidade: 'MODERADO',
        titulo: 'Risco de Miopatia/Rabdomiólise',
        descricao:
          'A amiodarona inibe o metabolismo da sinvastatina via CYP3A4, aumentando a concentração plasmática da estatina e gerando dor muscular. Fonte: Base cardiovascular NesisAI (INT-005).',
        medicamentos_envolvidos: ['Sinvastatina', 'Amiodarona'],
        recomendacao: 'Não exceder a dose de 20mg de sinvastatina ao dia se em uso de amiodarona.',
      },
    ],
    scrapedData: {
      nome: 'Carlos Lima',
      idade: '55',
      sexo: 'Masculino',
      peso: '85kg',
      altura: '174cm',
      alergias: [],
      motivoConsulta: 'Controle de hipercolesterolemia',
      objetivo: '',
      avaliacao: '',
      problemasCondicoes: ['Hipercolesterolemia', 'Fibrilação atrial'],
      medicacoes: [
        { nome: 'Sinvastatina', posologia: '40mg 1x ao dia via oral' },
        { nome: 'Amiodarona', posologia: '200mg 1x ao dia via oral' },
      ],
    },
    payload: {
      paciente: {
        nome: 'Carlos Lima',
        idade: 55,
        sexo: 'H',
        peso: '85kg',
        altura: '174cm',
        alergias: [],
        motivo_consulta: 'Controle de hipercolesterolemia',
        problemas_condicoes: ['Hipercolesterolemia', 'Fibrilação atrial'],
      },
      medicacoes: [
        { nome: 'Sinvastatina', posologia_completa: '40mg 1x ao dia via oral' },
        { nome: 'Amiodarona', posologia_completa: '200mg 1x ao dia via oral' },
      ],
    },
  },

  // 5 — CON-001 — GRAVE — Propranolol em asma
  {
    timestamp: NOW() - 1000 * 60 * 60 * 24,
    patient: { displayLabel: 'Carlos M., 43 anos', nome: 'Carlos Mendes', idade: 43 },
    alertas: [
      {
        severidade: 'GRAVE',
        titulo: 'Uso em pacientes asmáticos',
        descricao:
          'Bloqueio de receptores Beta-2 nos brônquios pode precipitar broncoespasmo grave e insuficiência respiratória. Fonte: Base cardiovascular NesisAI (CON-001).',
        medicamentos_envolvidos: ['Propranolol'],
        recomendacao: 'Contraindicado em asma e DPOC grave. Preferir betabloqueadores cardiosseletivos.',
      },
    ],
    scrapedData: {
      nome: 'Carlos Mendes',
      idade: '43',
      sexo: 'Masculino',
      peso: '82kg',
      altura: '177cm',
      alergias: [],
      motivoConsulta: 'Hipertensão arterial',
      objetivo: '',
      avaliacao: '',
      problemasCondicoes: ['Hipertensão arterial', 'Asma brônquica'],
      medicacoes: [{ nome: 'Propranolol', posologia: '40mg 2x ao dia via oral' }],
    },
    payload: {
      paciente: {
        nome: 'Carlos Mendes',
        idade: 43,
        sexo: 'H',
        peso: '82kg',
        altura: '177cm',
        alergias: [],
        motivo_consulta: 'Hipertensão arterial',
        problemas_condicoes: ['Hipertensão arterial', 'Asma brônquica'],
      },
      medicacoes: [{ nome: 'Propranolol', posologia_completa: '40mg 2x ao dia via oral' }],
    },
  },

  // 6 — CON-004 — GRAVE — Espironolactona em hipercalemia
  {
    timestamp: NOW() - 1000 * 60 * 60 * 27,
    patient: { displayLabel: 'João S., 67 anos', nome: 'João Souza', idade: 67 },
    alertas: [
      {
        severidade: 'GRAVE',
        titulo: 'Hipercalemia pré-existente',
        descricao:
          'A inibição da excreção de potássio pela espironolactona agrava o quadro de hipercalemia, com risco de arritmias fatais e parada cardíaca. Fonte: Base cardiovascular NesisAI (CON-004).',
        medicamentos_envolvidos: ['Espironolactona'],
        recomendacao: 'Não iniciar se K sérico > 5.0 mEq/L ou Creatinina > 2.5 mg/dL.',
      },
    ],
    scrapedData: {
      nome: 'João Souza',
      idade: '67',
      sexo: 'Masculino',
      peso: '74kg',
      altura: '168cm',
      alergias: [],
      motivoConsulta: 'Insuficiência cardíaca com edema',
      objetivo: '',
      avaliacao: '',
      problemasCondicoes: ['Insuficiência cardíaca', 'Hipercalemia (K=5.4)', 'Insuficiência renal crônica moderada'],
      medicacoes: [
        { nome: 'Espironolactona', posologia: '25mg 1x ao dia via oral' },
        { nome: 'Losartana', posologia: '50mg 1x ao dia via oral' },
      ],
    },
    payload: {
      paciente: {
        nome: 'João Souza',
        idade: 67,
        sexo: 'H',
        peso: '74kg',
        altura: '168cm',
        alergias: [],
        motivo_consulta: 'Insuficiência cardíaca com edema',
        problemas_condicoes: ['Insuficiência cardíaca', 'Hipercalemia (K=5.4)', 'Insuficiência renal crônica moderada'],
      },
      medicacoes: [
        { nome: 'Espironolactona', posologia_completa: '25mg 1x ao dia via oral' },
        { nome: 'Losartana', posologia_completa: '50mg 1x ao dia via oral' },
      ],
    },
  },

  // 7 — CON-003 — GRAVE — Metformina em IR grave
  {
    timestamp: NOW() - 1000 * 60 * 60 * 24 * 2,
    patient: { displayLabel: 'Lúcia S., 70 anos', nome: 'Lúcia Santos', idade: 70 },
    alertas: [
      {
        severidade: 'GRAVE',
        titulo: 'Insuficiência Renal Grave',
        descricao:
          'O acúmulo da metformina por falta de excreção renal gera alto risco de acidose láctica fatal. Fonte: Base cardiovascular NesisAI (CON-003).',
        medicamentos_envolvidos: ['Metformina'],
        recomendacao: 'Contraindicado se Ritmo de Filtração Glomerular < 30 mL/min/1.73m².',
      },
    ],
    scrapedData: {
      nome: 'Lúcia Santos',
      idade: '70',
      sexo: 'Feminino',
      peso: '66kg',
      altura: '160cm',
      alergias: ['Sulfonamidas'],
      motivoConsulta: 'Controle glicêmico',
      objetivo: '',
      avaliacao: '',
      problemasCondicoes: ['Diabetes mellitus tipo 2', 'Insuficiência renal crônica grave (TFG < 30)'],
      medicacoes: [{ nome: 'Metformina', posologia: '850mg 2x ao dia via oral' }],
    },
    payload: {
      paciente: {
        nome: 'Lúcia Santos',
        idade: 70,
        sexo: 'M',
        peso: '66kg',
        altura: '160cm',
        alergias: ['Sulfonamidas'],
        motivo_consulta: 'Controle glicêmico',
        problemas_condicoes: ['Diabetes mellitus tipo 2', 'Insuficiência renal crônica grave (TFG < 30)'],
      },
      medicacoes: [{ nome: 'Metformina', posologia_completa: '850mg 2x ao dia via oral' }],
    },
  },

  // 8 — REN-004 — GRAVE — Digoxina em IR
  {
    timestamp: NOW() - 1000 * 60 * 60 * 24 * 3,
    patient: { displayLabel: 'Pedro A., 75 anos', nome: 'Pedro Alves', idade: 75 },
    alertas: [
      {
        severidade: 'GRAVE',
        titulo: 'Ajuste rigoroso na disfunção renal',
        descricao:
          'O clearance renal da digoxina é proporcional ao ClCr, com risco de intoxicação digitálica rápida na disfunção renal. Fonte: Base cardiovascular NesisAI (REN-004).',
        medicamentos_envolvidos: ['Digoxina'],
        recomendacao: 'Reduzir dose para 0,125mg em dias alternados ou doses menores se ClCr < 30.',
      },
    ],
    scrapedData: {
      nome: 'Pedro Alves',
      idade: '75',
      sexo: 'Masculino',
      peso: '60kg',
      altura: '165cm',
      alergias: [],
      motivoConsulta: 'Controle de frequência cardíaca',
      objetivo: '',
      avaliacao: '',
      problemasCondicoes: ['Fibrilação atrial', 'Insuficiência renal crônica (ClCr 28)'],
      medicacoes: [{ nome: 'Digoxina', posologia: '0,25mg 1x ao dia via oral' }],
    },
    payload: {
      paciente: {
        nome: 'Pedro Alves',
        idade: 75,
        sexo: 'H',
        peso: '60kg',
        altura: '165cm',
        alergias: [],
        motivo_consulta: 'Controle de frequência cardíaca',
        problemas_condicoes: ['Fibrilação atrial', 'Insuficiência renal crônica (ClCr 28)'],
      },
      medicacoes: [{ nome: 'Digoxina', posologia_completa: '0,25mg 1x ao dia via oral' }],
    },
  },

  // 9 — IDO-002 — MODERADO — Hidroclorotiazida em idosa
  {
    timestamp: NOW() - 1000 * 60 * 60 * 24 * 4,
    patient: { displayLabel: 'Teresa R., 81 anos', nome: 'Teresa Rocha', idade: 81 },
    alertas: [
      {
        severidade: 'MODERADO',
        titulo: 'Risco de Hiponatremia',
        descricao:
          'A alteração na diluição urinária acentuada pela idade pode causar confusão mental, quedas e hiponatremia grave em idosos sob tiazídicos. Fonte: Base cardiovascular NesisAI (IDO-002).',
        medicamentos_envolvidos: ['Hidroclorotiazida'],
        recomendacao: 'Evitar doses > 25mg; monitorar eletrólitos após 2 semanas.',
      },
    ],
    scrapedData: {
      nome: 'Teresa Rocha',
      idade: '81',
      sexo: 'Feminino',
      peso: '52kg',
      altura: '155cm',
      alergias: ['Penicilinas'],
      motivoConsulta: 'Hipertensão arterial',
      objetivo: '',
      avaliacao: '',
      problemasCondicoes: ['Hipertensão arterial', 'Osteoporose'],
      medicacoes: [
        { nome: 'Hidroclorotiazida', posologia: '50mg 1x ao dia via oral' },
        { nome: 'Losartana', posologia: '50mg 1x ao dia via oral' },
      ],
    },
    payload: {
      paciente: {
        nome: 'Teresa Rocha',
        idade: 81,
        sexo: 'M',
        peso: '52kg',
        altura: '155cm',
        alergias: ['Penicilinas'],
        motivo_consulta: 'Hipertensão arterial',
        problemas_condicoes: ['Hipertensão arterial', 'Osteoporose'],
      },
      medicacoes: [
        { nome: 'Hidroclorotiazida', posologia_completa: '50mg 1x ao dia via oral' },
        { nome: 'Losartana', posologia_completa: '50mg 1x ao dia via oral' },
      ],
    },
  },

  // 10 — Sem alertas
  {
    timestamp: NOW() - 1000 * 60 * 60 * 24 * 5,
    patient: { displayLabel: 'João M., 35 anos', nome: 'João Martins', idade: 35 },
    alertas: [],
    scrapedData: {
      nome: 'João Martins',
      idade: '35',
      sexo: 'Masculino',
      peso: '78kg',
      altura: '180cm',
      alergias: [],
      motivoConsulta: 'Hipertensão arterial leve',
      objetivo: '',
      avaliacao: '',
      problemasCondicoes: ['Hipertensão arterial'],
      medicacoes: [{ nome: 'Losartana', posologia: '50mg 1x ao dia via oral' }],
    },
    payload: {
      paciente: {
        nome: 'João Martins',
        idade: 35,
        sexo: 'H',
        peso: '78kg',
        altura: '180cm',
        alergias: [],
        motivo_consulta: 'Hipertensão arterial leve',
        problemas_condicoes: ['Hipertensão arterial'],
      },
      medicacoes: [{ nome: 'Losartana', posologia_completa: '50mg 1x ao dia via oral' }],
    },
  },
]

export function seedHistory(): void {
  if (getHistory().length > 0) return
  for (let i = SEEDS.length - 1; i >= 0; i--) {
    addRecord({ ...SEEDS[i], id: makeId(i) })
  }
}
