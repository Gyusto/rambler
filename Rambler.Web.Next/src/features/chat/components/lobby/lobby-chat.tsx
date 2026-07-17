"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/features/chat/components/lobby/topbar";
import { MessageStream } from "@/features/chat/components/lobby/message-stream";
import { Composer } from "@/features/chat/components/lobby/composer";
import { MembersPanel } from "@/features/chat/components/lobby/members-panel";
import { RoomsRail } from "@/features/chat/components/lobby/rooms-rail";
import { AppHeader } from "@/features/chat/components/lobby/app-header";
import { NoRoomsView } from "@/features/chat/components/lobby/no-rooms-view";
import { useChatStore } from "@/features/chat/state/chat-store";
import { useNotifications } from "@/features/chat/state/use-notifications";
import { statusApi } from "@/features/chat/api/status.api";

export function LobbyChat() {
  const [membersOpen, setMembersOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);

  // Load the admin-configured custom notification sound once, on mount.
  useEffect(() => {
    statusApi
      .getConfig()
      .then((res) => useNotifications.getState().setSoundUrl(res.NotificationSoundUrl))
      .catch(() => {});
  }, []);
  const error = useChatStore((s) => s.error);
  const clearError = useChatStore((s) => s.clearError);
  const hasActiveConversation = useChatStore(
    (s) => s.order.length > 0 && !!s.activeId,
  );

  return (
    <div className="lobby-app">
      <div className="aurora" aria-hidden="true">
        <span className="b1" />
        <span className="b2" />
        <span className="b3" />
      </div>

      {error && (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3">
          <div className="pointer-events-auto flex max-w-[min(420px,92vw)] items-center gap-3 rounded-[12px] border border-[color-mix(in_srgb,var(--glow-a)_45%,var(--line))] bg-[var(--surface)] px-4 py-2.5 text-[13px] text-[var(--text)] shadow-[0_18px_50px_-20px_rgba(0,0,0,.55)]">
            <i className="fa-solid fa-triangle-exclamation flex-none text-[var(--glow-a)]" />
            <span className="min-w-0 flex-1">{error}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={clearError}
              className="grid h-6 w-6 flex-none place-items-center rounded-[7px] text-[var(--muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]"
            >
              <i className="fa-solid fa-xmark text-[13px]" />
            </button>
          </div>
        </div>
      )}

      <AppHeader />

      <div className="lobby-grid">
        <RoomsRail open={railOpen} onNavigate={() => setRailOpen(false)} />

        <section className="lobby-chat">
          {hasActiveConversation ? (
            <>
              <TopBar
                onToggleMembers={() => setMembersOpen((v) => !v)}
                onToggleRail={() => setRailOpen((v) => !v)}
              />
              <MessageStream />
              <Composer />
            </>
          ) : (
            <NoRoomsView />
          )}
        </section>

        <MembersPanel open={membersOpen} />
      </div>

      <button
        className={`scrim${membersOpen || railOpen ? " show" : ""}`}
        aria-label="Close panels"
        onClick={() => {
          setMembersOpen(false);
          setRailOpen(false);
        }}
      />
    </div>
  );
}
