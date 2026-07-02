/**
 * Client-visible runtime config. Only NEXT_PUBLIC_* vars are available in the
 * browser; BACKEND_URL is server-only and consumed by next.config rewrites.
 */
export const env = {
  /**
   * WebSocket endpoint. Empty by default -> derive same-origin at runtime
   * (the custom server proxies the ws upgrade to the backend). Override with
   * NEXT_PUBLIC_WS_URL only if connecting to the backend directly.
   */
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || "",
  /** REST base - same-origin; proxied to the backend by the custom server. */
  apiBase: "/api",
} as const;
