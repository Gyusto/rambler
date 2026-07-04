import { create } from "zustand";

export type NotificationType = "mention" | "dm";

export interface AppNotification {
  id: string;
  type: NotificationType;
  /** room or dm conversation id to jump to when clicked */
  convId: string;
  convName: string;
  fromNick: string;
  text: string;
  ts: number;
  read: boolean;
}

const MAX_ITEMS = 50;
const MUTE_KEY = "rambler.notifications.muted";

/** Play the bundled notification chime. Silently no-ops if autoplay is blocked. */
function playChime() {
  try {
    const audio = new Audio("/sounds/notification.wav");
    audio.volume = 0.5;
    void audio.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

/** Fire a native desktop notification when the tab is backgrounded and allowed. */
function maybeDesktopNotification(n: AppNotification) {
  try {
    if (
      typeof document !== "undefined" &&
      document.hidden &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      const title =
        n.type === "dm"
          ? `${n.fromNick} messaged you`
          : `${n.fromNick} mentioned you in ${n.convName}`;
      new Notification(title, { body: n.text.slice(0, 140), tag: n.id });
    }
  } catch {
    /* ignore */
  }
}

interface NotificationState {
  items: AppNotification[];
  muted: boolean;
  /** Record a new notification and (unless muted) play the sound + desktop alert. */
  notify: (n: Pick<AppNotification, "type" | "convId" | "convName" | "fromNick" | "text">) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
  toggleMute: () => void;
}

export const useNotifications = create<NotificationState>((set, get) => ({
  items: [],
  muted: typeof window !== "undefined" && window.localStorage.getItem(MUTE_KEY) === "1",

  notify: (n) => {
    const item: AppNotification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
      read: false,
      ...n,
    };
    set((s) => ({ items: [item, ...s.items].slice(0, MAX_ITEMS) }));
    if (!get().muted) {
      playChime();
      maybeDesktopNotification(item);
    }
  },

  markAllRead: () => set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),
  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  clear: () => set({ items: [] }),
  toggleMute: () =>
    set((s) => {
      const muted = !s.muted;
      try {
        window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
      } catch {
        /* ignore */
      }
      return { muted };
    }),
}));

/** Unread notification count. */
export const selectUnread = (s: NotificationState) =>
  s.items.reduce((total, i) => total + (i.read ? 0 : 1), 0);

/** True when `text` @-mentions `nick` (case-insensitive, whole word). */
export function mentions(text: string, nick: string): boolean {
  if (!nick) return false;
  const escaped = nick.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`@${escaped}(?![\\w-])`, "i").test(text);
}
