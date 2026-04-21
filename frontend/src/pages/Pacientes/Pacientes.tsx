import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, FilePlus2, ChevronLeft, ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { mockPacientes } from "@/mocks/data";
import { useAnalysisStore } from "@/store/analysisStore";
import { calcularIdade, formatCNS, formatDate, formatDateTime } from "@/utils/format";

const PAGE_SIZE = 6;

export default function Pacientes() {
  const navigate = useNavigate();
  const setPacienteSelecionado = useAnalysisStore((s) => s.setPacienteSelecionado);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mockPacientes;
    return mockPacientes.filter(
      (p) => p.nome.toLowerCase().includes(q) || p.cns.includes(q.replace(/\D/g, "")),
    );
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedPage = Math.min(page, totalPages);
  const start = (pagedPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  const iniciarAnalise = (pacienteId: string) => {
    const p = mockPacientes.find((x) => x.id === pacienteId);
    if (p) setPacienteSelecionado(p);
    navigate("/analise/nova");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
          <p className="text-sm text-slate-500">Lista de pacientes cadastrados no eSUS</p>
        </div>
        <Link
          to="/analise/nova"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          <FilePlus2 size={16} /> Nova Análise
        </Link>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="relative mb-4 max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <Input
              placeholder="Buscar por nome ou CNS..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9"
              aria-label="Buscar paciente"
            />
          </div>

          {pageItems.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Nenhum paciente encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-3 pr-4 font-medium">CNS</th>
                    <th className="py-3 pr-4 font-medium">Nome</th>
                    <th className="py-3 pr-4 font-medium">Nascimento</th>
                    <th className="py-3 pr-4 font-medium">Idade</th>
                    <th className="py-3 pr-4 font-medium">Última análise</th>
                    <th className="py-3 pr-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-4 font-mono text-xs text-slate-600">
                        {formatCNS(p.cns)}
                      </td>
                      <td className="py-3 pr-4 font-medium text-slate-800">{p.nome}</td>
                      <td className="py-3 pr-4 text-slate-600">
                        {formatDate(p.dataNascimento)}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {calcularIdade(p.dataNascimento)} anos
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {p.ultimaAnalise ? (
                          formatDateTime(p.ultimaAnalise)
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => iniciarAnalise(p.id)}>
                          Nova análise
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>
              Mostrando {pageItems.length} de {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={pagedPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Página anterior"
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="font-medium text-slate-700">
                {pagedPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={pagedPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Próxima página"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
