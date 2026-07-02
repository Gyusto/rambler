import { http } from "@/lib/api/http";
import type {
  ServerBanDto,
  ServerUserInfoDto,
  ServerUserSocketDto,
  UserResetDto,
} from "./admin.types";

/**
 * Admin / server-moderation REST calls against the .NET ManagementController.
 * Endpoints use default MVC routing: /api/management/{Action}.
 * Paths, verbs and query params are copied verbatim from the legacy AdminService.ts.
 */
export const adminApi = {
  /** POST /management/toggleadmin?up=&nick= - promote/demote a user's admin flag (empty body). */
  toggleAdmin: (up: boolean, nick?: string) => {
    const params = new URLSearchParams({ up: String(up) });
    if (nick !== undefined) params.set("nick", nick);
    return http.post<void>(`/management/toggleadmin?${params.toString()}`, {});
  },

  /** GET /management/getuserinfo?nick= - fetch server-side info for a user. */
  getUserInfo: (nick: string) =>
    http.get<ServerUserInfoDto>(
      `/management/getuserinfo?${new URLSearchParams({ nick }).toString()}`,
    ),

  /** GET /management/getusersockets?userId= - list a user's live connections/sockets. */
  getUserSockets: (userId: string) =>
    http.get<ServerUserSocketDto[]>(
      `/management/getusersockets?${new URLSearchParams({ userId }).toString()}`,
    ),

  /** POST /management/resetuserpassword - admin-plus reset of a user's password (reset in body). */
  resetUserPassword: (reset: UserResetDto) =>
    http.post<void>("/management/resetuserpassword", reset),

  /** GET /management/getserverbans - list all server bans. */
  getbans: () => http.get<ServerBanDto[]>("/management/getserverbans"),

  /** POST /management/addserverbanforuser - add a server ban for a user (ban in body). */
  addServerBan: (ban: ServerBanDto) =>
    http.post<ServerBanDto>("/management/addserverbanforuser", ban),

  /** POST /management/updateserverbanforuser - update an existing server ban (ban in body). */
  updateServerBan: (ban: ServerBanDto) =>
    http.post<ServerBanDto>("/management/updateserverbanforuser", ban),

  /** POST /management/removeserverban?id= - remove a server ban by id (empty body). */
  removeServerBan: (ban: ServerBanDto) =>
    http.post<boolean>(
      `/management/removeserverban?${new URLSearchParams({ id: String(ban.Id) }).toString()}`,
      {},
    ),
};
