import type { RoomUser } from "@/types/protocol";

export enum ConnectionStatus {
  Disconnected = "disconnected",
  Connecting = "connecting",
  Connected = "connected",
  Waiting = "waiting",
}

export interface Reaction {
  emoji: string;
  userId: string;
  nick: string;
}

export interface ReplyRef {
  id: number;
  nick: string;
  text: string;
}

/** The message the composer is currently replying to (null when not replying). */
export interface ReplyTarget {
  postId: number;
  nick: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  /** persisted server post id (reaction/reply target); absent for optimistic/system rows */
  postId?: number;
  userId: string;
  nick: string;
  text: string;
  self: boolean;
  ts: number;
  system?: boolean;
  /** message type from the server (e.g. "MSG", or "image" for uploads) */
  kind?: string;
  reactions?: Reaction[];
  replyTo?: ReplyRef;
}

export interface CurrentChannel {
  id: string;
  name: string;
  description: string;
}

export type ConversationKind = "room" | "dm";

/** A room or a DM thread - the unit the UI switches between. */
export interface Conversation {
  /** channel id for rooms, counterpart user id for DMs */
  id: string;
  kind: ConversationKind;
  name: string;
  description?: string;
  messages: ChatMessage[];
  /** roster (rooms only) */
  users: RoomUser[];
  unread: number;
  /** my moderation level in this room */
  myLevel: number;
  /** who is currently typing here: userId -> { nick, until (epoch ms) } */
  typing?: Record<string, { nick: string; until: number }>;
  /** true once stored history has been fetched; resets when the conv is reopened */
  historyLoaded?: boolean;
}
