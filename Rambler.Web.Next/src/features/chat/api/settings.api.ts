import { http } from "@/lib/api/http";

/**
 * User settings / ignore-list REST calls against the .NET ChatController.
 * Paths/verbs are copied verbatim from the legacy RamblerApiService.ts.
 */

/** Mirrors Rambler.Contracts.Api.IgnoreDto. */
export interface IgnoreDto {
  Id: number;
  UserId: string;
  IgnoreNick: string;
  IgnoreId: string;
  /** ISO-8601 date string (C# DateTime). */
  IgnoredOn: string;
}

/** Mirrors Rambler.Contracts.Api.UserSettingsDto. */
export interface UserSettingsDto {
  Ignores: IgnoreDto[];
}

export const settingsApi = {
  /** Current user's settings (ignore list). GET /chat/getusersettings */
  getUserSettings: () =>
    http.get<UserSettingsDto>("/chat/getusersettings"),

  /** Add a user to the ignore list. POST /chat/addignore -> updated ignore list. */
  addIgnore: (uId: string) =>
    http.post<IgnoreDto[]>("/chat/addignore", { IgnoreId: uId }),

  /** Remove a user from the ignore list. POST /chat/removeignore -> updated ignore list. */
  removeIgnore: (uId: string) =>
    http.post<IgnoreDto[]>("/chat/removeignore", { IgnoreId: uId }),
};
