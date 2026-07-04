"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";
import { formatPostDate, type BlogPost } from "@/features/marketing/blog-data";
import { BlogCard } from "@/features/marketing/components/blog-card";
import { CATEGORIES, getCategory, tagAccent } from "@/features/marketing/blog-categories";
import { commentsApi, type PostState } from "@/features/blog/api/comments.api";

const ALL = "all" as const;

/**
 * Interactive blog index: category tabs, a featured hero and the card grid.
 * Fetches per-post moderation state on mount to hide removed posts from
 * readers, surface comment counts, and badge hidden posts for moderators.
 */
export function BlogBrowser({ posts }: { posts: BlogPost[] }) {
  const [active, setActive] = useState<string>(ALL);
  const [states, setStates] = useState<Map<string, PostState>>(new Map());
  const [canModerate, setCanModerate] = useState(false);

  useEffect(() => {
    let active = true;
    commentsApi
      .listPostStates()
      .then((res) => {
        if (!active) return;
        setCanModerate(res.CanModerate);
        setStates(new Map(res.Posts.map((p) => [p.Slug, p])));
      })
      .catch(() => {
        /* fall back to showing all posts with no counts */
      });
    return () => {
      active = false;
    };
  }, []);

  // The category matching the active tab (undefined while "All" is selected).
  const activeCategory = active === ALL ? undefined : getCategory(active);

  // Hide removed posts from non-moderators.
  const visiblePosts = useMemo(
    () =>
      posts.filter((p) => {
        const state = states.get(p.slug);
        return canModerate || !state?.Hidden;
      }),
    [posts, states, canModerate],
  );

  const filtered = useMemo(
    () => visiblePosts.filter((p) => active === ALL || p.tag === activeCategory?.tag),
    [visiblePosts, active, activeCategory],
  );

  // The hero is the most recent visible post (posts are newest-first).
  const [featured, ...rest] = filtered;

  const countFor = (slug: string) => states.get(slug)?.CommentCount;
  const isHidden = (slug: string) => Boolean(states.get(slug)?.Hidden);

  return (
    <>
      {/* Category filter tabs, driven by the taxonomy. */}
      <Reveal className="mt-10">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActive(ALL)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              active === ALL
                ? "border-white/20 bg-white/10 text-white"
                : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/80",
            )}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setActive(cat.slug)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                active === cat.slug
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/80",
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Blurb + link to the dedicated page for the active category. */}
        {activeCategory && (
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-sm text-white/50">{activeCategory.description}</p>
            <Link
              href={`/blog/category/${activeCategory.slug}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-rambler-turquoise transition-transform hover:translate-x-0.5"
            >
              View all <i className="fa-solid fa-arrow-right text-[10px]" />
            </Link>
          </div>
        )}
      </Reveal>

      {filtered.length === 0 ? (
        <p className="mt-12 text-sm text-white/40">No posts in this category yet.</p>
      ) : (
        <>
          {/* Featured / hero: the most recent post in the current filter. */}
          {featured && (
            <Reveal className="mt-8">
              <Link
                href={`/blog/${featured.slug}`}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#211b33] p-8 transition-all duration-300 hover:border-white/20 hover:bg-[#2a2340] sm:p-10 lg:flex-row lg:items-center lg:gap-12"
              >
                <div className="lg:flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset",
                        tagAccent[featured.tag],
                      )}
                    >
                      {featured.tag}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/35">
                      Latest
                    </span>
                    {isHidden(featured.slug) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-white/40 ring-1 ring-inset ring-white/10">
                        <i className="fa-solid fa-eye-slash text-[10px]" />
                        Hidden
                      </span>
                    )}
                  </div>

                  <h2 className="mt-5 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                    {featured.title}
                  </h2>
                  <p className="mt-4 max-w-xl text-base leading-relaxed text-white/60">
                    {featured.excerpt}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-white/40">
                    <span>{featured.author}</span>
                    <span aria-hidden>·</span>
                    <span>{formatPostDate(featured.date)}</span>
                    <span aria-hidden>·</span>
                    <span>{featured.readMins} min read</span>
                    {countFor(featured.slug) !== undefined && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1">
                          <i className="fa-regular fa-comment text-[11px]" />
                          {countFor(featured.slug)}
                        </span>
                      </>
                    )}
                  </div>

                  <span className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-rambler-turquoise transition-transform group-hover:translate-x-0.5">
                    Read the post <i className="fa-solid fa-arrow-right text-xs" />
                  </span>
                </div>
              </Link>
            </Reveal>
          )}

          {/* The rest of the posts. */}
          {rest.length > 0 && (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post, i) => (
                <Reveal key={post.slug} delay={i * 70}>
                  <BlogCard
                    post={post}
                    commentCount={countFor(post.slug)}
                    hidden={isHidden(post.slug)}
                  />
                </Reveal>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
