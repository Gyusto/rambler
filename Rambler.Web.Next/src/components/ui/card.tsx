import * as React from "react";
import { cn } from "@/lib/utils";

/** Glassmorphism surface used for panels and dialogs. */
export function GlassCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/12 bg-rambler-indigo/45 shadow-2xl shadow-black/40 backdrop-blur-xl backdrop-saturate-150",
        className,
      )}
      {...props}
    />
  );
}
