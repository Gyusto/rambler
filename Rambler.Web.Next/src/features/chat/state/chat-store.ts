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
  type ReactionData,
  type ReactionDto,
  type ResponseEnvelope,
  type RoomUser,
} from "@/types/protocol";
import {
  ConnectionStatus,
  type ChatMessage,
  type Conversation,
  type Reaction,
  type ReplyRef,
  type ReplyTarget,
} from "@/features/chat/types";

/** Map a message payload's reaction list to store shape. */
export function mapReactions(d: { Reactions?: ReactionDto[] | null }): Reaction[] | undefined {
  if (!d.Reactions?.length) return undefined;
  return d.Reactions.map((r) => ({ emoji: r.Emoji, userId: r.UserId, nick: r.Nick }));
}

/** Map a message payload's reply fields to a ReplyRef. */
export function mapReply(d: {
  ReplyToId?: number | null;
  ReplyToNick?: string | null;
  ReplyToText?: string | null;
}): ReplyRef | undefined {
  if (d.ReplyToId == null) return undefined;
  return { id: d.ReplyToId, nick: d.ReplyToNick ?? "?", text: d.ReplyToText ?? "" };
}

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
  /** message the composer is replying to (undefined when not replying). */
  replyTarget?: ReplyTarget;

  connect: (token: string, nick: string, initialRoom?: string) => void;
  disconnect: () => void;
  joinRoom: (name: string) => void;
  joinById: (channelId: string) => void;
  openDm: (userId: string, nick: string) => void;
  setActive: (id: string) => void;
  closeConversation: (id: string) => void;
  sendMessage: (text: string, replyToId?: number) => void;
  /** send an uploaded image (its public URL) as an image message. */
  sendImage: (url: string) => void;
  /** toggle an emoji reaction on a post. */
  sendReaction: (postId: number, emoji: string) => void;
  /** set/clear the message the composer is replying to. */
  setReplyTarget: (target?: ReplyTarget) => void;
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
    set({
      activeId: id,
      replyTarget: undefined,
      conversations: { ...conversations, [id]: { ...conv, unread: 0 } },
    });
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

  sendMessage: (text, replyToId) => {
    const { activeId, conversations } = get();
    const conv = activeId ? conversations[activeId] : undefined;
    const trimmed = text.trim();
    if (!conv || !trimmed) return;
    if (conv.kind === "room") {
      socket?.send(MessageKey.CHMSG, { ChannelId: conv.id, Message: trimmed, ReplyToId: replyToId ?? null });
    } else {
      socket?.send(MessageKey.DM, { UserId: conv.id, Message: trimmed, ReplyToId: replyToId ?? null });
    }
  },

  sendImage: (url) => {
    const { activeId, conversations, replyTarget } = get();
    const conv = activeId ? conversations[activeId] : undefined;
    if (!conv || !url) return;
    const replyToId = replyTarget?.postId ?? null;
    if (conv.kind === "room") {
      socket?.send(MessageKey.CHMSG, { ChannelId: conv.id, Message: url, Type: "image", ReplyToId: replyToId });
    } else {
      socket?.send(MessageKey.DM, { UserId: conv.id, Message: url, Type: "image", ReplyToId: replyToId });
    }
    set({ replyTarget: undefined });
  },

  sendReaction: (postId, emoji) => {
    socket?.send(MessageKey.REACT, { PostId: postId, Emoji: emoji });
  },

  setReplyTarget: (target) => set({ replyTarget: target }),

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

/** Apply a reaction toggle to whichever conversation holds the post. Idempotent. */
function applyReaction(get: Getter, set: Setter, d: ReactionData) {
  const { conversations } = get();
  const next: Record<string, Conversation> = {};
  let changed = false;
  for (const [cid, conv] of Object.entries(conversations)) {
    const idx = conv.messages.findIndex((m) => m.postId === d.PostId);
    if (idx === -1) {
      next[cid] = conv;
      continue;
    }
    const target = conv.messages[idx];
    const existing = target.reactions ?? [];
    const already = existing.some((r) => r.emoji === d.Emoji && r.userId === d.UserId);
    let reactions: Reaction[];
    if (d.Added) {
      reactions = already ? existing : [...existing, { emoji: d.Emoji, userId: d.UserId, nick: d.Nick }];
    } else {
      reactions = existing.filter((r) => !(r.emoji === d.Emoji && r.userId === d.UserId));
    }
    const messages = [...conv.messages];
    messages[idx] = { ...target, reactions };
    next[cid] = { ...conv, messages };
    changed = true;
  }
  if (changed) set({ conversations: next });
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
        postId: msg.Id,
        userId: d.UserId,
        nick: d.Nick ?? sender?.Nick ?? "?",
        text: d.Message ?? "",
        self: d.UserId === userId,
        ts: msg.Timestamp,
        kind: d.Type,
        reactions: mapReactions(d),
        replyTo: mapReply(d),
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
    case MessageKey.REACT: {
      applyReaction(get, set, msg.Data as ReactionData);
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
        postId: msg.Id,
        userId: d.UserId,
        nick: senderNick,
        text: d.Message ?? "",
        self,
        ts: msg.Timestamp,
        kind: d.Type,
        reactions: mapReactions(d),
        replyTo: mapReply(d),
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
