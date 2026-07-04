/**
 * TypeScript mirrors of the .NET channel contracts (Rambler.Contracts.Api).
 * The wire format is PascalCase (DefaultContractResolver), so field names
 * here match the C# DTO properties exactly.
 */

/** Mirror of Rambler.Contracts.Api.ModerationLevel. */
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

/** Mirror of Rambler.Contracts.Api.BanLevel. */
export enum BanLevel {
  Ban = 0,
  Warning = 1,
  Mute = 2,
}

/** Mirror of Rambler.Contracts.Api.ChannelDto. */
export interface ChannelDto {
  Id: string;
  OwnerId: string;
  OwnerNick: string;
  UserCount: number;
  Created: string;
  LastModified: string;
  LastActivity: string;
  Name: string;
  Description: string;
  AllowGuests: boolean;
  AllowMedia: boolean;
  AllowLinks: boolean;
  IsSecret: boolean;
  MaxUsers: number;
}

/** Mirror of Rambler.Contracts.Api.ChannelModeratorDto. */
export interface ChannelModeratorDto {
  Id: number;
  UserId: string;
  Nick: string;
  Level: ModerationLevel;
  Created: string;
}

/** Mirror of Rambler.Contracts.Api.ChannelBanDto. */
export interface ChannelBanDto {
  Id: number;
  ChannelId: string;
  ChannelName: string;
  CreatedBy: string;
  UserId: string;
  Nick: string;
  Level: BanLevel;
  Reason: string;
  Expires: string;
  Created: string;
}

/** Mirror of Rambler.Contracts.Responses.ListResponse.ListChannel. */
export interface ListChannel {
  Id: string;
  Name: string;
  Description: string;
  MaxUsers: number;
  IsSecret: boolean;
  AllowsGuests: boolean;
  UserCount: number;
}
