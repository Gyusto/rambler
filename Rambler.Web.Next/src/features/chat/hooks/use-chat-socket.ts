"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/features/chat/state/chat-store";

/**
 * Opens the chat socket once the session is available and tears it down on
 * unmount. It deliberately does NOT reconnect when the token or nick value
 * changes mid-session: a background token refresh or a live nickname change
 * must not drop and re-establish the socket (which would churn the roster).
 * Identity switches happen via a full navigation (unmount/remount).
 */
export function useChatConnection(token: string | undefined, nick: string | undefined) {
  const connect = useChatStore((s) => s.connect);
  const disconnect = useChatStore((s) => s.disconnect);

  const tokenRef = useRef(token);
  const nickRef = useRef(nick);
  tokenRef.current = token;
  nickRef.current = nick;

  const ready = !!token && !!nick;

  useEffect(() => {
    if (!ready) return;
    connect(tokenRef.current as string, nickRef.current as string);
    return () => disconnect();
  }, [ready, connect, disconnect]);
}
