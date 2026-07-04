"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/use-auth";

const GITHUB_URL = "https://github.com/8labs/rambler";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/changelog", label: "Changelog" },
];

/** Shared top nav used across the public pages (landing, blog). */
export function SiteHeader() {
  const session = useAuth((s) => s.session);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-rambler-indigo/70 px-6 py-4 backdrop-blur-md sm:px-10">
      <Link href="/" className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ewclogo.svg" alt="Rambler" className="h-7 w-auto" />
        <span className="text-lg font-semibold text-white">Rambler</span>
      </Link>

      <div className="flex items-center gap-1 sm:gap-2">
        {navLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "hidden rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/10 hover:text-white sm:inline-flex",
              isActive(l.href) ? "text-white" : "text-white/70",
            )}
          >
            {l.label}
          </Link>
        ))}

        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on GitHub"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <i className="fa-brands fa-github text-lg" />
        </a>

        {session ? (
          <Link href="/chat" className={cn(buttonVariants({ variant: "solid", size: "sm" }))}>
            get started
          </Link>
        ) : (
          <>
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Sign in
            </Link>
            <Link href="/register" className={cn(buttonVariants({ variant: "solid", size: "sm" }))}>
              Get started
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
