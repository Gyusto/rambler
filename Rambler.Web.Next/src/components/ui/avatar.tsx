import { cn } from "@/lib/utils";
import { avatarColor, initials } from "@/lib/avatar";

export function Avatar({
  nick,
  size = "md",
  className,
}: {
  nick: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-7 w-7 text-[11px]",
    md: "h-9 w-9 text-xs",
    lg: "h-11 w-11 text-sm",
  };
  const color = avatarColor(nick);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-black/80 ring-1 ring-white/20",
        sizes[size],
        className,
      )}
      style={{ background: color }}
    >
      {initials(nick)}
    </span>
  );
}
