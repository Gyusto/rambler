"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { commentsApi, type BlogComment } from "@/features/blog/api/comments.api";

/** How often to re-fetch the first page so the thread stays roughly live. */
const POLL_MS = 20_000;

/** Format an ISO timestamp as a short relative time ("just now", "3h ago"). */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Two-letter initials for a nick avatar. */
function initials(nick: string): string {
  const trimmed = nick.trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 2).toUpperCase();
}

/**
 * Upsert `incoming` into `list` by Id. Existing entries update in place
 * (keeping their position); new entries are appended. Ordering is applied
 * separately by the caller.
 */
function upsertById(list: BlogComment[], incoming: BlogComment[]): BlogComment[] {
  if (incoming.length === 0) return list;
  const byId = new Map(list.map((c) => [c.Id, c]));
  for (const c of incoming) byId.set(c.Id, c);
  return [...byId.values()];
}

/** Roots are shown newest-first; break ties by Id so order stays stable. */
function sortRootsDesc(list: BlogComment[]): BlogComment[] {
  return [...list].sort((a, b) => {
    const diff = new Date(b.CreatedOn).getTime() - new Date(a.CreatedOn).getTime();
    return diff !== 0 ? diff : b.Id - a.Id;
  });
}

/** Comment section for a blog article. Fetches at runtime (client island). */
export function CommentSection({ slug }: { slug: string }) {
  const router = useRouter();
  const session = useAuth((s) => s.session);
  const canComment = Boolean(session); // registered OR guest may comment now

  // Roots are kept newest-first; replies are a flat list grouped per parent.
  const [roots, setRoots] = useState<BlogComment[]>([]);
  const [replies, setReplies] = useState<BlogComment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Thread-level flags + count. Applied on every response (initial/poll/page).
  const applyMeta = useCallback(
    (data: Awaited<ReturnType<typeof commentsApi.listComments>>) => {
      setCommentsDisabled(data.CommentsDisabled);
      setCanModerate(data.CanModerate);
      setHidden(data.Hidden);
      setTotalCount(data.TotalCount);
    },
    [],
  );

  // Upsert a batch of comments into local state. New roots slot in by
  // CreatedOn desc; edited bodies update in place; loaded older roots that
  // aren't in the batch are preserved (upsert never removes).
  const mergeComments = useCallback((incoming: BlogComment[]) => {
    const incomingRoots = incoming.filter((c) => c.ParentId === null);
    const incomingReplies = incoming.filter((c) => c.ParentId !== null);
    if (incomingRoots.length > 0) {
      setRoots((prev) => sortRootsDesc(upsertById(prev, incomingRoots)));
    }
    if (incomingReplies.length > 0) {
      setReplies((prev) => upsertById(prev, incomingReplies));
    }
  }, []);

  // Initial load + poll. The poll re-fetches only the FIRST page and merges,
  // so already-loaded older pages are never wiped and the cursor is untouched.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    setRoots([]);
    setReplies([]);
    setNextCursor(null);

    commentsApi
      .listComments(slug)
      .then((data) => {
        if (!active) return;
        applyMeta(data);
        mergeComments(data.Comments);
        setNextCursor(data.NextCursor);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const timer = setInterval(() => {
      commentsApi
        .listComments(slug)
        .then((data) => {
          if (!active) return;
          applyMeta(data);
          mergeComments(data.Comments); // merge only — leave nextCursor alone
        })
        .catch(() => {
          /* transient poll failure — keep what we have */
        });
    }, POLL_MS);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [slug, applyMeta, mergeComments]);

  const repliesByParent = useMemo(() => {
    const map = new Map<number, BlogComment[]>();
    for (const c of replies) {
      if (c.ParentId === null) continue;
      const bucket = map.get(c.ParentId) ?? [];
      bucket.push(c);
      map.set(c.ParentId, bucket);
    }
    // Replies read oldest-first under each root.
    for (const bucket of map.values()) {
      bucket.sort((a, b) => {
        const diff =
          new Date(a.CreatedOn).getTime() - new Date(b.CreatedOn).getTime();
        return diff !== 0 ? diff : a.Id - b.Id;
      });
    }
    return map;
  }, [replies]);

  const loadMore = async () => {
    if (loadingMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await commentsApi.listComments(slug, nextCursor);
      applyMeta(data);
      mergeComments(data.Comments);
      setNextCursor(data.NextCursor);
    } catch {
      /* leave the button in place so the reader can retry */
    } finally {
      setLoadingMore(false);
    }
  };

  // A posted comment/reply and an edited comment both flow through the merge:
  // a new root sorts to the front, a reply drops under its parent, an edit
  // updates in place.
  const upsertComment = useCallback(
    (comment: BlogComment) => mergeComments([comment]),
    [mergeComments],
  );

  const handlePosted = useCallback(
    (comment: BlogComment) => {
      upsertComment(comment);
      if (comment.ParentId === null) setTotalCount((n) => n + 1);
    },
    [upsertComment],
  );

  const handleDelete = async (id: number) => {
    // Optimistically remove; if it's a root, its replies drop with it.
    const rootSnapshot = roots;
    const replySnapshot = replies;
    const wasRoot = roots.some((c) => c.Id === id);
    setRoots((prev) => prev.filter((c) => c.Id !== id));
    setReplies((prev) => prev.filter((c) => c.Id !== id && c.ParentId !== id));
    if (wasRoot) setTotalCount((n) => Math.max(0, n - 1));
    try {
      await commentsApi.deleteComment(id);
    } catch {
      setRoots(rootSnapshot); // restore on failure
      setReplies(replySnapshot);
      if (wasRoot) setTotalCount((n) => n + 1);
    }
  };

  const toggleComments = async () => {
    const next = !commentsDisabled;
    setCommentsDisabled(next); // optimistic
    try {
      await commentsApi.setModeration(slug, { CommentsDisabled: next });
    } catch {
      setCommentsDisabled(!next);
    }
  };

  const deletePost = async () => {
    try {
      await commentsApi.setModeration(slug, { Hidden: true });
      router.push("/blog");
    } catch {
      /* leave the page in place if the call fails */
    }
  };

  // Composer is visible when signed in, unless comments are closed and the
  // viewer isn't a moderator.
  const showComposer = canComment && (!commentsDisabled || canModerate);

  return (
    <section className="mt-16 border-t border-white/10 pt-10">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
        <i className="fa-regular fa-comments text-rambler-turquoise" />
        Comments
        {!loading && totalCount > 0 && (
          <span className="text-sm font-normal text-white/40">
            {totalCount}
          </span>
        )}
      </h2>

      {/* Moderator toolbar — mod-only controls, styled distinctly. */}
      {canModerate && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-rambler-self/40 bg-rambler-self/10 px-4 py-3">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rambler-self">
            <i className="fa-solid fa-shield-halved" />
            Moderator
          </span>
          <button
            type="button"
            onClick={toggleComments}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <i
              className={cn(
                "fa-solid",
                commentsDisabled ? "fa-comment-slash" : "fa-comments",
              )}
            />
            {commentsDisabled ? "Enable comments" : "Disable comments"}
          </button>
          <button
            type="button"
            onClick={deletePost}
            className="inline-flex items-center gap-2 rounded-full border border-rambler-self/50 px-3 py-1.5 text-xs font-medium text-rambler-self transition-colors hover:bg-rambler-self/20"
          >
            <i className="fa-solid fa-trash" />
            Delete post
          </button>
          {hidden && (
            <span className="text-xs text-white/45">
              This post is hidden from readers.
            </span>
          )}
        </div>
      )}

      {/* Top-level composer, a closed notice, or a sign-in prompt. */}
      {showComposer ? (
        <div className="mt-6">
          <Composer slug={slug} parentId={null} onPosted={handlePosted} />
        </div>
      ) : !canComment ? (
        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
          <i className="fa-regular fa-comment text-white/30" />
          <span>
            <Link
              href="/login"
              className="text-rambler-turquoise hover:text-white"
            >
              Sign in or join as a guest
            </Link>{" "}
            to comment.
          </span>
        </div>
      ) : (
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/50">
          <i className="fa-solid fa-comment-slash text-white/30" />
          Comments are closed for this post.
        </div>
      )}

      {/* Thread. */}
      <div className="mt-8">
        {loading ? (
          <p className="text-sm text-white/40">
            <i className="fa-solid fa-circle-notch mr-2 animate-spin" />
            Loading comments…
          </p>
        ) : loadError ? (
          <p className="text-sm text-white/40">
            Couldn’t load comments. Please try again later.
          </p>
        ) : roots.length === 0 ? (
          <p className="text-sm text-white/40">
            No comments yet — start the conversation.
          </p>
        ) : (
          <>
            <ul className="space-y-6">
              {roots.map((comment) => (
                <CommentItem
                  key={comment.Id}
                  slug={slug}
                  comment={comment}
                  replies={repliesByParent.get(comment.Id) ?? []}
                  canComment={canComment}
                  onPosted={handlePosted}
                  onDelete={handleDelete}
                  onEdited={upsertComment}
                />
              ))}
            </ul>

            {nextCursor && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <i className="fa-solid fa-circle-notch animate-spin" />
                      Loading…
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-arrow-down" />
                      Load older comments
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/** A top-level comment with its (one level deep) replies and a reply composer. */
function CommentItem({
  slug,
  comment,
  replies,
  canComment,
  onPosted,
  onDelete,
  onEdited,
}: {
  slug: string;
  comment: BlogComment;
  replies: BlogComment[];
  canComment: boolean;
  onPosted: (comment: BlogComment) => void;
  onDelete: (id: number) => void;
  onEdited: (comment: BlogComment) => void;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <li>
      <CommentBody comment={comment} onDelete={onDelete} onEdited={onEdited} />

      <div className="mt-2 pl-[3.25rem]">
        {canComment && (
          <button
            type="button"
            onClick={() => setReplying((v) => !v)}
            className="text-xs font-medium text-white/45 transition-colors hover:text-white"
          >
            <i className="fa-solid fa-reply mr-1.5 text-[10px]" />
            {replying ? "Cancel" : "Reply"}
          </button>
        )}

        {replying && canComment && (
          <div className="mt-3">
            <Composer
              slug={slug}
              parentId={comment.Id}
              placeholder={`Reply to ${comment.Nick}…`}
              onPosted={(c) => {
                onPosted(c);
                setReplying(false);
              }}
            />
          </div>
        )}
      </div>

      {replies.length > 0 && (
        <ul className="mt-4 space-y-4 border-l border-white/10 pl-4 sm:pl-6">
          {replies.map((reply) => (
            <li key={reply.Id}>
              <CommentBody
                comment={reply}
                onDelete={onDelete}
                onEdited={onEdited}
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Renders the avatar, nick, time and body, plus (if allowed) edit and delete
 * controls. Editing swaps the body for an inline textarea.
 */
function CommentBody({
  comment,
  onDelete,
  onEdited,
}: {
  comment: BlogComment;
  onDelete: (id: number) => void;
  onEdited: (comment: BlogComment) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.Body);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const startEdit = () => {
    setEditBody(comment.Body);
    setEditError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditError(null);
  };

  const saveEdit = async () => {
    const trimmed = editBody.trim();
    if (saving || trimmed.length === 0) return;
    setSaving(true);
    setEditError(null);
    try {
      const updated = await commentsApi.editComment(comment.Id, trimmed);
      onEdited(updated);
      setEditing(false);
    } catch {
      setEditError("Couldn’t save your edit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="group flex gap-3">
      <div
        aria-hidden
        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rambler-violet/20 text-xs font-semibold text-rambler-violet ring-1 ring-inset ring-rambler-violet/25"
      >
        {initials(comment.Nick)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">
            {comment.Nick}
          </span>
          {comment.IsGuest && (
            <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/45">
              guest
            </span>
          )}
          <span className="text-xs text-white/35">
            {relativeTime(comment.CreatedOn)}
          </span>
          {comment.EditedOn && (
            <span
              className="text-xs text-white/30"
              title={`Edited ${new Date(comment.EditedOn).toLocaleString()}`}
            >
              · edited
            </span>
          )}

          {(comment.CanEdit || comment.CanDelete) && !editing && (
            <span className="ml-auto flex items-center gap-2">
              {confirming ? (
                <>
                  <button
                    type="button"
                    onClick={() => onDelete(comment.Id)}
                    className="text-xs font-medium text-rambler-self hover:underline"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="text-xs text-white/40 hover:text-white/70"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {comment.CanEdit && (
                    <button
                      type="button"
                      onClick={startEdit}
                      aria-label="Edit comment"
                      className="text-white/25 opacity-0 transition-opacity hover:text-rambler-turquoise focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <i className="fa-solid fa-pencil text-xs" />
                    </button>
                  )}
                  {comment.CanDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirming(true)}
                      aria-label="Delete comment"
                      className="text-white/25 opacity-0 transition-opacity hover:text-rambler-self focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <i className="fa-solid fa-trash text-xs" />
                    </button>
                  )}
                </>
              )}
            </span>
          )}
        </div>

        {editing ? (
          <div className="mt-2">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={3}
              className={cn(
                "w-full resize-y rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30",
                "focus:border-rambler-turquoise/40 focus:outline-none focus:ring-1 focus:ring-rambler-turquoise/40",
              )}
            />
            <div className="mt-2 flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                onClick={saveEdit}
                disabled={saving || editBody.trim().length === 0}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
              <button
                type="button"
                onClick={cancelEdit}
                className="text-xs text-white/40 transition-colors hover:text-white/70"
              >
                Cancel
              </button>
              {editError && (
                <span className="text-xs text-rambler-self">{editError}</span>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/70">
            {comment.Body}
          </p>
        )}
      </div>
    </div>
  );
}

/** A textarea + Post button that submits a comment or reply. */
function Composer({
  slug,
  parentId,
  placeholder = "Share your thoughts…",
  onPosted,
}: {
  slug: string;
  parentId: number | null;
  placeholder?: string;
  onPosted: (comment: BlogComment) => void;
}) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = body.trim();
  const disabled = sending || trimmed.length === 0;

  const submit = async () => {
    if (disabled) return;
    setSending(true);
    setError(null);
    try {
      const created = await commentsApi.addComment(slug, trimmed, parentId);
      onPosted(created);
      setBody("");
    } catch {
      setError("Couldn’t post your comment. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={parentId === null ? 3 : 2}
        className={cn(
          "w-full resize-y rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30",
          "focus:border-rambler-turquoise/40 focus:outline-none focus:ring-1 focus:ring-rambler-turquoise/40",
        )}
      />
      <div className="mt-2 flex items-center gap-3">
        <Button type="button" size="sm" onClick={submit} disabled={disabled}>
          {sending
            ? "Posting…"
            : parentId === null
              ? "Post comment"
              : "Post reply"}
        </Button>
        {error && <span className="text-xs text-rambler-self">{error}</span>}
      </div>
    </div>
  );
}
