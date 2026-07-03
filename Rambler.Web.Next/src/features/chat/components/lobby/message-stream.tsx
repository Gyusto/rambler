"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { avatarColor, avatarGradient, initials } from "@/lib/avatar";
import { useChatStore } from "@/features/chat/state/chat-store";
import { roleBadge, roleMark } from "@/features/chat/roles";
import { EmojiPicker } from "@/features/chat/components/lobby/emoji-picker";
import type { ChatMessage, Reaction } from "@/features/chat/types";
import type { RoomUser } from "@/types/protocol";

const GROUP_GAP_MS = 5 * 60 * 1000;

/** Quick one-tap reactions shown in the hover toolbar. */
const QUICK_REACTIONS = ["👍", "❤️", "😄"];

/** Collapse a flat reaction list into one entry per emoji. */
function groupReactions(reactions: Reaction[]) {
  const groups = new Map<
    string,
    { emoji: string; count: number; userIds: string[]; nicks: string[] }
  >();
  for (const r of reactions) {
    let g = groups.get(r.emoji);
    if (!g) {
      g = { emoji: r.emoji, count: 0, userIds: [], nicks: [] };
      groups.set(r.emoji, g);
    }
    g.count += 1;
    g.userIds.push(r.userId);
    g.nicks.push(r.nick);
  }
  return [...groups.values()];
}

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
  const myId = useChatStore((s) => s.userId);
  const canAct = m.postId != null;
  const groups = m.reactions?.length ? groupReactions(m.reactions) : [];

  const tbBtn =
    "grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]";

  return (
    <div className={`msg group relative${grouped ? " grouped" : ""}`}>
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
            {badge && (
              <span className="badge">
                <i className={`fa-solid ${roleMark[badge]} mr-1 text-[0.85em]`} />
                {badge}
              </span>
            )}
            <span className="stamp">{time(m.ts)}</span>
          </div>
        )}

        {m.replyTo && (
          <div className="mb-1 max-w-full truncate border-l-2 border-[var(--glow-b)] pl-2 text-[12.5px] text-[var(--muted)]">
            <span className="font-semibold text-[var(--glow-b)]">{m.replyTo.nick}</span>{" "}
            {m.replyTo.text}
          </div>
        )}

        <div className="text">
          {m.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={m.text}
              alt=""
              loading="lazy"
              className="mt-1 max-w-[320px] rounded-[var(--r-sm)] border border-[var(--line)]"
            />
          ) : (
            renderText(m.text)
          )}
        </div>

        {groups.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {groups.map((g) => {
              const mine = myId != null && g.userIds.includes(myId);
              return (
                <button
                  key={g.emoji}
                  type="button"
                  title={g.nicks.join(", ")}
                  disabled={!canAct}
                  onClick={() => canAct && useChatStore.getState().sendReaction(m.postId!, g.emoji)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] leading-none transition-colors ${
                    mine
                      ? "border-[var(--glow-b)] bg-[color:color-mix(in_srgb,var(--glow-b)_20%,transparent)] text-[var(--text)]"
                      : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--glow-b)]"
                  }`}
                >
                  <span className="text-[13px]">{g.emoji}</span>
                  <span className="tabular-nums">{g.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {canAct && <MessageToolbar m={m} btnClass={tbBtn} />}
    </div>
  );
}

/** Floating hover toolbar: quick reactions, full picker, and reply. */
function MessageToolbar({ m, btnClass }: Readonly<{ m: ChatMessage; btnClass: string }>) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const react = (emoji: string) => useChatStore.getState().sendReaction(m.postId!, emoji);

  return (
    <div className="pointer-events-none absolute -top-3.5 right-3 z-10 flex items-center gap-0.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-0.5 opacity-0 shadow-[var(--shadow)] transition-opacity focus-within:pointer-events-auto focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className={btnClass}
          title={`React ${emoji}`}
          onClick={() => react(emoji)}
        >
          <span className="text-[15px] leading-none">{emoji}</span>
        </button>
      ))}

      <div className="relative">
        <button
          type="button"
          className={btnClass}
          title="React…"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((v) => !v)}
        >
          <i className="fa-regular fa-face-smile text-[13px]" />
        </button>
        {pickerOpen && (
          <EmojiPicker
            onPick={(emoji) => {
              react(emoji);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>

      <button
        type="button"
        className={btnClass}
        title="Reply"
        onClick={() =>
          useChatStore.getState().setReplyTarget({ postId: m.postId!, nick: m.nick, text: m.text })
        }
      >
        <i className="fa-solid fa-reply text-[13px]" />
      </button>
    </div>
  );
}
