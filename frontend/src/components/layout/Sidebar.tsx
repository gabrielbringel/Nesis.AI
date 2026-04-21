import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FilePlus2,
  History,
  Settings,
  Stethoscope,
  X,
} from "lucide-react";
import { cn } from "@/utils/cn";

interface Props {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/analise/nova", label: "Nova Análise", icon: FilePlus2 },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar({ open, onClose }: Props) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-slate-900/40 lg:hidden",
          open ? "block" : "hidden",
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed z-40 flex h-screen w-64 flex-col border-r border-slate-200 bg-white",
          "transition-transform duration-200 lg:translate-x-0 lg:static",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Navegação principal"
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-600 text-white">
              <Stethoscope size={18} />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 leading-none">Nesis.AI</div>
              <div className="mt-0.5 text-xs text-slate-500">Análise de Prontuários</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
          <ul className="space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    )
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          <p>Nesis.AI v0.1</p>
          <p>© 2026</p>
        </div>
      </aside>
    </>
  );
}
