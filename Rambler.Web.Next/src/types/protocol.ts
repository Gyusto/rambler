/**
 * Wire protocol shared with the .NET backend.
 *
 * Outbound frames are `<KEY><json>` (e.g. `JOIN{"ChannelName":"Lobby"}`).
 * Inbound frames are a JSON envelope: { Type, Subscription, Timestamp, Data }.
 * See Rambler.Contracts on the server for the source of truth.
 */

export const MessageKey = {
  AUTH: "AUTH",
  JOIN: "JOIN",
  CHUSERS: "CHUSERS",
  CHUPDATE: "CHUPDATE",
  CHUSERUPDATE: "CHUSERUP",
  CHJOIN: "CHJOIN",
  CHPART: "CHPART",
  CHMSG: "CHMSG",
  CHBAN: "CHBAN",
  CHWARN: "CHWARN",
  CHTYPING: "CHTYPING",
  DMTYPING: "DMTYPING",
  REACT: "REACT",
  ERROR: "ERROR",
  DM: "DM",
} as const;

export type MessageKeyType = (typeof MessageKey)[keyof typeof MessageKey];

/** Inbound envelope wrapping every server response. */
export interface ResponseEnvelope<T = unknown> {
  Type: MessageKeyType | string;
  /** persisted post id (for CHMSG/DM), used as the reaction/reply target. */
  Id?: number;
  /** socket id, user id, or channel id depending on the message. */
  Subscription: string;
  Timestamp: number;
  Data: T;
}

/** One emoji reaction on a post. */
export interface ReactionDto {
  Emoji: string;
  UserId: string;
  Nick: string;
}

// --- Inbound payloads (Data) ---------------------------------------------

export interface AuthData {
  SocketId: string;
  UserId: string;
  Nick: string;
  ConnectionCount: number;
}

export interface JoinData {
  ChannelId: string;
  UserId: string;
  Name: string;
  Description: string;
  MaxUsers: number;
  IsSecret: boolean;
  AllowsGuests: boolean;
  Level: number;
}

export interface ChannelMessageData {
  UserId: string;
  Type: string;
  Nick: string;
  Message: string;
  ReplyToId?: number | null;
  ReplyToNick?: string | null;
  ReplyToText?: string | null;
  Reactions?: ReactionDto[] | null;
}

/** REACT: a reaction was toggled on a post. */
export interface ReactionData {
  PostId: number;
  Emoji: string;
  UserId: string;
  Nick: string;
  Added: boolean;
}

export interface ChannelTypingData {
  UserId: string;
  Nick: string;
  IsTyping: boolean;
}

export interface DirectTypingData {
  /** the user who is typing (the sender / counterpart) */
  UserId: string;
  Nick: string;
  IsTyping: boolean;
}

export interface RoomUser {
  Id: string;
  Nick: string;
  IsGuest: boolean;
  ModLevel: number;
}

export interface ChannelUsersData {
  ChannelId: string;
  Users: RoomUser[];
}

export interface ChannelJoinedData {
  UserId: string;
  Nick: string;
  IsGuest: boolean;
  Level: number;
}

export interface ChannelPartData {
  UserId: string;
}

/** DM inbound payload. `EchoUser` is set when the server echoes your own
 *  outgoing DM back to you; in that case it holds the recipient's id. */
export interface DirectMessageData {
  UserId: string;
  Type: string;
  Message: string;
  EchoUser?: string;
  Nick: string;
  ReplyToId?: number | null;
  ReplyToNick?: string | null;
  ReplyToText?: string | null;
  Reactions?: ReactionDto[] | null;
}

/** CHUSERUP - a single user's details changed within a channel. */
export interface ChannelUserUpdateData {
  UserId: string;
  Nick: string;
  IsGuest: boolean;
  Level: number;
}

/** CHUPDATE - the channel's own metadata changed. */
export interface ChannelUpdateData {
  Name: string;
  Description: string;
  AllowsGuests: boolean;
  IsSecret: boolean;
  MaxUsers: number;
  LastModified: string;
}

/** CHBAN - the current user (or another user) was banned/muted from a channel. */
export interface ChannelBannedData {
  UserId: string;
  Reason: string;
  Level: BanLevel;
  Expires: string;
  ChannelName: string;
  ModeratorNick: string;
}

export interface ChannelWarning {
  UserId: string;
  Reason: string;
  Expires: string;
}

/** CHWARN - one or more warnings issued in a channel. */
export interface ChannelWarnedData {
  Warnings: ChannelWarning[];
}

export interface ErrorData {
  Code: number;
}

export enum BanLevel {
  Ban = 0,
  Warning = 1,
  Mute = 2,
}

export enum ModerationLevel {
  Unauthorized = -1000,
  Muted = -10,
  Normal = 0,
  Moderator = 10,
  Admin = 100,
  RoomOwner = 150,
  ServerAdmin = 1000,
  ServerAdminPlus = 1500,
}

export enum ErrorCode {
  NotInChannel = 0,
  NotAuthenticated = 1,
  NickInUse = 2,
  InvalidName = 3,
  NoSuchChannel = 4,
  None = 5,
  AlreadyInChannel = 6,
  NoGuestsAllowed = 7,
}

// --- Outbound payloads ----------------------------------------------------

export interface JoinRequest {
  ChannelId?: string;
  ChannelName?: string;
}

export interface ChannelMessageRequest {
  ChannelId: string;
  Message: string;
}

export interface ChannelUsersRequest {
  ChannelId: string;
}

export interface ChannelPartRequest {
  ChannelId: string;
}

export interface DirectMessageRequest {
  UserId: string;
  Message: string;
}

// --- REST DTOs ------------------------------------------------------------

export interface ListChannel {
  Id?: string;
  Name: string;
  Description: string;
  UserCount: number;
  MaxUsers: number;
}
