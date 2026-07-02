"use client";

import { useEffect } from "react";
import { useChatStore } from "@/features/chat/state/chat-store";

/** Opens the chat socket for the session and tears it down on unmount. */
export function useChatConnection(token: string | undefined, nick: string | undefined) {
  const connect = useChatStore((s) => s.connect);
  const disconnect = useChatStore((s) => s.disconnect);

  useEffect(() => {
    if (!token || !nick) return;
    connect(token, nick);
    return () => disconnect();
  }, [token, nick, connect, disconnect]);
}
