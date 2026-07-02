/**
 * Admin / server-moderation DTOs.
 * Shapes mirror the C# contracts in Rambler.Contracts/Api (PascalCase JSON).
 */

/** Mirrors Rambler.Contracts.Api.BanLevel. */
export enum BanLevel {
  Ban = 0,
  Warning = 1,
  Mute = 2,
}

/** Mirrors Rambler.Contracts.Api.ModerationLevel (used by ServerUserInfoDto channels). */
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

/** Mirrors Rambler.Contracts.Api.ServerBanDto. */
export interface ServerBanDto {
  Id: number;
  BannedUserId?: string | null;
  BannedNick: string;
  IPFilter: string;
  Reason: string;
  CreatedById: string;
  CreatedByNick: string;
  Created: string;
  Expires: string;
}

/** Mirrors Rambler.Contracts.Api.ServerUserInfoDto.UserInfo. */
export interface ServerUserInfo {
  UserId: string;
  Nick: string;
}

/** Mirrors Rambler.Contracts.Api.ServerUserInfoDto.UserChannelInfo. */
export interface ServerUserChannelInfo {
  ChannelId: string;
  Name: string;
  Level: ModerationLevel;
}

/** Mirrors Rambler.Contracts.Api.ServerUserInfoDto. */
export interface ServerUserInfoDto {
  Info: ServerUserInfo;
  ConnectionCount: number;
  IPAddresses: string[];
  Channels: ServerUserChannelInfo[];
  RelatedUsers: ServerUserInfo[];
}

/**
 * Mirrors StateCache.Socket returned by ManagementController.GetUserSockets.
 * One entry per live connection (websocket) the user currently holds.
 */
export interface ServerUserSocketDto {
  Id: string;
  UserId: string;
  IPAddress: string;
}

/** Mirrors Rambler.Contracts.Api.UserResetDto (body for ResetUserPassword). */
export interface UserResetDto {
  UserId: string;
  NewPassword: string;
  VerifyNewPassword: string;
}
