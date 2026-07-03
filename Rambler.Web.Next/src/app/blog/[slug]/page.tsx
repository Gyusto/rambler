import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { cn } from "@/lib/utils";
import { POSTS, getPost, formatPostDate } from "@/features/marketing/blog-data";
import { tagAccent } from "@/features/marketing/components/blog-chrome";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CommentSection } from "@/features/blog/components/comment-section";

type Params = Readonly<{
  params: Promise<{ slug: string }>;
}>;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return { title: "Post not found · Rambler" };
  return { title: `${post.title} · Rambler`, description: post.excerpt };
}

export default async function BlogPostPage({ params }: Params) {
  const post = getPost((await params).slug);

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="flex min-h-full flex-col">
          <SiteHeader />

          {post ? (
            <article className="mx-auto w-full max-w-2xl px-6 py-14 sm:py-16">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
              >
                <i className="fa-solid fa-arrow-left text-xs" /> All posts
              </Link>

              {/* Article header */}
              <header className="mt-8">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset",
                    tagAccent[post.tag],
                  )}
                >
                  {post.tag}
                </span>
                <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-white sm:text-[2.5rem] sm:leading-[1.1]">
                  {post.title}
                </h1>
                <p className="mt-4 text-lg leading-relaxed text-white/55">
                  {post.excerpt}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-white/45">
                  <span className="font-medium text-white/70">{post.author}</span>
                  <span aria-hidden>·</span>
                  <span>{formatPostDate(post.date)}</span>
                  <span aria-hidden>·</span>
                  <span>{post.readMins} min read</span>
                </div>
              </header>

              {/* Body */}
              <div className="mt-10 border-t border-white/10 pt-10">
                {post.body.map((para) =>
                  para.startsWith("## ") ? (
                    <h2
                      key={para}
                      className="mt-10 text-xl font-semibold tracking-tight text-white first:mt-0"
                    >
                      {para.slice(3)}
                    </h2>
                  ) : (
                    <p
                      key={para}
                      className="mt-6 text-base leading-8 text-white/70 first:mt-0"
                    >
                      {para}
                    </p>
                  ),
                )}
              </div>

              {/* Written by / CTA */}
              <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-center gap-3">
                  <div
                    aria-hidden
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-rambler-turquoise/15 text-rambler-turquoise ring-1 ring-inset ring-rambler-turquoise/20"
                  >
                    <i className="fa-solid fa-feather-pointed" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-white/40">
                      Written by
                    </p>
                    <p className="text-sm font-semibold text-white">{post.author}</p>
                  </div>
                </div>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-sm font-medium text-rambler-turquoise hover:text-white"
                >
                  Start chatting on Rambler{" "}
                  <i className="fa-solid fa-arrow-right text-xs" />
                </Link>
              </footer>

              {/* Comments (client island; fetches at runtime) */}
              <CommentSection slug={post.slug} />

              <div className="mt-12 border-t border-white/10 pt-8">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
                >
                  <i className="fa-solid fa-arrow-left text-xs" /> Back to the blog
                </Link>
              </div>
            </article>
          ) : (
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
              <i className="fa-solid fa-ghost text-3xl text-white/30" />
              <h1 className="mt-5 text-2xl font-semibold text-white">Post not found</h1>
              <p className="mt-2 text-sm text-white/50">
                This post may have moved or never existed.
              </p>
              <Link
                href="/blog"
                className="mt-6 inline-flex items-center gap-2 text-sm text-rambler-turquoise hover:text-white"
              >
                <i className="fa-solid fa-arrow-left text-xs" /> Back to the blog
              </Link>
            </div>
          )}

          <SiteFooter />
        </div>
      </div>
    </AppShell>
  );
}
