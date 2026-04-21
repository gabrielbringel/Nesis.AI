import { useState } from "react";
import toast from "react-hot-toast";
import { Bell, Globe, Palette, Shield } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function Configuracoes() {
  const [notifCriticas, setNotifCriticas] = useState(true);
  const [notifModeradas, setNotifModeradas] = useState(true);
  const [notifLeves, setNotifLeves] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-500">Preferências da plataforma</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield size={18} className="text-brand-600" /> Sobre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Plataforma aberta para demonstração. Acesso irrestrito e sem autenticação.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell size={18} className="text-brand-600" /> Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Toggle
            label="Alertas críticos"
            description="Notificar sempre que uma interação crítica for detectada"
            checked={notifCriticas}
            onChange={setNotifCriticas}
          />
          <Toggle
            label="Alertas moderados"
            description="Notificar para interações moderadas"
            checked={notifModeradas}
            onChange={setNotifModeradas}
          />
          <Toggle
            label="Alertas leves"
            description="Notificar para interações leves"
            checked={notifLeves}
            onChange={setNotifLeves}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette size={18} className="text-brand-600" /> Aparência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Tema claro (padrão). Temas adicionais serão disponibilizados em versões futuras.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe size={18} className="text-brand-600" /> Idioma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Português do Brasil (pt-BR)</p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => toast.success("Preferências salvas")}>Salvar alterações</Button>
      </div>
    </div>
  );
}

interface ToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-slate-200 p-3">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          checked ? "bg-brand-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
