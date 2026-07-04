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
const MUTED_CONVS_KEY = "rambler.notifications.mutedConvs";
const DEFAULT_SOUND = "/sounds/notification.wav";

/** Read the persisted list of muted conversation ids. */
function loadMutedConvs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MUTED_CONVS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Play a notification chime. Silently no-ops if autoplay is blocked. */
function playChime(src: string) {
  try {
    const audio = new Audio(src);
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
  /** Admin-configured custom chime URL, or null to use the bundled default. */
  soundUrl: string | null;
  /** Conversation ids the user has muted (persisted in localStorage). */
  mutedConvs: string[];
  /** Record a new notification and (unless muted) play the sound + desktop alert. */
  notify: (n: Pick<AppNotification, "type" | "convId" | "convName" | "fromNick" | "text">) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
  toggleMute: () => void;
  /** Set (or clear, with null) the custom notification sound URL. */
  setSoundUrl: (url: string | null) => void;
  /** Toggle per-conversation muting and persist it. */
  toggleConvMute: (convId: string) => void;
  /** True when the given conversation is muted. */
  isConvMuted: (convId: string) => boolean;
}

export const useNotifications = create<NotificationState>((set, get) => ({
  items: [],
  muted: typeof window !== "undefined" && window.localStorage.getItem(MUTE_KEY) === "1",
  soundUrl: null,
  mutedConvs: loadMutedConvs(),

  notify: (n) => {
    const item: AppNotification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
      read: false,
      ...n,
    };
    set((s) => ({ items: [item, ...s.items].slice(0, MAX_ITEMS) }));
    if (!get().muted) {
      playChime(get().soundUrl || DEFAULT_SOUND);
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

  setSoundUrl: (url) => set({ soundUrl: url || null }),

  toggleConvMute: (convId) =>
    set((s) => {
      const mutedConvs = s.mutedConvs.includes(convId)
        ? s.mutedConvs.filter((id) => id !== convId)
        : [...s.mutedConvs, convId];
      try {
        window.localStorage.setItem(MUTED_CONVS_KEY, JSON.stringify(mutedConvs));
      } catch {
        /* ignore */
      }
      return { mutedConvs };
    }),

  isConvMuted: (convId) => get().mutedConvs.includes(convId),
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
