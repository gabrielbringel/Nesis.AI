export type Severity = "critica" | "moderada" | "leve" | "sem_alertas";

export type AnalysisStatus = "concluida" | "processando" | "erro";

export interface Patient {
  id: string;
  cns: string;
  nome: string;
  dataNascimento: string;
  sexo: "M" | "F";
  ultimaAnalise?: string;
}

export interface Medicamento {
  id: string;
  nome: string;
  dosagem: string;
  posologia: string;
  viaAdministracao: string;
  status: "ok" | "atencao" | "critico";
}

export interface InteracaoMedicamentosa {
  id: string;
  medicamentos: [string, string];
  severidade: Severity;
  descricao: string;
  recomendacao: string;
}

export interface ErroPrescricao {
  id: string;
  tipo: "dosagem" | "contraindicacao" | "duplicidade" | "via";
  medicamento: string;
  descricao: string;
  sugestao: string;
}

export interface Analise {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  cns: string;
  data: string;
  status: AnalysisStatus;
  severidadeGeral: Severity;
  prontuarioTexto: string;
  medicamentos: Medicamento[];
  interacoes: InteracaoMedicamentosa[];
  errosPrescricao: ErroPrescricao[];
  numeroAlertas: number;
}

export interface User {
  id: string;
  nome: string;
  email: string;
  papel: "medico" | "farmaceutico" | "enfermeiro";
}
