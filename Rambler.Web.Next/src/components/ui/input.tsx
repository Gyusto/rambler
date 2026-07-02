import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-white",
        "placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-rambler-turquoise/60 focus-visible:border-rambler-turquoise/60",
        "transition-shadow disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
