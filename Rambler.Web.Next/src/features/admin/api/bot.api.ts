import { http } from "@/lib/api/http";

/** Mirrors Rambler.Server.WebService.Controllers.BotDto (token is never included). */
export interface BotSummary {
  Id: string;
  Name: string;
  Description: string;
  IsEnabled: boolean;
  EndPoint: string;
  HasToken: boolean;
}

/**
 * Bot management for the signed-in owner (BotController, [Authorize]).
 */
export const botApi = {
  /** The current user's bots. GET /bot/getbots */
  list: () => http.get<BotSummary[]>("/bot/getbots"),
  /** Get (or lazily mint) a bot's API token. GET /bot/gettoken?botId= */
  getToken: (botId: string) =>
    http.get<string>(`/bot/gettoken?botId=${encodeURIComponent(botId)}`),
};
