import { create } from "zustand";
import { RamblerSocket } from "@/lib/socket/rambler-socket";
import {
  ErrorCode,
  MessageKey,
  type AuthData,
  type ChannelBannedData,
  type ChannelJoinedData,
  type ChannelMessageData,
  type ChannelTypingData,
  type DirectTypingData,
  type ChannelPartData,
  type ChannelUpdateData,
  type ChannelUserUpdateData,
  type ChannelUsersData,
  type DirectMessageData,
  type JoinData,
  type ResponseEnvelope,
  type RoomUser,
} from "@/types/protocol";
import {
  ConnectionStatus,
  type ChatMessage,
  type Conversation,
} from "@/features/chat/types";

let msgSeq = 0;
const nextId = () => `${Date.now()}-${msgSeq++}`;

interface ChatState {
  status: ConnectionStatus;
  userId?: string;
  nick?: string;
  error?: string;

  /** rooms + DMs keyed by id (channel id / counterpart user id). */
  conversations: Record<string, Conversation>;
  /** display order in the rail. */
  order: string[];
  activeId?: string;

  connect: (token: string, nick: string, initialRoom?: string) => void;
  disconnect: () => void;
  joinRoom: (name: string) => void;
  joinById: (channelId: string) => void;
  openDm: (userId: string, nick: string) => void;
  setActive: (id: string) => void;
  closeConversation: (id: string) => void;
  sendMessage: (text: string) => void;
  /** broadcast a typing start/stop; targets `convId` if given, else the active conversation. */
  sendTyping: (isTyping: boolean, convId?: string) => void;
  /** prepend loaded history to a conversation (idempotent-ish: only if empty). */
  hydrateHistory: (convId: string, msgs: ChatMessage[]) => void;
  /** mark a conversation's history as fetched so we don't refetch it. */
  markHistoryLoaded: (convId: string) => void;
  clearError: () => void;
}

// socket + token kept outside the reactive store
let socket: RamblerSocket | null = null;
let authToken = "";
let pendingRoom = "Lobby";

const errorText: Record<number, string> = {
  [ErrorCode.NoSuchChannel]: "Sorry, I couldn't find a room that matched that.",
  [ErrorCode.NoGuestsAllowed]: "That room doesn't allow guests.",
  [ErrorCode.NotAuthenticated]: "Your session expired. Please sign in again.",
  [ErrorCode.NickInUse]: "That nickname is already in use.",
  [ErrorCode.AlreadyInChannel]: "You're already in that room.",
};

export const getToken = () => authToken;

export const useChatStore = create<ChatState>((set, get) => ({
  status: ConnectionStatus.Disconnected,
  conversations: {},
  order: [],

  connect: (token, nick, initialRoom = "Lobby") => {
    if (socket) return;
    authToken = token;
    pendingRoom = initialRoom;
    set({ status: ConnectionStatus.Connecting, nick });

    socket = new RamblerSocket(token);
    socket.onOpen = () => set({ status: ConnectionStatus.Connected });
    socket.onClose = () => set({ status: ConnectionStatus.Waiting });
    socket.onResponse = (msg) => handle(msg, set, get);
    socket.connect();
  },

  disconnect: () => {
    socket?.disconnect();
    socket = null;
    set({
      status: ConnectionStatus.Disconnected,
      conversations: {},
      order: [],
      activeId: undefined,
    });
  },

  joinRoom: (name) => {
    pendingRoom = name;
    socket?.send(MessageKey.JOIN, { ChannelName: name });
  },

  joinById: (channelId) => {
    socket?.send(MessageKey.JOIN, { ChannelId: channelId });
  },

  openDm: (userId, nick) => {
    const { conversations, order } = get();
    if (conversations[userId]) {
      get().setActive(userId);
      return;
    }
    const conv: Conversation = {
      id: userId,
      kind: "dm",
      name: nick,
      messages: [],
      users: [],
      unread: 0,
      myLevel: 0,
    };
    set({
      conversations: { ...conversations, [userId]: conv },
      order: [...order, userId],
      activeId: userId,
    });
  },

  setActive: (id) => {
    const { conversations } = get();
    const conv = conversations[id];
    if (!conv) return;
    set({ activeId: id, conversations: { ...conversations, [id]: { ...conv, unread: 0 } } });
  },

  closeConversation: (id) => {
    const { conversations, order, activeId } = get();
    const conv = conversations[id];
    if (conv?.kind === "room") socket?.send(MessageKey.CHPART, { ChannelId: id });
    const next = { ...conversations };
    delete next[id];
    const nextOrder = order.filter((o) => o !== id);
    set({
      conversations: next,
      order: nextOrder,
      activeId: activeId === id ? nextOrder[nextOrder.length - 1] : activeId,
    });
  },

  sendMessage: (text) => {
    const { activeId, conversations } = get();
    const conv = activeId ? conversations[activeId] : undefined;
    const trimmed = text.trim();
    if (!conv || !trimmed) return;
    if (conv.kind === "room") {
      socket?.send(MessageKey.CHMSG, { ChannelId: conv.id, Message: trimmed });
    } else {
      socket?.send(MessageKey.DM, { UserId: conv.id, Message: trimmed });
    }
  },

  sendTyping: (isTyping, convId) => {
    const { activeId, conversations } = get();
    const targetId = convId ?? activeId;
    const conv = targetId ? conversations[targetId] : undefined;
    if (!conv) return;
    if (conv.kind === "room") {
      socket?.send(MessageKey.CHTYPING, { ChannelId: conv.id, IsTyping: isTyping });
    } else {
      // DM: conversation id is the counterpart's user id
      socket?.send(MessageKey.DMTYPING, { UserId: conv.id, IsTyping: isTyping });
    }
  },

  hydrateHistory: (convId, msgs) => {
    // prepend older history above whatever is already there (guarded by the
    // conversation's historyLoaded flag, so no repeated prepending).
    patchConv(get, set, convId, (c) => ({ ...c, messages: [...msgs, ...c.messages] }));
  },

  markHistoryLoaded: (convId) => {
    patchConv(get, set, convId, (c) => ({ ...c, historyLoaded: true }));
  },

  clearError: () => set({ error: undefined }),
}));

// ---- helpers -------------------------------------------------------------

type Setter = (partial: Partial<ChatState>) => void;
type Getter = () => ChatState;

function patchConv(get: Getter, set: Setter, id: string, fn: (c: Conversation) => Conversation) {
  const { conversations } = get();
  const conv = conversations[id];
  if (!conv) return;
  set({ conversations: { ...conversations, [id]: fn(conv) } });
}

function addMessage(get: Getter, set: Setter, convId: string, message: ChatMessage) {
  const { conversations, activeId } = get();
  const conv = conversations[convId];
  if (!conv) return;
  const active = activeId === convId;
  set({
    conversations: {
      ...conversations,
      [convId]: {
        ...conv,
        messages: [...conv.messages, message],
        unread: active ? 0 : conv.unread + 1,
      },
    },
  });
}

function systemMessage(convId: string, text: string, get: Getter, set: Setter) {
  addMessage(get, set, convId, {
    id: nextId(),
    userId: "",
    nick: "",
    text,
    self: false,
    ts: Date.now(),
    system: true,
  });
}

/** look up a nick across all room rosters (for DMs where sender roster is unknown) */
function findNick(get: Getter, userId: string): string | undefined {
  for (const c of Object.values(get().conversations)) {
    const u = c.users.find((x) => x.Id === userId);
    if (u) return u.Nick;
  }
  return undefined;
}

// ---- inbound routing -----------------------------------------------------

function handle(msg: ResponseEnvelope, set: Setter, get: Getter) {
  switch (msg.Type) {
    case MessageKey.AUTH: {
      const d = msg.Data as AuthData;
      set({ userId: d.UserId, nick: d.Nick });
      socket?.send(MessageKey.JOIN, { ChannelName: pendingRoom });
      break;
    }
    case MessageKey.JOIN: {
      const d = msg.Data as JoinData;
      const { conversations, order } = get();
      const existing = conversations[d.ChannelId];
      const conv: Conversation = {
        id: d.ChannelId,
        kind: "room",
        name: d.Name,
        description: d.Description,
        messages: existing?.messages ?? [],
        users: existing?.users ?? [],
        unread: 0,
        myLevel: d.Level,
      };
      set({
        conversations: { ...conversations, [d.ChannelId]: conv },
        order: order.includes(d.ChannelId) ? order : [...order, d.ChannelId],
        activeId: d.ChannelId,
        error: undefined,
      });
      break;
    }
    case MessageKey.CHUSERS: {
      const d = msg.Data as ChannelUsersData;
      patchConv(get, set, d.ChannelId, (c) => ({ ...c, users: d.Users ?? [] }));
      break;
    }
    case MessageKey.CHJOIN: {
      const d = msg.Data as ChannelJoinedData;
      const roomId = msg.Subscription;
      patchConv(get, set, roomId, (c) =>
        c.users.some((u) => u.Id === d.UserId)
          ? c
          : { ...c, users: [...c.users, { Id: d.UserId, Nick: d.Nick, IsGuest: d.IsGuest, ModLevel: d.Level }] },
      );
      systemMessage(roomId, `${d.Nick} joined`, get, set);
      break;
    }
    case MessageKey.CHPART: {
      const d = msg.Data as ChannelPartData;
      const roomId = msg.Subscription;
      const conv = get().conversations[roomId];
      const gone = conv?.users.find((u) => u.Id === d.UserId);
      patchConv(get, set, roomId, (c) => ({ ...c, users: c.users.filter((u) => u.Id !== d.UserId) }));
      if (gone) systemMessage(roomId, `${gone.Nick} left`, get, set);
      break;
    }
    case MessageKey.CHMSG: {
      const d = msg.Data as ChannelMessageData;
      const roomId = msg.Subscription;
      const { userId, conversations } = get();
      const sender = conversations[roomId]?.users.find((u) => u.Id === d.UserId);
      addMessage(get, set, roomId, {
        id: nextId(),
        userId: d.UserId,
        nick: d.Nick ?? sender?.Nick ?? "?",
        text: d.Message ?? "",
        self: d.UserId === userId,
        ts: msg.Timestamp,
      });
      break;
    }
    case MessageKey.CHTYPING: {
      const d = msg.Data as ChannelTypingData;
      const roomId = msg.Subscription;
      if (d.UserId === get().userId) break; // ignore our own echo
      patchConv(get, set, roomId, (c) => {
        const typing = { ...(c.typing ?? {}) };
        if (d.IsTyping) typing[d.UserId] = { nick: d.Nick, until: Date.now() + 6000 };
        else delete typing[d.UserId];
        return { ...c, typing };
      });
      break;
    }
    case MessageKey.DMTYPING: {
      const d = msg.Data as DirectTypingData;
      // DM thread is keyed by the sender's id; patchConv skips it if not open
      if (d.UserId === get().userId) break;
      patchConv(get, set, d.UserId, (c) => {
        const typing = { ...(c.typing ?? {}) };
        if (d.IsTyping) typing[d.UserId] = { nick: d.Nick, until: Date.now() + 6000 };
        else delete typing[d.UserId];
        return { ...c, typing };
      });
      break;
    }
    case MessageKey.CHUSERUPDATE: {
      const d = msg.Data as ChannelUserUpdateData;
      const updated: RoomUser = { Id: d.UserId, Nick: d.Nick, IsGuest: d.IsGuest, ModLevel: d.Level };
      patchConv(get, set, msg.Subscription, (c) => ({
        ...c,
        users: c.users.some((u) => u.Id === d.UserId)
          ? c.users.map((u) => (u.Id === d.UserId ? updated : u))
          : [...c.users, updated],
      }));
      break;
    }
    case MessageKey.CHUPDATE: {
      const d = msg.Data as ChannelUpdateData;
      patchConv(get, set, msg.Subscription, (c) => ({ ...c, name: d.Name, description: d.Description }));
      break;
    }
    case MessageKey.DM: {
      const d = msg.Data as DirectMessageData;
      const { userId, nick, conversations, order } = get();
      const counterpart = d.EchoUser ? d.EchoUser : d.UserId;
      if (!counterpart || counterpart === userId) break;
      const self = d.UserId === userId;
      const senderNick = self ? nick ?? "You" : d.Nick ?? findNick(get, d.UserId) ?? "Someone";
      // ensure a DM conversation exists
      if (!conversations[counterpart]) {
        const name = self ? findNick(get, counterpart) ?? "Direct message" : senderNick;
        set({
          conversations: {
            ...conversations,
            [counterpart]: { id: counterpart, kind: "dm", name, messages: [], users: [], unread: 0, myLevel: 0 },
          },
          order: [...order, counterpart],
        });
      }
      addMessage(get, set, counterpart, {
        id: nextId(),
        userId: d.UserId,
        nick: senderNick,
        text: d.Message ?? "",
        self,
        ts: msg.Timestamp,
      });
      break;
    }
    case MessageKey.CHBAN: {
      const d = msg.Data as ChannelBannedData;
      if (d.UserId === get().userId) {
        const where = d.ChannelName ? ` from ${d.ChannelName}` : "";
        const why = d.Reason ? `: ${d.Reason}` : ".";
        set({ error: `You have been banned${where}${why}` });
      }
      break;
    }
    case MessageKey.ERROR: {
      const code = (msg.Data as { Code: number }).Code;
      set({ error: errorText[code] ?? "Something went wrong." });
      break;
    }
    default:
      break;
  }
}
