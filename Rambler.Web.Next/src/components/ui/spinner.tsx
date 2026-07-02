import { cn } from "@/lib/utils";

/**
 * Modern circular ring spinner. Inherits the current text color via
 * `currentColor`; size it with height/width utilities in `className`
 * (defaults to h-4 w-4). Replaces the old Font Awesome spin icon.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Centered loading block for panels/modals: an accent spinner over an
 * optional label. Use this in place of a bare "Loading…" line.
 */
export function Loading({
  label = "Loading…",
  className,
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-[var(--muted)]",
        compact ? "py-4" : "py-8",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Spinner className="h-6 w-6 text-rambler-turquoise" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

/** Full-screen centered loader on the dark theme background, shown while the chat is booting. */
export function FullPageLoader({ label }: { label?: string }) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-rambler-indigo text-white"
      role="status"
      aria-live="polite"
    >
      <Spinner className="h-9 w-9 text-rambler-turquoise" />
      {label && <p className="text-sm text-white/60">{label}</p>}
    </div>
  );
}
