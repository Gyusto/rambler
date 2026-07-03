import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";

/** A single message in the faux chat preview on the left panel. */
interface Bubble {
  from: "them" | "you";
  initials: string;
  avatar: string; // avatar background + text accent
  name: string;
  time: string;
  text: string;
  reaction?: string; // e.g. "👍 3"
}

const conversation: Bubble[] = [
  {
    from: "them",
    initials: "NV",
    avatar: "bg-rambler-turquoise/20 text-rambler-turquoise",
    name: "Nova",
    time: "just now",
    text: "hey, welcome to Rambler 👋",
  },
  {
    from: "them",
    initials: "AD",
    avatar: "bg-rambler-violet/25 text-rambler-violet",
    name: "Ada",
    time: "just now",
    text: "grab a name and jump in — no signup needed",
    reaction: "👍 3",
  },
  {
    from: "you",
    initials: "ME",
    avatar: "bg-rambler-pink/25 text-rambler-pink",
    name: "You",
    time: "now",
    text: "signing in now — one sec",
  },
];

/** Small avatar disc with initials, tinted per user. */
function Avatar({ initials, className }: Readonly<{ initials: string; className: string }>) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-inset ring-white/10 ${className}`}
    >
      {initials}
    </span>
  );
}

interface AuthShellProps {
  /** Heading shown above the form (e.g. "Welcome back"). */
  title: string;
  /** Supporting line shown beneath the heading. */
  subtitle: string;
  /** The auth form (LoginForm / RegisterForm). */
  children: ReactNode;
}

/**
 * Split-screen shell for the auth pages. The left panel (lg+ only) previews a
 * live Rambler conversation so the sign-in screen shows off the product; the
 * form sits in a card on the right. The whole page is exactly one viewport
 * tall and never scrolls; on small screens only the form + footer show.
 */
export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-rambler-indigo">
      {/* Split-screen area fills the viewport minus the footer */}
      <div className="relative min-h-0 w-full flex-1 lg:grid lg:grid-cols-2">
        {/* Left: live chat preview (lg+) */}
        <aside className="relative hidden overflow-hidden border-r border-white/5 bg-[#1b2140] px-12 py-9 lg:flex lg:flex-col xl:px-14">
          {/* soft accent pools */}
          <div className="pointer-events-none absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-rambler-turquoise/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-rambler-violet/10 blur-3xl" />

          {/* brand + back to home */}
          <div className="relative z-10 flex shrink-0 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ewclogo.svg" alt="Rambler" className="h-7 w-auto" />
              <span className="text-lg font-semibold text-white">Rambler</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
            >
              <i className="fa-solid fa-arrow-left text-xs" />{" "}
              Back to home
            </Link>
          </div>

          {/* headline */}
          <div className="relative z-10 mt-10 shrink-0 max-w-md">
            <h2 className="text-4xl font-bold leading-[1.1] tracking-tight text-white xl:text-[2.65rem]">
              Where conversations{" "}
              <span className="text-rambler-turquoise">happen.</span>
            </h2>
            <p className="mt-3 text-base text-white/60">
              Drop in as a guest or sign in — the room's already going.
            </p>
          </div>

          {/* faux chat window */}
          <div className="relative z-10 mt-8 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#20264a] shadow-2xl shadow-black/40">
            {/* window header */}
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <i className="fa-solid fa-hashtag text-xs text-white/40" />{" "}
                Lobby
              </div>
              <div className="flex items-center gap-1.5 text-xs text-white/50">
                <span className="h-1.5 w-1.5 rounded-full bg-rambler-turquoise" />{" "}
                42 online
              </div>
            </div>

            {/* messages */}
            <div className="flex min-h-0 flex-1 flex-col justify-end gap-4 overflow-hidden px-4 py-4">
              {conversation.map((m) =>
                m.from === "them" ? (
                  <div key={m.text} className="flex items-start gap-2.5">
                    <Avatar initials={m.initials} className={m.avatar} />
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-white">{m.name}</span>
                        <span className="text-[10px] text-white/35">{m.time}</span>
                      </div>
                      <div className="mt-1 w-fit rounded-2xl rounded-tl-sm bg-white/[0.06] px-3 py-2 text-sm leading-snug text-white/85">
                        {m.text}
                      </div>
                      {m.reaction && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-rambler-turquoise/30 bg-rambler-turquoise/10 px-2 py-0.5 text-[11px] text-white/80">
                          {m.reaction}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div key={m.text} className="flex items-start justify-end gap-2.5">
                    <div className="min-w-0">
                      <div className="flex items-baseline justify-end gap-2">
                        <span className="text-[10px] text-white/35">{m.time}</span>
                        <span className="text-xs font-semibold text-white">{m.name}</span>
                      </div>
                      <div className="mt-1 ml-auto w-fit rounded-2xl rounded-tr-sm bg-rambler-turquoise/20 px-3 py-2 text-sm leading-snug text-white ring-1 ring-inset ring-rambler-turquoise/20">
                        {m.text}
                        <i className="fa-solid fa-check ml-1.5 text-[10px] text-rambler-turquoise" />
                      </div>
                    </div>
                    <Avatar initials={m.initials} className={m.avatar} />
                  </div>
                ),
              )}

              {/* typing indicator */}
              <div className="flex items-center gap-2.5">
                <Avatar initials="AD" className="bg-rambler-violet/25 text-rambler-violet" />
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-white/[0.06] px-3 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60" />
                </div>
                <span className="text-xs text-white/40">Ada is typing…</span>
              </div>
            </div>

            {/* faux composer */}
            <div className="flex shrink-0 items-center gap-2 border-t border-white/10 px-3 py-3">
              <div className="flex-1 rounded-full bg-white/[0.05] px-4 py-2 text-sm text-white/35">
                Say something…
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rambler-turquoise text-white">
                <i className="fa-solid fa-paper-plane text-xs" />
              </span>
            </div>
          </div>
        </aside>

        {/* Right: form card - centered but allowed to shrink, scrolls internally
            only as a last resort so the page itself never scrolls */}
        <main className="flex min-h-0 items-center justify-center overflow-y-auto px-4 py-6 sm:px-6">
          <div className="w-full max-w-sm">
            {/* logo above the card - mobile only, links home */}
            <Link
              href="/"
              className="mb-5 flex items-center justify-center gap-2.5 lg:hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ewclogo.svg" alt="Rambler" className="h-8 w-auto" />
              <span className="text-xl font-semibold text-white">Rambler</span>
            </Link>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 sm:p-7">
              <h1 className="text-2xl font-semibold text-white">{title}</h1>
              <p className="mb-5 mt-1 text-sm text-white/50">{subtitle}</p>
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Shared footer, pinned at the bottom of the single viewport */}
      <SiteFooter compact />
    </div>
  );
}
