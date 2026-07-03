"use client";

import { useEffect, useState } from "react";
import { getToken, useChatStore } from "@/features/chat/state/chat-store";
import { messagesApi } from "@/features/chat/api/messages.api";
import type { ChatMessage, Conversation } from "@/features/chat/types";
import { RoomBrowser } from "@/features/chat/components/lobby/room-browser";

function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-2.5 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--faint)] ${className}`}>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 px-2.5 py-1.5 text-[12px] italic text-[var(--faint)]">{children}</div>;
}

function ConvRow({
  conv,
  active,
  onSelect,
  onClose,
}: {
  conv: Conversation;
  active: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  const isRoom = conv.kind === "room";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group flex cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors ${
        active
          ? "bg-[var(--glow-b)] text-white"
          : "text-[var(--text-2)] hover:bg-[var(--msg-hover)]"
      }`}
    >
      <i
        className={`fa-solid ${isRoom ? "fa-hashtag" : "fa-message"} w-4 flex-none text-center text-[13px] ${
          active ? "text-white/90" : "text-[var(--faint)]"
        }`}
      />
      <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{conv.name}</span>

      {isRoom && conv.users.length > 0 && (
        <span
          title={`${conv.users.length} in room`}
          className={`flex flex-none items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
            conv.unread > 0 ? "hidden" : "group-hover:hidden"
          } ${active ? "text-white/80" : "text-[var(--faint)]"}`}
        >
          <i className="fa-solid fa-user text-[8px]" />
          {conv.users.length}
        </span>
      )}

      {conv.unread > 0 && (
        <span
          className={`flex-none rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none group-hover:hidden ${
            active ? "bg-white/25 text-white" : "bg-[var(--glow-b)] text-white"
          }`}
        >
          {conv.unread > 99 ? "99+" : conv.unread}
        </span>
      )}

      <button
        type="button"
        title="Close"
        aria-label={`Close ${conv.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className={`hidden h-5 w-5 flex-none place-items-center rounded-[6px] transition-colors group-hover:grid ${
          active ? "text-white/80 hover:bg-white/20" : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
        }`}
      >
        <i className="fa-solid fa-xmark text-[12px]" />
      </button>
    </div>
  );
}

export function RoomsRail() {
  const [browserOpen, setBrowserOpen] = useState(false);

  const order = useChatStore((s) => s.order);
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const userId = useChatStore((s) => s.userId);
  const setActive = useChatStore((s) => s.setActive);
  const closeConversation = useChatStore((s) => s.closeConversation);
  const hydrateHistory = useChatStore((s) => s.hydrateHistory);
  const markHistoryLoaded = useChatStore((s) => s.markHistoryLoaded);

  const list = order.map((id) => conversations[id]).filter(Boolean) as Conversation[];
  const rooms = list.filter((c) => c.kind === "room");
  const dms = list.filter((c) => c.kind === "dm");

  // Load stored history the first time a conversation is active. The flag lives
  // on the conversation, so a closed-then-reopened room/DM fetches again.
  useEffect(() => {
    if (!activeId) return;
    const conv = conversations[activeId];
    if (!conv || conv.historyLoaded) return;

    const convId = activeId;
    let cancelled = false;
    (async () => {
      try {
        const mapped: ChatMessage[] =
          conv.kind === "dm"
            ? // DM conversation id === the other user's id
              [...(await messagesApi.getDirectMessages(getToken(), convId, 0))]
                .reverse()
                .map((e, i) => ({
                  id: `${e.Timestamp}-${i}`,
                  userId: e.Data.UserId,
                  nick: e.Data.Nick ?? conv.name ?? "?",
                  text: e.Data.Message ?? "",
                  self: e.Data.UserId === userId,
                  ts: e.Timestamp,
                }))
            : [...(await messagesApi.getSubscriptionMessages(getToken(), convId, 0))]
                .reverse()
                .map((e, i) => ({
                  id: `${e.Timestamp}-${i}`,
                  userId: e.Data.UserId,
                  nick: e.Data.Nick ?? "?",
                  text: e.Data.Message ?? "",
                  self: e.Data.UserId === userId,
                  ts: e.Timestamp,
                }));
        if (cancelled) return;
        if (mapped.length > 0) hydrateHistory(convId, mapped);
        markHistoryLoaded(convId);
      } catch {
        // best-effort; leave the flag unset so it retries next time
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId, conversations, userId, hydrateHistory, markHistoryLoaded]);

  return (
    <aside className="rooms-rail flex min-h-0 min-w-0 flex-col border-r border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_55%,transparent)]">
      <div className="flex items-center gap-2 border-b border-[var(--line)] px-3.5 py-3.5">
        <h2 className="m-0 flex-1 text-[16px] font-bold tracking-[-.01em] text-[var(--text)]">
          Chats
        </h2>
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-[10px] bg-transparent text-[var(--muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]"
          title="Browse rooms"
          aria-label="Browse rooms"
          onClick={() => setBrowserOpen(true)}
        >
          <i className="fa-solid fa-plus text-[16px]" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
        <SectionLabel>Channels</SectionLabel>
        {rooms.map((conv) => (
          <ConvRow
            key={conv.id}
            conv={conv}
            active={activeId === conv.id}
            onSelect={() => setActive(conv.id)}
            onClose={() => closeConversation(conv.id)}
          />
        ))}
        {rooms.length === 0 && <Empty>No channels yet.</Empty>}

        <SectionLabel className="mt-3">Direct Messages</SectionLabel>
        {dms.map((conv) => (
          <ConvRow
            key={conv.id}
            conv={conv}
            active={activeId === conv.id}
            onSelect={() => setActive(conv.id)}
            onClose={() => closeConversation(conv.id)}
          />
        ))}
        {dms.length === 0 && <Empty>No direct messages.</Empty>}
      </div>

      <RoomBrowser open={browserOpen} onClose={() => setBrowserOpen(false)} />
    </aside>
  );
}
