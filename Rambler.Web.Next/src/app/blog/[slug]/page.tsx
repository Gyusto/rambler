import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { cn } from "@/lib/utils";
import { POSTS, getPost, formatPostDate } from "@/features/marketing/blog-data";
import { BlogHeader, BlogFooter, tagAccent } from "@/features/marketing/components/blog-chrome";

interface Params {
  params: Promise<{ slug: string }>;
}

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
          <BlogHeader />

          {post ? (
            <article className="mx-auto w-full max-w-2xl px-6 py-14 sm:py-16">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
              >
                <i className="fa-solid fa-arrow-left text-xs" /> All posts
              </Link>

              <div className="mt-8">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset",
                    tagAccent[post.tag],
                  )}
                >
                  {post.tag}
                </span>
                <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
                  {post.title}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-white/45">
                  <span>{post.author}</span>
                  <span aria-hidden>·</span>
                  <span>{formatPostDate(post.date)}</span>
                  <span aria-hidden>·</span>
                  <span>{post.readMins} min read</span>
                </div>
              </div>

              <div className="mt-8 border-t border-white/10 pt-8">
                {post.body.map((para, i) =>
                  para.startsWith("## ") ? (
                    <h2
                      key={i}
                      className="mt-8 text-xl font-semibold text-white first:mt-0"
                    >
                      {para.slice(3)}
                    </h2>
                  ) : (
                    <p key={i} className="mt-5 text-[15px] leading-relaxed text-white/70 first:mt-0">
                      {para}
                    </p>
                  ),
                )}
              </div>

              <div className="mt-12 border-t border-white/10 pt-8">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-sm text-rambler-turquoise hover:text-white"
                >
                  Start chatting on Rambler{" "}
                  <i className="fa-solid fa-arrow-right text-xs" />
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

          <BlogFooter />
        </div>
      </div>
    </AppShell>
  );
}
