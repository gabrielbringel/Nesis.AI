import { create } from "zustand";

import type { Analise, Patient } from "@/types";
import { mockAnalises } from "@/mocks/data";

interface AnalysisState {
  analises: Analise[];
  pacienteSelecionado: Patient | null;
  prontuarioTexto: string;
  getAnalise: (id: string) => Analise | undefined;
  setPacienteSelecionado: (p: Patient | null) => void;
  setProntuarioTexto: (t: string) => void;
  adicionarAnalise: (a: Analise) => void;
  resetWizard: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  analises: mockAnalises,
  pacienteSelecionado: null,
  prontuarioTexto: "",
  getAnalise: (id) => get().analises.find((a) => a.id === id),
  setPacienteSelecionado: (p) => set({ pacienteSelecionado: p }),
  setProntuarioTexto: (t) => set({ prontuarioTexto: t }),
  adicionarAnalise: (a) => set((s) => ({ analises: [a, ...s.analises] })),
  resetWizard: () => set({ pacienteSelecionado: null, prontuarioTexto: "" }),
}));
