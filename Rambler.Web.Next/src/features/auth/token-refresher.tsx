"use client";

import { useEffect } from "react";
import { accountApi } from "@/features/auth/api/account.api";
import { useAuth } from "@/features/auth/hooks/use-auth";

/** How often to proactively swap the chat token for a fresh one (~20 min). */
const REFRESH_INTERVAL_MS = 20 * 60 * 1000;

/**
 * Invisible mount-once helper that keeps a signed-in (non-guest) user's chat
 * token fresh. It re-exchanges the token on an interval and whenever the window
 * regains focus, then stores the result via `useAuth`.
 *
 * No-ops for guests and when there is no session - guest tokens are long-lived
 * and reused on purpose, so there is nothing to refresh.
 */
export function TokenRefresher() {
  const hasSession = useAuth((s) => !!s.session);
  const isGuest = useAuth((s) => s.session?.isGuest ?? true);
  const setToken = useAuth((s) => s.setToken);

  useEffect(() => {
    if (!hasSession || isGuest) return;

    let cancelled = false;

    async function refresh() {
      // Read the live session so we always send the current token.
      const current = useAuth.getState().session;
      if (!current || current.isGuest) return;
      try {
        const next = await accountApi.refreshToken(current.token);
        if (!cancelled && typeof next === "string" && next.length > 0) {
          setToken(next);
        }
      } catch {
        // A failed refresh just means we keep the existing token; the socket
        // still works until the token actually expires.
      }
    }

    const id = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [hasSession, isGuest, setToken]);

  return null;
}
