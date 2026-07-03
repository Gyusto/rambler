import type { BlogTag } from "@/features/marketing/blog-data";

const GITHUB_URL = "https://github.com/8labs/rambler";

/** Accent classes for a post's tag chip, matching the landing palette. */
export const tagAccent: Record<BlogTag, string> = {
  Product: "bg-rambler-turquoise/15 text-rambler-turquoise ring-rambler-turquoise/20",
  Engineering: "bg-rambler-violet/20 text-rambler-violet ring-rambler-violet/25",
  Community: "bg-rambler-pink/20 text-rambler-pink ring-rambler-pink/25",
};

/** Footer shared by the blog pages, mirroring the landing footer. */
export function BlogFooter() {
  return (
    <footer className="mt-auto border-t border-white/10 px-6 py-8">
      <p className="mt-1 flex items-center justify-center gap-1.5 text-center text-xs text-white/50">
        Rambler · open source chat ·{" "}
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
