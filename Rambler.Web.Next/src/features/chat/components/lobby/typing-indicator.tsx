"use client";

import { useEffect, useState } from "react";
import { useChatStore } from "@/features/chat/state/chat-store";

/** "Ada is typing…" dock shown just above the composer for the active room. */
export function TypingIndicator() {
  const typing = useChatStore((s) => (s.activeId ? s.conversations[s.activeId]?.typing : undefined));
  // re-render on a tick so expired entries fall off even without a stop frame
  const [, setTick] = useState(0);

  const active = Object.values(typing ?? {}).filter((t) => t.until > Date.now());

  useEffect(() => {
    if (active.length === 0) return;
    const id = setInterval(() => setTick((n) => n + 1), 1500);
    return () => clearInterval(id);
  }, [active.length]);

  if (active.length === 0) return null;

  const names = active.map((t) => t.nick);
  let label: string;
  if (names.length === 1) label = `${names[0]} is typing`;
  else if (names.length === 2) label = `${names[0]} and ${names[1]} are typing`;
  else label = `${names.length} people are typing`;

  return (
    <div className="flex items-center gap-2 px-1 pb-1 text-[12px] text-[var(--muted)]">
      <span className="typing-dots" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      <span className="truncate">{label}…</span>
    </div>
  );
}
