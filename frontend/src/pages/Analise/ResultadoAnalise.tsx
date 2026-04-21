import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  Download,
  FileText,
  Info,
  Pill,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SeverityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Accordion } from "@/components/ui/Accordion";
import { useAnalysisStore } from "@/store/analysisStore";
import { cn } from "@/utils/cn";
import { formatCNS, formatDateTime } from "@/utils/format";
import type { ErroPrescricao, InteracaoMedicamentosa, Medicamento, Severity } from "@/types";

const medStatusColor = {
  ok: "text-emerald-600 bg-emerald-50 border-emerald-200",
  atencao: "text-amber-700 bg-amber-50 border-amber-200",
  critico: "text-red-700 bg-red-50 border-red-200",
};
const medStatusIcon = { ok: ShieldCheck, atencao: AlertTriangle, critico: AlertOctagon };

const severityStyles: Record<
  Exclude<Severity, "sem_alertas">,
  { border: string; bg: string; text: string; icon: React.ElementType }
> = {
  critica: {
    border: "border-l-red-500",
    bg: "bg-red-50",
    text: "text-red-800",
    icon: AlertOctagon,
  },
  moderada: {
    border: "border-l-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-800",
    icon: AlertTriangle,
  },
  leve: {
    border: "border-l-sky-500",
    bg: "bg-sky-50",
    text: "text-sky-800",
    icon: Info,
  },
};

export default function ResultadoAnalise() {
  const { id } = useParams<{ id: string }>();
  const analise = useAnalysisStore((s) => (id ? s.getAnalise(id) : undefined));

  if (!analise) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <AlertCircle size={36} className="mx-auto text-slate-400" />
        <h2 className="mt-4 text-lg font-semibold text-slate-800">Análise não encontrada</h2>
        <p className="mt-1 text-sm text-slate-500">
          A análise que você tentou acessar não existe ou foi removida.
        </p>
        <Link
          to="/historico"
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          <ArrowLeft size={16} /> Ver histórico
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/historico"
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={14} /> Voltar ao histórico
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{analise.pacienteNome}</h1>
          <p className="mt-1 text-sm text-slate-500">
            CNS {formatCNS(analise.cns)} · Análise em {formatDateTime(analise.data)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SeverityBadge severidade={analise.severidadeGeral} />
          <Button
            variant="outline"
            onClick={() => toast.success("Relatório exportado (demonstração)")}
          >
            <Download size={16} /> Exportar
          </Button>
        </div>
      </div>

      <SectionMedicamentos medicamentos={analise.medicamentos} />
      <SectionInteracoes interacoes={analise.interacoes} />
      <SectionErros erros={analise.errosPrescricao} />

      <Accordion title="Texto original do prontuário" defaultOpen={false}>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
          <FileText size={14} /> Texto completo recebido do eSUS
        </div>
        <pre className="max-h-[400px] overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-700 scrollbar-thin">
          {analise.prontuarioTexto}
        </pre>
      </Accordion>
    </div>
  );
}

function SectionMedicamentos({ medicamentos }: { medicamentos: Medicamento[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill size={18} className="text-brand-600" />
          Medicamentos extraídos ({medicamentos.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {medicamentos.length === 0 ? (
          <EmptyState message="Nenhum medicamento extraído." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {medicamentos.map((m) => {
              const Icon = medStatusIcon[m.status];
              return (
                <div
                  key={m.id}
                  className="flex items-start gap-3 rounded-md border border-slate-200 p-3"
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border",
                      medStatusColor[m.status],
                    )}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">{m.nome}</p>
                    <p className="text-xs text-slate-500">
                      {m.dosagem} · {m.posologia} · Via {m.viaAdministracao}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionInteracoes({ interacoes }: { interacoes: InteracaoMedicamentosa[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-500" />
          Alertas de Interação Medicamentosa ({interacoes.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {interacoes.length === 0 ? (
          <EmptyState message="Nenhuma interação identificada entre os medicamentos prescritos." />
        ) : (
          <div className="space-y-3">
            {interacoes.map((i) => {
              const severity = i.severidade === "sem_alertas" ? "leve" : i.severidade;
              const style = severityStyles[severity];
              const Icon = style.icon;
              return (
                <div
                  key={i.id}
                  className={cn(
                    "flex gap-3 rounded-md border border-l-4 p-4",
                    style.border,
                    style.bg,
                  )}
                >
                  <Icon size={20} className={cn("shrink-0 mt-0.5", style.text)} />
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {i.medicamentos[0]} + {i.medicamentos[1]}
                      </span>
                      <SeverityBadge severidade={i.severidade} />
                    </div>
                    <p className="text-sm text-slate-700">{i.descricao}</p>
                    <div className="rounded-md bg-white/70 p-2 text-sm">
                      <span className="font-semibold text-slate-800">Recomendação: </span>
                      <span className="text-slate-700">{i.recomendacao}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionErros({ erros }: { erros: ErroPrescricao[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle size={18} className="text-red-500" />
          Erros de Prescrição ({erros.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {erros.length === 0 ? (
          <EmptyState message="Nenhum erro de prescrição detectado." />
        ) : (
          <ul className="space-y-3">
            {erros.map((e) => (
              <li
                key={e.id}
                className="flex gap-3 rounded-md border border-red-200 bg-red-50 p-4"
              >
                <AlertOctagon size={20} className="mt-0.5 shrink-0 text-red-600" />
                <div>
                  <p className="font-semibold text-slate-900">{e.medicamento}</p>
                  <p className="mt-0.5 text-sm text-slate-700">{e.descricao}</p>
                  <p className="mt-1 text-sm">
                    <span className="font-semibold text-slate-800">Sugestão: </span>
                    <span className="text-slate-700">{e.sugestao}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
      <ShieldCheck size={16} className="text-emerald-500" />
      {message}
    </div>
  );
}
