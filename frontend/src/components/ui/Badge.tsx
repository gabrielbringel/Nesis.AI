import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";
import type { Severity } from "@/types";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-red-50 text-red-800 border-red-200",
  info: "bg-brand-50 text-brand-800 border-brand-200",
};

export function Badge({ tone = "neutral", className, children, ...rest }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export function SeverityBadge({ severidade }: { severidade: Severity }) {
  const map: Record<Severity, { tone: Tone; label: string }> = {
    critica: { tone: "danger", label: "Crítica" },
    moderada: { tone: "warning", label: "Moderada" },
    leve: { tone: "info", label: "Leve" },
    sem_alertas: { tone: "success", label: "Sem alertas" },
  };
  const { tone, label } = map[severidade];
  return <Badge tone={tone}>{label}</Badge>;
}
