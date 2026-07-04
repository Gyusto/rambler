import { http } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import { useAuth } from "@/features/auth/hooks/use-auth";

/** Top-level comments fetched per page (replies of those roots come free). */
const PAGE_LIMIT = 10;

/** A single blog comment. Top-level when `ParentId` is null, otherwise a reply. */
export interface BlogComment {
  Id: number;
  ParentId: number | null;
  Nick: string;
  Body: string;
  CreatedOn: string; // ISO date string (UTC, with trailing Z)
  EditedOn: string | null; // ISO date string (UTC) when last edited, else null
  IsGuest: boolean;
  CanDelete: boolean;
  CanEdit: boolean;
}

/**
 * Response for a post's comment thread. One page of top-level comments
 * (newest-first) plus ALL replies of those roots. `NextCursor` fetches OLDER
 * roots; null means there are no more.
 */
export interface CommentsResponse {
  CommentsDisabled: boolean;
  Hidden: boolean;
  CanModerate: boolean;
  TotalCount: number;
  NextCursor: string | null;
  Comments: BlogComment[];
}

/** Moderation state for a single post. */
export interface PostState {
  Slug: string;
  CommentsDisabled: boolean;
  Hidden: boolean;
  CommentCount: number;
}

/** Response for the aggregate post-state lookup. */
export interface PostStatesResponse {
  CanModerate: boolean;
  Posts: PostState[];
}

/** Patch shape for a moderation toggle. */
export interface ModerationPatch {
  CommentsDisabled?: boolean;
  Hidden?: boolean;
}

/**
 * Cookie auth is automatic for registered users (credentials: "include").
 * Guests have no cookie, so we append `?token=<chat token>` for them.
 */
function withToken(path: string): string {
  const session = useAuth.getState().session;
  if (session?.isGuest) {
    const sep = path.includes("?") ? "&" : "?";
    return `${path}${sep}token=${encodeURIComponent(session.token)}`;
  }
  return path;
}

/**
 * Blog comment + moderation REST calls against the .NET BlogController.
 * The shared `http` client only exposes get/post; DELETE goes through `fetch`
 * directly, mirroring how http.ts builds requests (credentials: "include").
 */
export const commentsApi = {
  /**
   * List one page of a post's top-level comments (newest-first) plus all of
   * their replies, along with thread-level state. Omit `cursor` for the first
   * page; pass `NextCursor` from a previous response to fetch OLDER roots.
   */
  listComments: (slug: string, cursor?: string | null) => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    params.set("limit", String(PAGE_LIMIT));
    return http.get<CommentsResponse>(
      withToken(`/Blog/${slug}/comments?${params.toString()}`),
    );
  },

  /** Add a comment or reply. `parentId` is null for a top-level comment. */
  addComment: (slug: string, body: string, parentId: number | null) =>
    http.post<BlogComment>(withToken(`/Blog/${slug}/comments`), {
      Body: body,
      ParentId: parentId,
    }),

  /** Edit a comment's body (author only). Resolves with the updated comment. */
  editComment: async (id: number, body: string): Promise<BlogComment> => {
    const res = await fetch(`${env.apiBase}${withToken(`/Blog/comments/${id}`)}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Body: body }),
    });
    if (!res.ok) {
      throw new Error(`Edit failed (${res.status})`);
    }
    return (await res.json()) as BlogComment;
  },

  /** Delete a comment (author or moderator). Resolves on 204. */
  deleteComment: async (id: number): Promise<void> => {
    const res = await fetch(`${env.apiBase}${withToken(`/Blog/comments/${id}`)}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Delete failed (${res.status})`);
    }
  },

  /** Toggle moderation flags for a post (moderator only). */
  setModeration: (slug: string, patch: ModerationPatch) =>
    http.post<{ Slug: string; CommentsDisabled: boolean; Hidden: boolean }>(
      withToken(`/Blog/${slug}/moderation`),
      patch,
    ),

  /** Aggregate moderation state + comment counts for every post. */
  listPostStates: () =>
    http.get<PostStatesResponse>(withToken(`/Blog/posts/state`)),
};
