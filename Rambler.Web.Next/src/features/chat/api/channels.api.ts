import { ApiError, http } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  ChannelBanDto,
  ChannelDto,
  ChannelModeratorDto,
  ListChannel,
  ModerationLevel,
} from "./channels.types";

/**
 * DELETE helper. The shared `http` client only exposes get/post, but a couple of
 * ChannelController actions ([HttpDelete]) require the DELETE verb, so we mirror
 * the http.ts fetch/ApiError behaviour here for those calls.
 */
async function del(path: string): Promise<void> {
  const res = await fetch(`${env.apiBase}${path}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new ApiError(res.status, `Request failed (${res.status})`);
  }
}

/**
 * Channel REST calls against the .NET ChannelController (and ChatController.GetRooms).
 * Paths, verbs, bodies and query params mirror the legacy RamblerApiService exactly.
 * Several "get" reads are POSTs that carry their arguments as query params.
 */
export const channelsApi = {
  /** Public rooms with at least one occupant (ChatController.GetRooms). GET /chat/getrooms. */
  getOpenChannelList: (search = "") =>
    http.get<ListChannel[]>(
      `/chat/getrooms${search ? `?search=${encodeURIComponent(search)}` : ""}`,
    ),

  /** Search non-secret channels by name. GET /channel/getchannels. */
  getChannelList: (search = "") =>
    http.get<ListChannel[]>(
      `/channel/getchannels${search ? `?search=${encodeURIComponent(search)}` : ""}`,
    ),

  /** Channels owned by the current user. GET /channel/getownedchannels. */
  getMyChannelList: (search = "") =>
    http.get<ListChannel[]>(
      `/channel/getownedchannels${search ? `?search=${encodeURIComponent(search)}` : ""}`,
    ),

  /**
   * Create a new channel or update an existing one, routed by presence of Id.
   * POST /channel/registerchannel (create) or /channel/updatechannel (update).
   */
  addUpdateChannel: (channel: ChannelDto) =>
    http.post<ChannelDto>(
      `/channel/${channel.Id ? "updatechannel" : "registerchannel"}`,
      channel,
    ),

  /** Update an existing channel. POST /channel/updatechannel. */
  registerChannel: (channel: ChannelDto) =>
    http.post<ChannelDto>("/channel/updatechannel", channel),

  /**
   * Delete a channel (owner only). DELETE /channel/deletechannel?channelId=.
   * Mirrors ChannelController.DeleteChannel(Guid channelId), which is an
   * [HttpDelete] action requiring RoomOwner (150) or higher.
   */
  deleteChannel: (channelId: string) =>
    del(`/channel/deletechannel?channelId=${encodeURIComponent(channelId)}`),

  /** Moderators of a channel. POST /channel/getmoderators?channelId=. */
  getChannelModeratorList: (channelId: string) =>
    http.post<ChannelModeratorDto[]>(
      `/channel/getmoderators?channelId=${encodeURIComponent(channelId)}`,
      {},
    ),

  /** Add a moderator at a given level. POST /channel/addmoderator?channelId=&userId=&level=. */
  addChannelModerator: (
    channelId: string,
    userId: string,
    modlevel: ModerationLevel | number,
  ) =>
    http.post<ChannelModeratorDto>(
      `/channel/addmoderator?channelId=${encodeURIComponent(
        channelId,
      )}&userId=${encodeURIComponent(userId)}&level=${encodeURIComponent(modlevel)}`,
      {},
    ),

  /** Remove a moderator. POST /channel/removemoderator?channelId=&userId=. */
  removeChannelModerator: (
    channelId: string,
    moderator: ChannelModeratorDto,
  ) =>
    http.post<boolean>(
      `/channel/removemoderator?channelId=${encodeURIComponent(
        channelId,
      )}&userId=${encodeURIComponent(moderator.UserId)}`,
      {},
    ),

  /** Change a moderator's level. POST /channel/setmoderatorlevel?channelId=&userId=&level=. */
  setChannelModeratorLevel: (
    channelId: string,
    userId: string,
    modlevel: ModerationLevel | number,
  ) =>
    http.post<ChannelModeratorDto>(
      `/channel/setmoderatorlevel?channelId=${encodeURIComponent(
        channelId,
      )}&userId=${encodeURIComponent(userId)}&level=${encodeURIComponent(modlevel)}`,
      {},
    ),

  /** Add a ban. POST /channel/addban with the ban DTO as body. */
  addChannelBan: (channelban: ChannelBanDto) =>
    http.post<ChannelBanDto>("/channel/addban", channelban),

  /** Remove a ban. POST /channel/removeban?channelId=&banId=. */
  removeChannelBan: (channelban: ChannelBanDto) =>
    http.post<boolean>(
      `/channel/removeban?channelId=${encodeURIComponent(
        channelban.ChannelId,
      )}&banId=${encodeURIComponent(channelban.Id)}`,
      {},
    ),

  /** Warn a user (escalates to a ban after too many warnings). POST /channel/warnuser with the ban DTO as body. */
  addChannelWarning: (channelban: ChannelBanDto) =>
    http.post<ChannelBanDto>("/channel/warnuser", channelban),

  /** Active bans for a channel. POST /channel/getbans?channelId=. */
  getChannelBans: (channelId: string) =>
    http.post<ChannelBanDto[]>(
      `/channel/getbans?channelId=${encodeURIComponent(channelId)}`,
      {},
    ),

  /**
   * Update an existing ban's reason, expiry and level. POST /channel/updateban
   * with the ban DTO as body. Mirrors ChannelController.UpdateBan([FromBody]
   * ChannelBanDto ban); requires Moderator (10) or higher.
   */
  updateBan: (ban: ChannelBanDto) =>
    http.post<ChannelBanDto>("/channel/updateban", ban),

  /**
   * Active bans for a single user within a channel. POST
   * /channel/getuserbans?channelId=&userId=. Mirrors
   * ChannelController.GetUserBans(Guid channelId, Guid userId); requires
   * Moderator (10) or higher.
   */
  getUserBans: (channelId: string, userId: string) =>
    http.post<ChannelBanDto[]>(
      `/channel/getuserbans?channelId=${encodeURIComponent(
        channelId,
      )}&userId=${encodeURIComponent(userId)}`,
      {},
    ),

  /**
   * Resolve a user's most recent nick from their id (pulled from the
   * connection log). GET /channel/getnickfromuserid?userId=. Returns a bare
   * JSON string; requires the login cookie.
   */
  getNickFromUserId: (userId: string) =>
    http.get<string>(
      `/channel/getnickfromuserid?userId=${encodeURIComponent(userId)}`,
    ),
};
