import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { Reveal } from "@/components/ui/reveal";
import { POSTS } from "@/features/marketing/blog-data";
import { BlogBrowser } from "@/features/marketing/components/blog-browser";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = {
  title: "Blog · Rambler",
  description: "Product notes, engineering deep-dives and community updates from the Rambler team.",
};

export default function BlogIndexPage() {
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

            {/* Interactive island: category tabs, hero + card grid, live counts. */}
            <BlogBrowser posts={POSTS} />
          </section>

          <SiteFooter />
        </div>
      </div>
    </AppShell>
  );
}
