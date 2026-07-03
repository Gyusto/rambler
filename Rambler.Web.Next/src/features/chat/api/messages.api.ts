import { http } from "@/lib/api/http";
import type { ReactionDto } from "@/types/protocol";

/**
 * Message-history REST calls against the .NET ChatController.
 * Paths/verbs are copied verbatim from the legacy RamblerApiService.ts.
 */

/** reply/reaction fields the history endpoints hydrate onto each post. */
interface PostExtras {
  ReplyToId?: number | null;
  ReplyToNick?: string | null;
  ReplyToText?: string | null;
  Reactions?: ReactionDto[] | null;
}

/** Mirrors Rambler.Contracts.Responses.Response<T> - the wrapper envelope. */
export interface Response<T> {
  Id: number;
  Type: string;
  /** Unix epoch milliseconds. */
  Timestamp: number;
  Subscription: string;
  Data: T;
}

/** Mirrors Rambler.Contracts.Responses.ChannelMessageResponse (KEY = "CHMSG"). */
export interface ChannelMessageResponse extends PostExtras {
  UserId: string;
  Type: string;
  Nick: string;
  Message: string;
}

/** Mirrors Rambler.Contracts.Responses.DirectMessageResponse (KEY = "DM"). */
export interface DirectMessageResponse extends PostExtras {
  UserId: string;
  Type: string;
  Message: string;
  EchoUser?: string | null;
  Nick: string;
}

export const messagesApi = {
  /**
   * Channel/subscription message history.
   * POST /chat/subscriptionmessages -> newest-first list (client processes in reverse).
   * @param token chat token (used when not cookie-authenticated)
   * @param sub subscription/channel id
   * @param last highest message id already seen (0 for none)
   */
  getSubscriptionMessages: (token: string, sub: string, last: number) =>
    http.post<Response<ChannelMessageResponse>[]>(
      "/chat/subscriptionmessages",
      { Token: token, Id: sub, Last: last },
    ),

  /**
   * Direct-message history between the current user and another user.
   * POST /chat/dmmessages -> newest-first list.
   * @param token chat token (used when not cookie-authenticated)
   * @param userId the other user's id
   * @param last highest message id already seen (0 for none)
   */
  getDirectMessages: (token: string, userId: string, last: number) =>
    http.post<Response<DirectMessageResponse>[]>(
      "/chat/dmmessages",
      { Token: token, UserId: userId, Last: last },
    ),
};
