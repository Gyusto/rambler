import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";
import { POSTS, formatPostDate } from "@/features/marketing/blog-data";
import { BlogCard } from "@/features/marketing/components/blog-card";
import { tagAccent } from "@/features/marketing/components/blog-chrome";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = {
  title: "Blog · Rambler",
  description: "Product notes, engineering deep-dives and community updates from the Rambler team.",
};

export default function BlogIndexPage() {
  const [featured, ...rest] = POSTS;

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="flex min-h-full flex-col">
          <SiteHeader />

          <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
            <Reveal className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-rambler-turquoise">
                The Rambler blog
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Notes from the room
              </h1>
              <p className="mt-4 text-lg text-white/55">
                Product updates, engineering deep-dives, and thoughts on building a chat people
                actually want to hang out in.
              </p>
            </Reveal>

            {/* Featured / hero: the most recent post. */}
            {featured && (
              <Reveal className="mt-12">
                <Link
                  href={`/blog/${featured.slug}`}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#211b33] p-8 transition-all duration-300 hover:border-white/20 hover:bg-[#2a2340] sm:p-10 lg:flex-row lg:items-center lg:gap-12"
                >
                  <div className="lg:flex-1">
                    <div className="flex items-center gap-3">
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
                    <BlogCard post={post} />
                  </Reveal>
                ))}
              </div>
            )}
          </section>

          <SiteFooter />
        </div>
      </div>
    </AppShell>
  );
}
