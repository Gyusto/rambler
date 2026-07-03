import Link from "next/link";
import type { BlogTag } from "@/features/marketing/blog-data";

const GITHUB_URL = "https://github.com/8labs/rambler";

/** Accent classes for a post's tag chip, matching the landing palette. */
export const tagAccent: Record<BlogTag, string> = {
  Product: "bg-rambler-turquoise/15 text-rambler-turquoise ring-rambler-turquoise/20",
  Engineering: "bg-rambler-violet/20 text-rambler-violet ring-rambler-violet/25",
  Community: "bg-rambler-pink/20 text-rambler-pink ring-rambler-pink/25",
};

/** Sticky top nav shared by the blog index and article pages. */
export function BlogHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-rambler-indigo/70 px-6 py-4 backdrop-blur-md sm:px-10">
      <Link href="/" className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ewclogo.svg" alt="Rambler" className="h-7 w-auto" />
        <span className="text-lg font-semibold text-white">Rambler</span>
      </Link>
      <div className="flex items-center gap-1 text-sm sm:gap-3">
        <Link
          href="/"
          className="rounded-full px-3 py-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          Home
        </Link>
        <Link href="/blog" className="rounded-full px-3 py-1.5 text-white transition-colors">
          Blog
        </Link>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on GitHub"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <i className="fa-brands fa-github text-lg" />
        </a>
      </div>
    </header>
  );
}

/** Footer shared by the blog pages, mirroring the landing footer. */
export function BlogFooter() {
  return (
    <footer className="mt-auto border-t border-white/10 px-6 py-8">
      <p className="mt-1 flex items-center justify-center gap-1.5 text-center text-xs text-white/50">
        Rambler · open source chat ·
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-white/80 hover:text-white"
        >
          <i className="fa-brands fa-github" /> GitHub
        </a>
      </p>
    </footer>
  );
}
