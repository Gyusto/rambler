import { http } from "@/lib/api/http";

/**
 * Anope migration import calls against the .NET ImportController.
 * Admin-only ([Authorize]); mirrors Rambler.Contracts.Api.Anope* models.
 */

export interface AnopeNicknameRegistration {
  nick: string;
  email: string;
  register_date: string;
  last_connection_date: string;
  password: string;
}

export interface AnopeChannelRegistration {
  name: string;
  founder: string;
  successor: string;
  time_registered: string;
  last_used: string;
  last_topic: string;
  forbidden: boolean;
  forbidreason: string;
}

export interface AnopeChannelModerator {
  level: number;
  nick: string;
  channel: string;
  last_seen: string;
}

export interface AnopeImport {
  Nicknames: AnopeNicknameRegistration[];
  Channels: AnopeChannelRegistration[];
  Moderators: AnopeChannelModerator[];
}

/** How many records an import created versus skipped. */
export interface ImportResult {
  Created: number;
  Skipped: number;
}

/** Per-section results for a full import. */
export interface ImportSummary {
  Users: ImportResult;
  Channels: ImportResult;
  Moderators: ImportResult;
}

export const importApi = {
  /** Full Anope import (nicknames + channels + moderators). POST /import/anope */
  anope: (data: AnopeImport) => http.post<ImportSummary>("/import/anope", data),
  /** Register a batch of Anope nicknames. POST /import/registeranopeuser */
  registerUsers: (users: AnopeNicknameRegistration[]) =>
    http.post<ImportResult>("/import/registeranopeuser", users),
  /** Register a batch of Anope channels. POST /import/registeranopechannel */
  registerChannels: (channels: AnopeChannelRegistration[]) =>
    http.post<ImportResult>("/import/registeranopechannel", channels),
  /** Register a batch of Anope channel moderators. POST /import/registeranopechannelmoderators */
  registerModerators: (moderators: AnopeChannelModerator[]) =>
    http.post<ImportResult>("/import/registeranopechannelmoderators", moderators),
  /** Export the current users, channels and moderators. GET /import/export */
  exportData: () => http.get<AnopeImport>("/import/export"),
};
