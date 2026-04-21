import { Menu } from "lucide-react";

interface Props {
  onToggleSidebar: () => void;
}

export function Topbar({ onToggleSidebar }: Props) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
          onClick={onToggleSidebar}
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-sm font-medium text-slate-500 hidden sm:block">
          Sistema de Apoio à Decisão Clínica
        </h1>
      </div>
    </header>
  );
}
