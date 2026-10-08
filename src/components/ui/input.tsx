import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex min-h-12 w-full min-w-0 rounded-xl border border-input bg-accent/50 px-3.5 py-3 text-base transition-colors file:mr-3 file:rounded-md file:border-0 file:bg-primary-soft file:px-2 file:py-1 file:text-sm file:font-medium file:text-primary-strong placeholder:text-slate-400 hover:border-slate-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
