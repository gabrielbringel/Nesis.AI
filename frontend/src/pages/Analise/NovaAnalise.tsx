import { type ChangeEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Search, Upload, FileText, User } from "lucide-react";
import toast from "react-hot-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { mockPacientes, prontuarioExemplo } from "@/mocks/data";
import { useAnalysisStore } from "@/store/analysisStore";
import { cn } from "@/utils/cn";
import { calcularIdade, formatCNS } from "@/utils/format";
import type { Analise, Patient } from "@/types";

const STEPS = [
  { num: 1, label: "Selecionar paciente", icon: User },
  { num: 2, label: "Inserir prontuário", icon: FileText },
  { num: 3, label: "Revisar e enviar", icon: Check },
];

export default function NovaAnalise() {
  const navigate = useNavigate();
  const {
    pacienteSelecionado,
    setPacienteSelecionado,
    prontuarioTexto,
    setProntuarioTexto,
    adicionarAnalise,
    resetWizard,
  } = useAnalysisStore();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const canNext = (step === 1 && !!pacienteSelecionado) || (step === 2 && prontuarioTexto.trim().length > 20);

  const handleSubmit = async () => {
    if (!pacienteSelecionado) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 2500));

    const novaAnalise: Analise = {
      id: `a-${Date.now()}`,
      pacienteId: pacienteSelecionado.id,
      pacienteNome: pacienteSelecionado.nome,
      cns: pacienteSelecionado.cns,
      data: new Date().toISOString(),
      status: "concluida",
      severidadeGeral: "moderada",
      prontuarioTexto,
      medicamentos: [
        {
          id: "m-1",
          nome: "Medicamento A",
          dosagem: "—",
          posologia: "—",
          viaAdministracao: "Oral",
          status: "atencao",
        },
      ],
      interacoes: [
        {
          id: "i-1",
          medicamentos: ["Medicamento A", "Medicamento B"],
          severidade: "moderada",
          descricao: "Interação detectada automaticamente pelo motor de IA (mock).",
          recomendacao: "Revisar prescrição e considerar alternativas.",
        },
      ],
      errosPrescricao: [],
      numeroAlertas: 1,
    };

    adicionarAnalise(novaAnalise);
    resetWizard();
    toast.success("Análise concluída");
    navigate(`/analise/${novaAnalise.id}`);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Voltar
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">Nova Análise</h1>
      </div>

      <ol className="flex items-center gap-2">
        {STEPS.map(({ num, label, icon: Icon }, idx) => {
          const active = step === num;
          const done = step > num;
          return (
            <li key={num} className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold",
                    active && "bg-brand-600 text-white",
                    done && "bg-emerald-500 text-white",
                    !active && !done && "bg-slate-200 text-slate-500",
                  )}
                >
                  {done ? <Check size={16} /> : <Icon size={16} />}
                </div>
                <span
                  className={cn(
                    "hidden text-sm font-medium sm:block",
                    active ? "text-slate-900" : "text-slate-500",
                  )}
                >
                  {label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn("h-0.5 flex-1", done ? "bg-emerald-500" : "bg-slate-200")}
                />
              )}
            </li>
          );
        })}
      </ol>

      {submitting ? <SubmittingState /> : null}

      {!submitting && (
        <Card>
          <CardContent className="pt-6">
            {step === 1 && (
              <Step1
                selected={pacienteSelecionado}
                onSelect={setPacienteSelecionado}
              />
            )}
            {step === 2 && (
              <Step2 texto={prontuarioTexto} setTexto={setProntuarioTexto} />
            )}
            {step === 3 && pacienteSelecionado && (
              <Step3 paciente={pacienteSelecionado} texto={prontuarioTexto} />
            )}

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
              <Button
                variant="ghost"
                disabled={step === 1}
                onClick={() => setStep((s) => s - 1)}
              >
                <ArrowLeft size={16} /> Anterior
              </Button>
              {step < 3 ? (
                <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
                  Próximo <ArrowRight size={16} />
                </Button>
              ) : (
                <Button onClick={handleSubmit}>
                  Iniciar Análise <ArrowRight size={16} />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SubmittingState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
        <Spinner className="h-10 w-10" />
        <div className="text-center">
          <p className="text-base font-semibold text-slate-800">
            Analisando prontuário com IA...
          </p>
          <p className="text-sm text-slate-500">
            Extraindo medicamentos e verificando interações.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface Step1Props {
  selected: Patient | null;
  onSelect: (p: Patient) => void;
}

function Step1({ selected, onSelect }: Step1Props) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? mockPacientes.filter(
        (p) => p.nome.toLowerCase().includes(q) || p.cns.includes(q.replace(/\D/g, "")),
      )
    : mockPacientes;

  return (
    <div>
      <CardHeader className="px-0 pt-0">
        <CardTitle>Selecione o paciente</CardTitle>
      </CardHeader>

      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <Input
          placeholder="Buscar por nome ou CNS..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="max-h-80 overflow-y-auto rounded-md border border-slate-200 scrollbar-thin">
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">Nenhum paciente encontrado.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((p) => {
              const isSelected = selected?.id === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(p)}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-3 text-left",
                      isSelected ? "bg-brand-50" : "hover:bg-slate-50",
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.nome}</p>
                      <p className="text-xs text-slate-500">
                        CNS {formatCNS(p.cns)} · {calcularIdade(p.dataNascimento)} anos
                      </p>
                    </div>
                    {isSelected && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white">
                        <Check size={14} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

interface Step2Props {
  texto: string;
  setTexto: (v: string) => void;
}

function Step2({ texto, setTexto }: Step2Props) {
  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setTexto(String(reader.result ?? ""));
    reader.readAsText(file);
    toast.success(`Arquivo ${file.name} carregado`);
  };

  return (
    <div>
      <CardHeader className="px-0 pt-0">
        <CardTitle>Cole o texto do prontuário</CardTitle>
        <p className="mt-1 text-sm text-slate-500">
          Cole o conteúdo do prontuário do eSUS ou faça upload de um arquivo .txt.
        </p>
      </CardHeader>

      <div className="mb-3 flex flex-wrap gap-2">
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Upload size={16} />
          Upload .txt
          <input type="file" accept=".txt" onChange={handleFile} className="hidden" />
        </label>
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={() => setTexto(prontuarioExemplo)}
        >
          Usar exemplo
        </Button>
        {texto && (
          <Button type="button" variant="ghost" size="md" onClick={() => setTexto("")}>
            Limpar
          </Button>
        )}
      </div>

      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Cole aqui o texto livre do prontuário..."
        className="min-h-[260px] font-mono text-xs leading-relaxed"
      />
      <p className="mt-2 text-xs text-slate-500">
        {texto.length} caracteres — mínimo 20 para avançar
      </p>
    </div>
  );
}

interface Step3Props {
  paciente: Patient;
  texto: string;
}

function Step3({ paciente, texto }: Step3Props) {
  return (
    <div>
      <CardHeader className="px-0 pt-0">
        <CardTitle>Revisar e enviar</CardTitle>
      </CardHeader>

      <div className="space-y-4">
        <div className="rounded-md bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Paciente</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{paciente.nome}</p>
          <p className="text-xs text-slate-500">
            CNS {formatCNS(paciente.cns)} · {calcularIdade(paciente.dataNascimento)} anos ·{" "}
            {paciente.sexo === "F" ? "Feminino" : "Masculino"}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
            Trecho do prontuário
          </p>
          <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed text-slate-700 scrollbar-thin">
            {texto.slice(0, 1200)}
            {texto.length > 1200 && "..."}
          </div>
          <p className="mt-1 text-xs text-slate-500">{texto.length} caracteres</p>
        </div>
      </div>
    </div>
  );
}
