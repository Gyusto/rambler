import { http } from "@/lib/api/http";
import type { LoginInput, RegisterInput } from "@/features/auth/types";

/**
 * Auth REST calls against the .NET AccountController.
 * Endpoints use default MVC routing: /api/Account/{Action}.
 */
export const authApi = {
  register: (input: RegisterInput) =>
    http.post<void>("/Account/RegisterUser", input),

  login: (input: LoginInput) => http.post<void>("/Account/LoginUser", input),

  logout: () => http.get<void>("/Account/Logout"),

  /** Authenticated token (requires the login cookie). Returns a bare JSON string. */
  chatToken: () => http.get<string>("/Account/ChatToken"),

  /** Guest token - no account required. */
  guestToken: (nick: string) =>
    http.post<string>("/Account/GuestChatToken", { Nick: nick }),

  /** Rename the signed-in account; returns a fresh chat token. */
  changeNick: (nick: string) =>
    http.post<string>("/Account/ChangeNick", { Nick: nick }),

  /**
   * External login providers configured on the server (empty when none are set
   * up). Each provider's `Name` is passed to the redirect entry point
   * `/api/account/Login?provider={Name}&returnUrl=...` for a full-page OAuth flow.
   */
  externalProviders: () =>
    http.get<ExternalProvider[]>("/Account/ExternalProviders"),
};

export interface ExternalProvider {
  Name: string;
  DisplayName: string;
}
