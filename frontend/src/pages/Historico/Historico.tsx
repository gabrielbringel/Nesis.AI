import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Eye, Search } from "lucide-react";
import toast from "react-hot-toast";

import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SeverityBadge } from "@/components/ui/Badge";
import { useAnalysisStore } from "@/store/analysisStore";
import { formatDateTime } from "@/utils/format";
import type { Severity } from "@/types";

export default function Historico() {
  const analises = useAnalysisStore((s) => s.analises);
  const [query, setQuery] = useState("");
  const [severidade, setSeveridade] = useState<Severity | "todas">("todas");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return analises.filter((a) => {
      if (severidade !== "todas" && a.severidadeGeral !== severidade) return false;
      if (q && !a.pacienteNome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [analises, query, severidade]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Histórico</h1>
        <p className="text-sm text-slate-500">Todas as análises realizadas na plataforma</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <Input
                placeholder="Buscar por paciente..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={severidade}
              onChange={(e) => setSeveridade(e.target.value as Severity | "todas")}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              aria-label="Filtrar por severidade"
            >
              <option value="todas">Todas as severidades</option>
              <option value="critica">Crítica</option>
              <option value="moderada">Moderada</option>
              <option value="leve">Leve</option>
              <option value="sem_alertas">Sem alertas</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Nenhuma análise encontrada com os filtros atuais.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Paciente</th>
                    <th className="py-3 pr-4 font-medium">Data</th>
                    <th className="py-3 pr-4 font-medium">Medicamentos</th>
                    <th className="py-3 pr-4 font-medium">Alertas</th>
                    <th className="py-3 pr-4 font-medium">Severidade</th>
                    <th className="py-3 pr-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-4 font-medium text-slate-800">{a.pacienteNome}</td>
                      <td className="py-3 pr-4 text-slate-600">{formatDateTime(a.data)}</td>
                      <td className="py-3 pr-4 text-slate-600">{a.medicamentos.length}</td>
                      <td className="py-3 pr-4 text-slate-600">{a.numeroAlertas}</td>
                      <td className="py-3 pr-4">
                        <SeverityBadge severidade={a.severidadeGeral} />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex justify-end gap-2">
                          <Link to={`/analise/${a.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye size={14} /> Ver
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toast.success("Exportado (demonstração)")}
                            aria-label="Exportar"
                          >
                            <Download size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
