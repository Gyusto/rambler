"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeMenu } from "@/features/theme/theme-menu";
import { RoomBrowser } from "@/features/chat/components/lobby/room-browser";
import { CreateRoomButton } from "@/features/chat/components/lobby/create-room-button";
import { IgnoreListButton } from "@/features/chat/components/lobby/ignore-list-button";
import { AdminPanelButton } from "@/features/chat/components/lobby/admin-panel-button";
import { NotificationsBell } from "@/features/chat/components/lobby/notifications-panel";
import { AccountSettingsModal } from "@/features/auth/components/account-settings-modal";
import { useAuth } from "@/features/auth/hooks/use-auth";

/** Full-width top app bar: brand on the left, global actions on the right. */
export function AppHeader() {
  const router = useRouter();
  const nick = useAuth((s) => s.session?.nick);
  const clear = useAuth((s) => s.clear);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  function logOff() {
    clear();
    router.push("/login");
  }

  const pill =
    "flex items-center gap-2 rounded-[10px] border border-[var(--line)] bg-transparent px-3 py-1.5 text-[13px] font-medium text-[var(--text)] transition-colors hover:bg-[var(--raised)]";
  const iconBtn =
    "grid h-9 w-9 place-items-center rounded-[10px] border border-[var(--line)] text-[var(--muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]";

  return (
    <header className="app-header relative z-[2] flex items-center gap-4 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] px-[var(--pad)] py-3">
      <div className="flex min-w-0 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ewclogo.svg" alt="" className="h-8 w-auto flex-none" />
        <div className="min-w-0 leading-tight">
          <div className="truncate font-[var(--font-bri,inherit)] text-[17px] font-extrabold tracking-[-.01em] text-[var(--text)]">
            Rambler
          </div>
          <div className="truncate text-[12px] text-[var(--muted)]">
            where conversations happen
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button type="button" className={pill} onClick={() => setBrowserOpen(true)}>
          <i className="fa-solid fa-list" /> Channels
        </button>
        <CreateRoomButton />
        <ThemeMenu />
        <IgnoreListButton />
        <AdminPanelButton />
        <NotificationsBell />
        <button
          type="button"
          className={iconBtn}
          title={nick ? `${nick} - account settings` : "Account settings"}
          aria-label="Account settings"
          onClick={() => setSettingsOpen(true)}
        >
          <i className="fa-regular fa-user" />
        </button>
        <button type="button" className={pill} onClick={logOff}>
          <i className="fa-solid fa-right-from-bracket" /> Log off
        </button>
      </div>

      <RoomBrowser open={browserOpen} onClose={() => setBrowserOpen(false)} />
      <AccountSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}
