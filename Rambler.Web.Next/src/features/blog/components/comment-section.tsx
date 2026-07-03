"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { commentsApi, type BlogComment } from "@/features/blog/api/comments.api";

/** How often to re-fetch the thread so it stays roughly live. */
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

/** Comment section for a blog article. Fetches at runtime (client island). */
export function CommentSection({ slug }: { slug: string }) {
  const router = useRouter();
  const session = useAuth((s) => s.session);
  const canComment = Boolean(session); // registered OR guest may comment now

  const [comments, setComments] = useState<BlogComment[]>([]);
  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const applyResponse = useCallback(
    (data: Awaited<ReturnType<typeof commentsApi.listComments>>) => {
      setComments(data.Comments);
      setCommentsDisabled(data.CommentsDisabled);
      setCanModerate(data.CanModerate);
      setHidden(data.Hidden);
    },
    [],
  );

  // Initial load + poll. Re-fetches every POLL_MS; the server is authoritative.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);

    const load = (initial: boolean) =>
      commentsApi
        .listComments(slug)
        .then((data) => {
          if (active) {
            applyResponse(data);
            if (initial) setLoadError(false);
          }
        })
        .catch(() => {
          if (active && initial) setLoadError(true);
        })
        .finally(() => {
          if (active && initial) setLoading(false);
        });

    void load(true);
    const timer = setInterval(() => void load(false), POLL_MS);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [slug, applyResponse]);

  const { roots, repliesByParent } = useMemo(() => {
    const roots: BlogComment[] = [];
    const repliesByParent = new Map<number, BlogComment[]>();
    for (const c of comments) {
      if (c.ParentId === null) {
        roots.push(c);
      } else {
        const bucket = repliesByParent.get(c.ParentId) ?? [];
        bucket.push(c);
        repliesByParent.set(c.ParentId, bucket);
      }
    }
    return { roots, repliesByParent };
  }, [comments]);

  const addComment = (comment: BlogComment) =>
    setComments((prev) => [...prev, comment]);

  const removeComment = (id: number) =>
    setComments((prev) =>
      prev.filter((c) => c.Id !== id && c.ParentId !== id),
    );

  const handleDelete = async (id: number) => {
    // Optimistically remove; if it's a root, its replies drop with it.
    const snapshot = comments;
    removeComment(id);
    try {
      await commentsApi.deleteComment(id);
    } catch {
      setComments(snapshot); // restore on failure
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
        {!loading && comments.length > 0 && (
          <span className="text-sm font-normal text-white/40">
            {comments.length}
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
          <Composer slug={slug} parentId={null} onPosted={addComment} />
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
          <ul className="space-y-6">
            {roots.map((comment) => (
              <CommentItem
                key={comment.Id}
                slug={slug}
                comment={comment}
                replies={repliesByParent.get(comment.Id) ?? []}
                canComment={canComment}
                onPosted={addComment}
                onDelete={handleDelete}
              />
            ))}
          </ul>
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
}: {
  slug: string;
  comment: BlogComment;
  replies: BlogComment[];
  canComment: boolean;
  onPosted: (comment: BlogComment) => void;
  onDelete: (id: number) => void;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <li>
      <CommentBody comment={comment} onDelete={onDelete} />

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
              <CommentBody comment={reply} onDelete={onDelete} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** Renders the avatar, nick, time, body and (if allowed) a delete control. */
function CommentBody({
  comment,
  onDelete,
}: {
  comment: BlogComment;
  onDelete: (id: number) => void;
}) {
  const [confirming, setConfirming] = useState(false);

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

          {comment.CanDelete && (
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
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  aria-label="Delete comment"
                  className="text-white/25 opacity-0 transition-opacity hover:text-rambler-self focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <i className="fa-solid fa-trash text-xs" />
                </button>
              )}
            </span>
          )}
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/70">
          {comment.Body}
        </p>
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
