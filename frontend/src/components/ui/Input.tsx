import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "h-10 rounded-md border border-slate-300 bg-white px-3 text-sm",
            "placeholder:text-slate-400",
            "focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
            error && "border-red-400 focus:border-red-500 focus:ring-red-500/20",
            className,
          )}
          {...rest}
        />
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  },
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={cn(
            "min-h-[140px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm",
            "placeholder:text-slate-400 resize-y",
            "focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
            error && "border-red-400 focus:border-red-500",
            className,
          )}
          {...rest}
        />
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
