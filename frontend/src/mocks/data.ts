import type { Analise, Patient, User } from "@/types";

export const mockUser: User = {
  id: "u-1",
  nome: "Gabriel Bringel",
  email: "[EMAIL_ADDRESS]",
  papel: "medico",
};

export const mockPacientes: Patient[] = [
  {
    id: "p-001",
    cns: "700000000000001",
    nome: "Maria da Silva Santos",
    dataNascimento: "1958-03-14",
    sexo: "F",
    ultimaAnalise: "2026-04-18T09:12:00",
  },
  {
    id: "p-002",
    cns: "700000000000002",
    nome: "João Carlos Pereira",
    dataNascimento: "1972-07-22",
    sexo: "M",
    ultimaAnalise: "2026-04-19T14:40:00",
  },
  {
    id: "p-003",
    cns: "700000000000003",
    nome: "Antônio Ferreira Lima",
    dataNascimento: "1949-11-05",
    sexo: "M",
    ultimaAnalise: "2026-04-15T08:20:00",
  },
  {
    id: "p-004",
    cns: "700000000000004",
    nome: "Beatriz Oliveira Souza",
    dataNascimento: "1985-01-30",
    sexo: "F",
    ultimaAnalise: "2026-04-10T16:05:00",
  },
  {
    id: "p-005",
    cns: "700000000000005",
    nome: "Carlos Eduardo Almeida",
    dataNascimento: "1963-09-12",
    sexo: "M",
  },
  {
    id: "p-006",
    cns: "700000000000006",
    nome: "Fernanda Lima Costa",
    dataNascimento: "1990-05-18",
    sexo: "F",
    ultimaAnalise: "2026-04-17T11:30:00",
  },
  {
    id: "p-007",
    cns: "700000000000007",
    nome: "Roberto Mendes Cardoso",
    dataNascimento: "1955-12-03",
    sexo: "M",
    ultimaAnalise: "2026-04-16T13:45:00",
  },
  {
    id: "p-008",
    cns: "700000000000008",
    nome: "Juliana Alves Rodrigues",
    dataNascimento: "1978-08-27",
    sexo: "F",
  },
  {
    id: "p-009",
    cns: "700000000000009",
    nome: "Pedro Henrique Barbosa",
    dataNascimento: "1968-02-11",
    sexo: "M",
    ultimaAnalise: "2026-04-12T10:15:00",
  },
  {
    id: "p-010",
    cns: "700000000000010",
    nome: "Luiza Nascimento Dias",
    dataNascimento: "1995-06-24",
    sexo: "F",
    ultimaAnalise: "2026-04-19T17:00:00",
  },
  {
    id: "p-011",
    cns: "700000000000011",
    nome: "Sebastião Rocha Teixeira",
    dataNascimento: "1944-10-08",
    sexo: "M",
  },
];

export const prontuarioExemplo = `PRONTUÁRIO ELETRÔNICO - UBS Vila Esperança
Data: 19/04/2026   Profissional: Dra. Ana Paula Ribeiro - CRM/SP 123456

Paciente: Maria da Silva Santos, 68 anos, feminino
CNS: 700 0000 0000 0001

QUEIXA PRINCIPAL:
Dor torácica leve em repouso há 3 dias, associada a tontura matinal.

HDA:
Paciente hipertensa há 15 anos, diabética tipo 2 há 10 anos, em uso contínuo
de medicações abaixo. Refere episódio recente de fibrilação atrial detectada
em consulta cardiológica. Nega sangramentos.

DIAGNÓSTICOS (CID-10):
- I10 - Hipertensão essencial
- E11 - Diabetes mellitus tipo 2
- I48 - Fibrilação atrial
- I50 - Insuficiência cardíaca

PRESCRIÇÃO:
1. Warfarina 5mg - 1 comprimido via oral 1x/dia (noite)
2. Ácido acetilsalicílico (AAS) 100mg - 1 comprimido via oral 1x/dia
3. Metformina 850mg - 1 comprimido via oral 2x/dia (após refeições)
4. Losartana 50mg - 1 comprimido via oral 2x/dia
5. Sinvastatina 40mg - 1 comprimido via oral 1x/dia (noite)
6. Furosemida 40mg - 1 comprimido via oral pela manhã

CONDUTA:
Solicitado TAP/INR, glicemia de jejum e eletrocardiograma.
Retorno em 30 dias.`;

export const mockAnalises: Analise[] = [
  {
    id: "a-001",
    pacienteId: "p-001",
    pacienteNome: "Maria da Silva Santos",
    cns: "700000000000001",
    data: "2026-04-18T09:12:00",
    status: "concluida",
    severidadeGeral: "critica",
    prontuarioTexto: prontuarioExemplo,
    medicamentos: [
      {
        id: "m-1",
        nome: "Warfarina",
        dosagem: "5mg",
        posologia: "1x/dia à noite",
        viaAdministracao: "Oral",
        status: "critico",
      },
      {
        id: "m-2",
        nome: "Ácido Acetilsalicílico (AAS)",
        dosagem: "100mg",
        posologia: "1x/dia",
        viaAdministracao: "Oral",
        status: "critico",
      },
      {
        id: "m-3",
        nome: "Metformina",
        dosagem: "850mg",
        posologia: "2x/dia após refeições",
        viaAdministracao: "Oral",
        status: "ok",
      },
      {
        id: "m-4",
        nome: "Losartana",
        dosagem: "50mg",
        posologia: "2x/dia",
        viaAdministracao: "Oral",
        status: "ok",
      },
      {
        id: "m-5",
        nome: "Sinvastatina",
        dosagem: "40mg",
        posologia: "1x/dia à noite",
        viaAdministracao: "Oral",
        status: "atencao",
      },
      {
        id: "m-6",
        nome: "Furosemida",
        dosagem: "40mg",
        posologia: "1x/dia pela manhã",
        viaAdministracao: "Oral",
        status: "ok",
      },
    ],
    interacoes: [
      {
        id: "i-1",
        medicamentos: ["Warfarina", "AAS"],
        severidade: "critica",
        descricao:
          "A associação de anticoagulante oral (Warfarina) com antiagregante plaquetário (AAS) aumenta significativamente o risco de sangramento maior, incluindo gastrointestinal e intracraniano.",
        recomendacao:
          "Reavaliar necessidade da associação. Se mantida, monitorar INR rigorosamente, pesquisar sangue oculto nas fezes e considerar proteção gástrica com IBP.",
      },
      {
        id: "i-2",
        medicamentos: ["Sinvastatina", "Warfarina"],
        severidade: "moderada",
        descricao:
          "Sinvastatina pode potencializar o efeito anticoagulante da Warfarina por inibição do metabolismo hepático, aumentando o risco de sangramento.",
        recomendacao: "Monitorar INR com maior frequência nas primeiras semanas de associação.",
      },
      {
        id: "i-3",
        medicamentos: ["Furosemida", "Losartana"],
        severidade: "leve",
        descricao:
          "Associação usual no tratamento da insuficiência cardíaca. Atenção para hipotensão ortostática e distúrbios eletrolíticos (hipocalemia).",
        recomendacao: "Controle periódico de potássio sérico e pressão arterial em ortostase.",
      },
    ],
    errosPrescricao: [
      {
        id: "e-1",
        tipo: "duplicidade",
        medicamento: "Warfarina + AAS",
        descricao:
          "Duplicidade terapêutica antitrombótica sem indicação clara documentada no prontuário.",
        sugestao:
          "Considerar suspender AAS se o paciente já faz uso de Warfarina com INR terapêutico.",
      },
    ],
    numeroAlertas: 4,
  },
  {
    id: "a-002",
    pacienteId: "p-002",
    pacienteNome: "João Carlos Pereira",
    cns: "700000000000002",
    data: "2026-04-19T14:40:00",
    status: "concluida",
    severidadeGeral: "moderada",
    prontuarioTexto:
      "Paciente 53 anos, hipertenso. Iniciou Enalapril 20mg 2x/dia e Hidroclorotiazida 25mg 1x/dia. Em uso de Ibuprofeno 600mg de 8/8h para lombalgia crônica.",
    medicamentos: [
      {
        id: "m-1",
        nome: "Enalapril",
        dosagem: "20mg",
        posologia: "2x/dia",
        viaAdministracao: "Oral",
        status: "atencao",
      },
      {
        id: "m-2",
        nome: "Hidroclorotiazida",
        dosagem: "25mg",
        posologia: "1x/dia",
        viaAdministracao: "Oral",
        status: "ok",
      },
      {
        id: "m-3",
        nome: "Ibuprofeno",
        dosagem: "600mg",
        posologia: "3x/dia",
        viaAdministracao: "Oral",
        status: "atencao",
      },
    ],
    interacoes: [
      {
        id: "i-1",
        medicamentos: ["Enalapril", "Ibuprofeno"],
        severidade: "moderada",
        descricao:
          "AINEs podem reduzir o efeito anti-hipertensivo dos IECA e aumentar o risco de lesão renal aguda.",
        recomendacao:
          "Evitar uso prolongado do AINE ou substituir por analgésico alternativo. Monitorar função renal e pressão arterial.",
      },
    ],
    errosPrescricao: [],
    numeroAlertas: 1,
  },
  {
    id: "a-003",
    pacienteId: "p-010",
    pacienteNome: "Luiza Nascimento Dias",
    cns: "700000000000010",
    data: "2026-04-19T17:00:00",
    status: "concluida",
    severidadeGeral: "sem_alertas",
    prontuarioTexto:
      "Paciente 30 anos, gestante 1º trimestre. Prescrito Ácido fólico 5mg 1x/dia e Sulfato ferroso 40mg 1x/dia.",
    medicamentos: [
      {
        id: "m-1",
        nome: "Ácido Fólico",
        dosagem: "5mg",
        posologia: "1x/dia",
        viaAdministracao: "Oral",
        status: "ok",
      },
      {
        id: "m-2",
        nome: "Sulfato Ferroso",
        dosagem: "40mg",
        posologia: "1x/dia",
        viaAdministracao: "Oral",
        status: "ok",
      },
    ],
    interacoes: [],
    errosPrescricao: [],
    numeroAlertas: 0,
  },
  {
    id: "a-004",
    pacienteId: "p-006",
    pacienteNome: "Fernanda Lima Costa",
    cns: "700000000000006",
    data: "2026-04-17T11:30:00",
    status: "concluida",
    severidadeGeral: "moderada",
    prontuarioTexto:
      "Paciente diabética tipo 2 em uso de Metformina 1g 2x/dia. Encaminhada para tomografia com contraste iodado.",
    medicamentos: [
      {
        id: "m-1",
        nome: "Metformina",
        dosagem: "1000mg",
        posologia: "2x/dia",
        viaAdministracao: "Oral",
        status: "atencao",
      },
    ],
    interacoes: [
      {
        id: "i-1",
        medicamentos: ["Metformina", "Contraste iodado"],
        severidade: "moderada",
        descricao:
          "Risco aumentado de acidose láctica e nefropatia induzida por contraste em pacientes em uso de Metformina.",
        recomendacao:
          "Suspender Metformina 48h antes do exame com contraste e reintroduzir após avaliação da função renal.",
      },
    ],
    errosPrescricao: [],
    numeroAlertas: 1,
  },
  {
    id: "a-005",
    pacienteId: "p-007",
    pacienteNome: "Roberto Mendes Cardoso",
    cns: "700000000000007",
    data: "2026-04-16T13:45:00",
    status: "concluida",
    severidadeGeral: "leve",
    prontuarioTexto:
      "Paciente em uso de Omeprazol 20mg 1x/dia, Losartana 50mg 1x/dia e Atenolol 50mg 1x/dia.",
    medicamentos: [
      {
        id: "m-1",
        nome: "Omeprazol",
        dosagem: "20mg",
        posologia: "1x/dia",
        viaAdministracao: "Oral",
        status: "ok",
      },
      {
        id: "m-2",
        nome: "Losartana",
        dosagem: "50mg",
        posologia: "1x/dia",
        viaAdministracao: "Oral",
        status: "ok",
      },
      {
        id: "m-3",
        nome: "Atenolol",
        dosagem: "50mg",
        posologia: "1x/dia",
        viaAdministracao: "Oral",
        status: "ok",
      },
    ],
    interacoes: [
      {
        id: "i-1",
        medicamentos: ["Losartana", "Atenolol"],
        severidade: "leve",
        descricao: "Associação usual para controle pressórico. Monitorar risco de hipotensão.",
        recomendacao: "Controle de PA em consultas regulares.",
      },
    ],
    errosPrescricao: [],
    numeroAlertas: 1,
  },
];

export const mockGraficoAnalises = [
  { dia: "Qui", analises: 8 },
  { dia: "Sex", analises: 12 },
  { dia: "Sáb", analises: 5 },
  { dia: "Dom", analises: 3 },
  { dia: "Seg", analises: 14 },
  { dia: "Ter", analises: 17 },
  { dia: "Qua", analises: 11 },
];
