import type { ReactNode } from "react";

/** Full-screen flat background for the marketing / auth pages. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-rambler-indigo">
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
