import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  FileWarning,
  Users,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SeverityBadge } from "@/components/ui/Badge";
import { useAnalysisStore } from "@/store/analysisStore";
import { mockGraficoAnalises } from "@/mocks/data";
import { formatDateTime } from "@/utils/format";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone: "brand" | "danger" | "warning" | "info";
  trend?: string;
}

const toneBg: Record<StatCardProps["tone"], string> = {
  brand: "bg-brand-50 text-brand-700",
  danger: "bg-red-50 text-red-700",
  warning: "bg-amber-50 text-amber-700",
  info: "bg-sky-50 text-sky-700",
};

function StatCard({ label, value, icon: Icon, tone, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
            {trend && (
              <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                <TrendingUp size={14} />
                {trend}
              </div>
            )}
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${toneBg[tone]}`}>
            <Icon size={20} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const analises = useAnalysisStore((s) => s.analises);

  const hoje = new Date().toISOString().slice(0, 10);
  const hojeAnalises = analises.filter((a) => a.data.startsWith(hoje)).length;
  const criticas = analises.filter((a) => a.severidadeGeral === "critica").length;
  const comErro = analises.filter((a) => a.errosPrescricao.length > 0).length;
  const pacientesUnicos = new Set(analises.map((a) => a.pacienteId)).size;

  const ultimas = [...analises].slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Visão geral da atividade clínica</p>
        </div>
        <Link
          to="/analise/nova"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          Nova Análise <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Análises hoje"
          value={hojeAnalises}
          icon={Activity}
          tone="brand"
          trend="+18% vs ontem"
        />
        <StatCard
          label="Interações críticas"
          value={criticas}
          icon={AlertTriangle}
          tone="danger"
        />
        <StatCard
          label="Erros de prescrição"
          value={comErro}
          icon={FileWarning}
          tone="warning"
        />
        <StatCard label="Pacientes analisados" value={pacientesUnicos} icon={Users} tone="info" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Análises nos últimos 7 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockGraficoAnalises}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="dia" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="analises"
                    stroke="#21797b"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#21797b" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimas análises</CardTitle>
          </CardHeader>
          <CardContent>
            {ultimas.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma análise ainda.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {ultimas.map((a) => (
                  <li key={a.id} className="py-3">
                    <Link
                      to={`/analise/${a.id}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {a.pacienteNome}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(a.data)} · {a.numeroAlertas}{" "}
                          {a.numeroAlertas === 1 ? "alerta" : "alertas"}
                        </p>
                      </div>
                      <SeverityBadge severidade={a.severidadeGeral} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
