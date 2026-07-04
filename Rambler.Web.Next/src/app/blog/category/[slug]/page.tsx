import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Reveal } from "@/components/ui/reveal";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { BlogCard } from "@/features/marketing/components/blog-card";
import {
  CATEGORIES,
  getCategory,
  postsInCategory,
} from "@/features/marketing/blog-categories";

/** Prebuild a static page for every category. */
export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) {
    return { title: "Category not found · Rambler" };
  }
  return {
    title: `${category.name} · Rambler blog`,
    description: category.description,
  };
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getCategory(slug);

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="flex min-h-full flex-col">
          <SiteHeader />

          <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-16 sm:py-20">
            {!category ? (
              <Reveal className="max-w-2xl">
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Category not found
                </h1>
                <p className="mt-4 text-white/55">
                  We couldn&apos;t find that category.{" "}
                  <Link
                    href="/blog"
                    className="text-rambler-turquoise underline underline-offset-2 hover:text-white"
                  >
                    Back to the blog
                  </Link>
                  .
                </p>
              </Reveal>
            ) : (
              <>
                <Reveal className="max-w-2xl">
                  <Link
                    href="/blog"
                    className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
                  >
                    <i className="fa-solid fa-arrow-left text-[10px]" /> All posts
                  </Link>
                  <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    {category.name}
                  </h1>
                  <p className="mt-4 text-lg text-white/55">{category.description}</p>
                </Reveal>

                {(() => {
                  const posts = postsInCategory(category.slug);
                  return posts.length === 0 ? (
                    <p className="mt-12 text-sm text-white/40">No posts in this category yet.</p>
                  ) : (
                    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {posts.map((post, i) => (
                        <Reveal key={post.slug} delay={i * 70}>
                          <BlogCard post={post} />
                        </Reveal>
                      ))}
                    </div>
                  );
                })()}
              </>
            )}
          </section>

          <SiteFooter />
        </div>
      </div>
    </AppShell>
  );
}
