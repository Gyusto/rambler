"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
import { avatarColor, avatarGradient, initials } from "@/lib/avatar";
import { useChatStore } from "@/features/chat/state/chat-store";
import { roleBadge } from "@/features/chat/roles";
import type { ChatMessage } from "@/features/chat/types";
import type { RoomUser } from "@/types/protocol";

const GROUP_GAP_MS = 5 * 60 * 1000;

function time(ts: number) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "";
  }
}

/** Render text with `inline code` spans. */
function renderText(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code key={i}>{part.slice(1, -1)}</code>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export function MessageStream() {
  const active = useChatStore((s) => (s.activeId ? s.conversations[s.activeId] : undefined));
  const messages = active?.messages ?? [];
  const users = active?.users ?? [];
  const streamRef = useRef<HTMLElement>(null);

  const byId = useMemo(() => {
    const m = new Map<string, RoomUser>();
    for (const u of users) m.set(u.Id, u);
    return m;
  }, [users]);

  // Scroll the stream itself (not scrollIntoView, which would scroll the whole
  // fixed lobby container and clip the topbar).
  useEffect(() => {
    const el = streamRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const rows = useMemo(
    () =>
      messages.map((m, i) => {
        const prev = messages[i - 1];
        const grouped =
          !m.system &&
          !!prev &&
          !prev.system &&
          prev.userId === m.userId &&
          m.ts - prev.ts <= GROUP_GAP_MS;
        return { m, grouped };
      }),
    [messages],
  );

  return (
    <main className="stream" ref={streamRef} aria-live="polite">
      <div className="daydivider">today</div>

      {messages.length === 0 && (
        <div className="empty">
          <div className="big">👋</div>
          <p>Quiet in here. Say something.</p>
        </div>
      )}

      {rows.map(({ m, grouped }) =>
        m.system ? (
          <div key={m.id} className="sysline">
            <span>{m.text}</span>
          </div>
        ) : (
          <MessageRow key={m.id} m={m} grouped={grouped} user={byId.get(m.userId)} />
        ),
      )}
    </main>
  );
}

function MessageRow({
  m,
  grouped,
  user,
}: {
  m: ChatMessage;
  grouped: boolean;
  user?: RoomUser;
}) {
  const badge = roleBadge(user);
  return (
    <div className={`msg${grouped ? " grouped" : ""}`}>
      {grouped ? (
        <div className="stamp-inline">{time(m.ts)}</div>
      ) : (
        <div className="avatar" style={{ background: avatarGradient(m.nick) }}>
          {initials(m.nick)}
        </div>
      )}
      <div className="body">
        {!grouped && (
          <div className="meta">
            <span className="who" style={{ color: avatarColor(m.nick) }}>
              {m.nick}
            </span>
            {badge && <span className="badge">{badge}</span>}
            <span className="stamp">{time(m.ts)}</span>
          </div>
        )}
        <div className="text">{renderText(m.text)}</div>
      </div>
    </div>
  );
}
