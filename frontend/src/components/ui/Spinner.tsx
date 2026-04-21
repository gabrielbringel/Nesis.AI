import { cn } from "@/utils/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Carregando"
      className={cn(
        "inline-block h-6 w-6 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600",
        className,
      )}
    />
  );
}
