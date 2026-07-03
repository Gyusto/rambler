"use client";

import { useState } from "react";
import { RoomSettingsModal } from "@/features/chat/components/lobby/room-settings-modal";
import { useChatStore } from "@/features/chat/state/chat-store";
import { ConnectionStatus } from "@/features/chat/types";

const dotClass: Record<ConnectionStatus, string> = {
  [ConnectionStatus.Connected]: "",
  [ConnectionStatus.Connecting]: "warn",
  [ConnectionStatus.Waiting]: "warn",
  [ConnectionStatus.Disconnected]: "off",
};

export function TopBar({
  onToggleMembers,
  onToggleRail,
}: Readonly<{ onToggleMembers: () => void; onToggleRail: () => void }>) {
  const active = useChatStore((s) => (s.activeId ? s.conversations[s.activeId] : undefined));
  const status = useChatStore((s) => s.status);
  const closeConversation = useChatStore((s) => s.closeConversation);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isRoom = active?.kind === "room";
  const isDm = active?.kind === "dm";
  const count = isRoom ? active.users.length : 0;

  let sub = "connecting…";
  if (isDm) sub = `Private conversation with ${active.name}`;
  else if (active) sub = active.description?.trim() ? active.description.trim() : `${count} here now`;

  return (
    <header className="topbar">
      <button
        className="icon-btn rooms-toggle"
        title="Show chats"
        aria-label="Show chats"
        onClick={onToggleRail}
      >
        <i className="fa-solid fa-bars" />
      </button>
      <div className="brand">
        <span className="topbar-glyph" aria-hidden="true">
          <i className={`fa-solid ${isDm ? "fa-at" : "fa-hashtag"}`} />
        </span>
        <div className="min-w-0">
          <h1 className="room-name truncate">{active?.name ?? "Lobby"}</h1>
          <p className="room-sub">
            <span className={`live-dot ${dotClass[status]}`} />
            <span className="truncate">{sub}</span>
          </p>
        </div>
      </div>

      <div className="actions">
        <button className="icon-btn" title="Search messages" aria-label="Search messages">
          <i className="fa-solid fa-magnifying-glass" />
        </button>
        {isRoom && active && (
          <>
            <button
              className="icon-btn"
              title="Room settings"
              aria-label="Room settings"
              onClick={() => setSettingsOpen(true)}
            >
              <i className="fa-solid fa-gear" />
            </button>
            <button
              className="icon-btn"
              title="Leave room"
              aria-label="Leave room"
              onClick={() => closeConversation(active.id)}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </>
        )}
        <button
          className="icon-btn members-toggle"
          title="Show who's here"
          aria-label="Show who's here"
          onClick={onToggleMembers}
        >
          <i className="fa-solid fa-users" />
        </button>
      </div>

      {isRoom && active && (
        <RoomSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} conv={active} />
      )}
    </header>
  );
}
