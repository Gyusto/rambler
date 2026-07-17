"use client";

import { useEffect, useRef, useState } from "react";
import {
  useNotifications,
  selectUnread,
  type AppNotification,
} from "@/features/chat/state/use-notifications";
import { useChatStore } from "@/features/chat/state/chat-store";

/** Compact relative time: "just now", "5m", "3h", "2d". */
function relativeTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function truncate(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** The header notification bell: unread badge + a dropdown panel anchored under it. */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const items = useNotifications((s) => s.items);
  const muted = useNotifications((s) => s.muted);
  const unread = useNotifications(selectUnread);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const clear = useNotifications((s) => s.clear);
  const toggleMute = useNotifications((s) => s.toggleMute);

  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click and Escape (mirrors emoji-picker / user-menu).
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openPanel() {
    // Clear the badge as soon as the list is shown; the items stay visible.
    markAllRead();
    // Ask for desktop-notification permission on first open so later alerts can fire.
    try {
      if ("Notification" in window && Notification.permission === "default") {
        void Notification.requestPermission();
      }
    } catch {
      /* ignore */
    }
    setOpen(true);
  }

  function onItemClick(item: AppNotification) {
    useChatStore.getState().setActive(item.convId);
    markAllRead();
    setOpen(false);
  }

  const iconBtn =
    "relative grid h-9 w-9 place-items-center rounded-[10px] border border-[var(--line)] text-[var(--muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]";
  const action =
    "rounded-md px-2 py-1 text-[12px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]";

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        className={iconBtn}
        title="Notifications"
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPanel())}
      >
        <i className={`fa-regular ${muted ? "fa-bell-slash" : "fa-bell"}`} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rambler-self px-1 text-[10px] font-bold leading-none text-white shadow-[var(--shadow)]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]"
        >
          <div className="flex items-center gap-1 border-b border-[var(--line)] px-3 py-2">
            <span className="mr-auto text-[13px] font-semibold text-[var(--text)]">
              Notifications
            </span>
            <button
              type="button"
              className="grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]"
              title={muted ? "Unmute notifications" : "Mute notifications"}
              aria-label={muted ? "Unmute notifications" : "Mute notifications"}
              aria-pressed={muted}
              onClick={() => toggleMute()}
            >
              <i className={`fa-solid ${muted ? "fa-bell-slash text-rambler-self" : "fa-bell"}`} />
            </button>
            <button
              type="button"
              className={action}
              onClick={() => markAllRead()}
              disabled={items.length === 0}
            >
              Mark all read
            </button>
            <button
              type="button"
              className={action}
              onClick={() => clear()}
              disabled={items.length === 0}
            >
              Clear
            </button>
          </div>

          {items.length === 0 ? (
            <div className="px-3 py-10 text-center text-[13px] text-[var(--muted)]">
              No notifications yet.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto py-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={() => onItemClick(item)}
                  className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--raised)] ${
                    item.read ? "" : "bg-[color-mix(in_srgb,var(--glow-b)_10%,transparent)]"
                  }`}
                >
                  <i
                    className={`fa-solid mt-0.5 w-4 flex-none text-center text-[13px] ${
                      item.type === "dm" ? "fa-envelope" : "fa-at"
                    } ${item.read ? "text-[var(--muted)]" : "text-rambler-turquoise"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-[var(--text)]">
                      <span className="font-semibold">{item.fromNick}</span>{" "}
                      {item.type === "dm"
                        ? "messaged you"
                        : `mentioned you in ${item.convName}`}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-[var(--muted)]">
                      {truncate(item.text)}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
                      {relativeTime(item.ts)}
                    </span>
                  </span>
                  {!item.read && (
                    <span
                      aria-hidden
                      className="mt-1.5 h-2 w-2 flex-none rounded-full bg-rambler-self"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
