import { http } from "@/lib/api/http";

/**
 * Account extras REST calls against the .NET AccountController.
 * Paths/verbs are copied verbatim from the legacy RamblerApiService.ts.
 *
 * Mirrors Rambler.Contracts.Api.PasswordReset - the overloaded DTO used for
 * email validation, password reset requests and reset confirmation. All fields
 * are optional because each endpoint only reads the subset it needs.
 */
export interface PasswordResetInput {
  Email?: string;
  Token?: string;
  NewPassword?: string;
  Captcha?: string;
}

/** Body sent to /account/refreshtoken (legacy shape). */
export interface RefreshTokenInput {
  Token: string;
}

/** Body sent to /account/RequestPasswordReset (legacy shape). */
export interface RequestPasswordResetInput {
  Email: string;
}

export const accountApi = {
  /** Confirm an email address using the emailed token. POST /account/validateemail */
  verifyEmail: (validation: PasswordResetInput) =>
    http.post<void>("/account/validateemail", validation),

  /** Exchange/refresh a chat token. POST /account/refreshtoken -> bare JSON string. */
  refreshToken: (token: string) =>
    http.post<string>("/account/refreshtoken", { Token: token }),

  /** Request a password reset email. POST /account/RequestPasswordReset */
  resetPassword: (email: string) =>
    http.post<void>("/account/RequestPasswordReset", { Email: email }),

  /** Complete a password reset using the emailed token. POST /account/ResetPassword */
  verifyResetPassword: (reset: PasswordResetInput) =>
    http.post<void>("/account/ResetPassword", reset),

  /**
   * (Re)send the email-verification link. POST /account/RequestEmailVerification
   * Backend reads only `Email` from the PasswordReset DTO and always 200s
   * (no feedback on whether the address exists).
   */
  requestEmailVerification: (email: string) =>
    http.post<void>("/account/RequestEmailVerification", { Email: email }),

  /**
   * Request an email-address change for the signed-in user (requires the login
   * cookie). POST /account/RequestEmailChange?newEmail=... - `newEmail` binds
   * from the query string, not the body.
   */
  requestEmailChange: (newEmail: string) =>
    http.post<void>(
      `/account/RequestEmailChange?newEmail=${encodeURIComponent(newEmail)}`,
    ),

  /**
   * Confirm an email-address change using the emailed token (requires the login
   * cookie). POST /account/ValidateChangeEmail - reads `Email` + `Token`.
   */
  validateChangeEmail: (change: PasswordResetInput) =>
    http.post<void>("/account/ValidateChangeEmail", change),
};
