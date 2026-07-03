import { http } from "@/lib/api/http";

/** A single blog comment. Top-level when `ParentId` is null, otherwise a reply. */
export interface BlogComment {
  Id: number;
  ParentId: number | null;
  Nick: string;
  Body: string;
  CreatedOn: string; // ISO date string
}

/**
 * Blog comment REST calls against the .NET BlogController.
 * Cookie auth is automatic (credentials: "include"); posting requires login.
 */
export const commentsApi = {
  /** List a post's comments, oldest-first. */
  listComments: (slug: string) =>
    http.get<BlogComment[]>(`/Blog/${slug}/comments`),

  /** Add a comment or reply. `parentId` is null for a top-level comment. */
  addComment: (slug: string, body: string, parentId: number | null) =>
    http.post<BlogComment>(`/Blog/${slug}/comments`, {
      Body: body,
      ParentId: parentId,
    }),
};
