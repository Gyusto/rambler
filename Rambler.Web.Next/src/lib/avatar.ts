const PALETTE = ["#4EBAA5", "#895EE4", "#FF8CAE", "#FEE28E", "#3F9CBC", "#D9686C"];

/** Deterministic accent colour derived from a seed (nick / id). Null-safe. */
export function avatarColor(seed: string | null | undefined): string {
  const s = seed ?? "";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Solid avatar background derived from a seed (kept name for callers). */
export function avatarGradient(seed: string): string {
  return avatarColor(seed);
}

export function initials(nick: string): string {
  const n = (nick || "?").trim();
  const parts = n.split(/\s+/);
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}
