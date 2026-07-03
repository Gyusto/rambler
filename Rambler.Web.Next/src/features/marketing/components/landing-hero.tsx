"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { statusApi } from "@/features/chat/api/status.api";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";
import { THEMES } from "@/features/theme/themes";
import { ArchitectureSection } from "@/features/marketing/components/architecture-section";
import { ScreenshotGallery } from "@/features/marketing/components/screenshot-gallery";
import { ImageLightbox } from "@/features/marketing/components/image-lightbox";
import { useAuth } from "@/features/auth/hooks/use-auth";

const GITHUB_URL = "https://github.com/8labs/rambler";

const accents = {
  turquoise: "bg-rambler-turquoise/15 text-rambler-turquoise",
  violet: "bg-rambler-violet/20 text-rambler-violet",
  pink: "bg-rambler-pink/20 text-rambler-pink",
} as const;

interface Feature {
  icon: string;
  accent: keyof typeof accents;
  title: string;
  desc: string;
  swatches?: boolean;
}

const features: Feature[] = [
  {
    icon: "fa-tower-broadcast",
    accent: "turquoise",
    title: "Real-time messaging",
    desc: "Messages land the instant they're sent over WebSockets - no refresh, no polling, no lag.",
  },
  {
    icon: "fa-palette",
    accent: "violet",
    title: "Six themes",
    desc: "Twilight to Daylight - pick a vibe, it sticks to your browser.",
    swatches: true,
  },
  {
    icon: "fa-lock",
    accent: "pink",
    title: "Secret & keyed rooms",
    desc: "Unlisted rooms and password-protected channels for private crews.",
  },
  {
    icon: "fa-shield-halved",
    accent: "turquoise",
    title: "Moderation & 3-strikes",
    desc: "Owners and mods get bans, mutes and a built-in warning policy.",
  },
  {
    icon: "fa-comment-dots",
    accent: "violet",
    title: "Private messaging",
    desc: "Slide into DMs - one-to-one conversations alongside the rooms.",
  },
  {
    icon: "fa-clock-rotate-left",
    accent: "pink",
    title: "Stored history",
    desc: "Log back in and catch up on everything you missed.",
  },
];

export function LandingHero() {
  const session = useAuth((s) => s.session);
  const [online, setOnline] = useState<number | null>(null);
  const [members, setMembers] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      statusApi.activeUsers().then((n) => alive && setOnline(n)).catch(() => {});
      statusApi.totalUsers().then((n) => alive && setMembers(n)).catch(() => {});
    };
    load();
    const t = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="flex min-h-full flex-col">
      {/* Full-width nav - sticky */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-rambler-indigo/70 px-6 py-4 backdrop-blur-md sm:px-10">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ewclogo.svg" alt="Rambler" className="h-7 w-auto" />
          <span className="text-lg font-semibold text-white">Rambler</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/blog"
            className="hidden rounded-full px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex"
          >
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
          {session ? (
            <Link href="/chat" className={cn(buttonVariants({ variant: "solid", size: "sm" }))}>
              get started
            </Link>
          ) : (
            <>
              <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                Sign in
              </Link>
              <Link
                href="/register"
                className={cn(buttonVariants({ variant: "solid", size: "sm" }))}
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero - copy on the left, product shot on the right */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:py-20">
        <Reveal className="space-y-7 text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-rambler-turquoise" />
            {online != null && online > 0
              ? `${online} ${online === 1 ? "person" : "people"} online now`
              : "A fresh Next.js interface"}
            {members != null && members > 0 && (
              <span className="text-white/40">· {members.toLocaleString()} members</span>
            )}
          </span>

          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Where conversations{" "}
            <span className="text-rambler-turquoise">happen.</span>
          </h1>

          <p className="mx-auto max-w-md text-lg text-white/60 lg:mx-0">
            A fast, friendly browser chat. Spin up rooms, drop in as a guest, and ramble away -
            moderation tools included.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link
              href={session ? "/chat" : "/register"}
              className={cn(buttonVariants({ size: "default" }), "group")}
            >
              {session ? "get started" : "Start chatting"}
              <i className="fa-solid fa-arrow-right transition-transform group-hover:translate-x-0.5" />
            </Link>
            {!session && (
              <Link href="/login" className={cn(buttonVariants({ variant: "outline" }))}>
                I have an account
              </Link>
            )}
          </div>
        </Reveal>

        {/* Real app across phone + desktop - click to preview */}
        <Reveal delay={150} className="relative">
          {/* soft radial accent pooled behind the devices */}
          <div className="pointer-events-none absolute inset-4 -z-10 rounded-[40%] bg-rambler-turquoise/15 blur-3xl" />
          <ImageLightbox
            src="/app-showcase.png"
            alt="Rambler running on phone and desktop"
            className="mx-auto h-auto w-full max-w-2xl select-none transition-transform duration-300 [filter:drop-shadow(0_24px_50px_rgba(0,0,0,0.55))] group-hover:scale-[1.01] lg:max-w-none"
          />
        </Reveal>
      </section>

      {/* Screenshot gallery */}
      <ScreenshotGallery />

      {/* Features - "What's inside" */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <Reveal className="mx-auto mb-14 max-w-xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-rambler-turquoise">
            What&apos;s inside
          </span>
          <h2 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-[2.75rem]">
            Everything a community needs
          </h2>
          <p className="mt-4 text-lg text-white/55">
            Built to host real conversations - from tiny group chats to rooms of hundreds.
          </p>
        </Reveal>

        <div className="grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <div className="group relative flex h-full flex-col bg-[#211b33] p-7 transition-colors hover:bg-[#2a2340]">
                <span
                  className={cn(
                    "inline-flex h-12 w-12 items-center justify-center rounded-xl text-lg ring-1 ring-inset ring-white/10 transition-transform duration-300 group-hover:-translate-y-0.5",
                    accents[f.accent],
                  )}
                >
                  <i className={cn("fa-solid", f.icon)} />
                </span>
                <h3 className="mt-5 text-[15px] font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{f.desc}</p>
                {f.swatches && (
                  <div className="mt-4 flex gap-2">
                    {THEMES.map((t) => (
                      <span
                        key={t.id}
                        title={t.name}
                        className="h-6 w-6 rounded-full ring-1 ring-white/15 transition-transform duration-200 hover:scale-125"
                        style={{ background: t.dots[0] }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <ArchitectureSection />

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 px-6 py-8">
        <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-white/70">
          By the way, we use cookies. By registering or using this system you agree to our{" "}
          <Link href="/tos" className="text-white/90 underline underline-offset-2 hover:text-white">
            Terms of Service
          </Link>
          , and any delicious cookies we decide to stuff your browser with. 🍪
        </p>
        <p className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-center text-xs text-white/50">
          Rambler · open source chat ·
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
    </div>
  );
}
