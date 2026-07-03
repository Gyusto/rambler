import Link from "next/link";

const GITHUB_URL = "https://github.com/8labs/rambler";

/**
 * Shared site footer used across every public page (landing, blog, auth, tos)
 * so the chrome stays consistent. `compact` trims the cookie notice for pages
 * that must fit the viewport without scrolling (e.g. login / register).
 */
export function SiteFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className="border-t border-white/10 px-6 py-6">
      {!compact && (
        <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-white/70">
          By the way, we use cookies. By registering or using this system you agree to our{" "}
          <Link href="/tos" className="text-white/90 underline underline-offset-2 hover:text-white">
            Terms of Service
          </Link>
          , and any delicious cookies we decide to stuff your browser with. 🍪
        </p>
      )}
      <p
        className={`flex flex-wrap items-center justify-center gap-1.5 text-center text-xs text-white/50 ${
          compact ? "" : "mt-3"
        }`}
      >
        Rambler · open source chat ·{" "}
        <Link href="/blog" className="text-white/80 hover:text-white">
          Blog
        </Link>
        ·
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
