import type { RoomUser } from "@/types/protocol";

export enum ConnectionStatus {
  Disconnected = "disconnected",
  Connecting = "connecting",
  Connected = "connected",
  Waiting = "waiting",
}

export interface ChatMessage {
  id: string;
  userId: string;
  nick: string;
  text: string;
  self: boolean;
  ts: number;
  system?: boolean;
}

export interface CurrentChannel {
  id: string;
  name: string;
  description: string;
}

export type ConversationKind = "room" | "dm";

/** A room or a DM thread — the unit the UI switches between. */
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
