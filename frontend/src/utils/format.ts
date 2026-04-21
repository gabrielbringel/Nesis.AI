import type { Severity } from "@/types";

export function formatCNS(cns: string): string {
  const digits = cns.replace(/\D/g, "");
  if (digits.length !== 15) return cns;
  return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 11)} ${digits.slice(11)}`;
}

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("pt-BR");
}

export function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function calcularIdade(dataNascimento: string): number {
  const nasc = new Date(dataNascimento);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

export function labelSeveridade(s: Severity): string {
  switch (s) {
    case "critica":
      return "Crítica";
    case "moderada":
      return "Moderada";
    case "leve":
      return "Leve";
    case "sem_alertas":
      return "Sem alertas";
  }
}
