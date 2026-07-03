"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { commentsApi } from "@/features/blog/api/comments.api";

/**
 * Gates a blog article's body behind its moderation state. While the state is
 * loading it renders `children` (so normal posts don't flash), then hides the
 * content if the post is removed and the viewer can't moderate.
 */
export function PostGate({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    let active = true;
    commentsApi
      .listPostStates()
      .then((res) => {
        if (!active) return;
        const state = res.Posts.find((p) => p.Slug === slug);
        setRemoved(Boolean(state?.Hidden) && !res.CanModerate);
      })
      .catch(() => {
        /* on failure, leave the content visible */
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (removed) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <i className="fa-solid fa-eye-slash text-3xl text-white/30" />
        <h1 className="mt-5 text-2xl font-semibold text-white">
          This post has been removed.
        </h1>
        <p className="mt-2 text-sm text-white/50">
          It’s no longer available to read.
        </p>
        <Link
          href="/blog"
          className="mt-6 inline-flex items-center gap-2 text-sm text-rambler-turquoise hover:text-white"
        >
          <i className="fa-solid fa-arrow-left text-xs" /> Back to the blog
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
