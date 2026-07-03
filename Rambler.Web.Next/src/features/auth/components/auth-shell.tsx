import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";

const accents = {
  turquoise: "bg-rambler-turquoise/15 text-rambler-turquoise",
  violet: "bg-rambler-violet/20 text-rambler-violet",
  pink: "bg-rambler-pink/20 text-rambler-pink",
} as const;

interface Highlight {
  icon: string;
  accent: keyof typeof accents;
  title: string;
  desc: string;
}

const highlights: Highlight[] = [
  {
    icon: "fa-tower-broadcast",
    accent: "turquoise",
    title: "Real-time messaging",
    desc: "Messages land the instant they're sent - no refresh, no lag.",
  },
  {
    icon: "fa-heart",
    accent: "pink",
    title: "Reactions & replies",
    desc: "Add reactions, thread replies and share media in the flow.",
  },
  {
    icon: "fa-palette",
    accent: "violet",
    title: "Six themes",
    desc: "Twilight to Daylight - pick a vibe, it sticks to your browser.",
  },
  {
    icon: "fa-shield-halved",
    accent: "turquoise",
    title: "Built-in moderation",
    desc: "Bans, mutes and a 3-strikes policy keep rooms healthy.",
  },
];

interface AuthShellProps {
  /** Heading shown above the form (e.g. "Welcome back"). */
  title: string;
  /** Supporting line shown beneath the heading. */
  subtitle: string;
  /** The auth form (LoginForm / RegisterForm). */
  children: ReactNode;
}

/**
 * Split-screen shell for the auth pages: a branded showcase panel on the left
 * (lg+ only) and a centered form card on the right. On small screens the left
 * panel is hidden and the logo sits above the card.
 */
export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-rambler-indigo">
      {/* Split-screen area fills the viewport minus the footer */}
      <div className="relative min-h-0 w-full flex-1 lg:grid lg:grid-cols-2">
      {/* Left: branded showcase (lg+) */}
      <aside className="relative hidden overflow-hidden border-r border-white/5 bg-[#1b2140] px-12 py-10 lg:flex lg:flex-col xl:px-16">
        {/* soft turquoise pool behind the device shot */}
        <div className="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-rambler-turquoise/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-rambler-violet/10 blur-3xl" />

        {/* brand + back to home */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ewclogo.svg" alt="Rambler" className="h-7 w-auto" />
            <span className="text-lg font-semibold text-white">Rambler</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
          >
            <i className="fa-solid fa-arrow-left text-xs" />
            Back to home
          </Link>
        </div>

        {/* headline + highlights */}
        <div className="relative z-10 my-auto max-w-md py-12">
          <h2 className="text-4xl font-bold leading-[1.1] tracking-tight text-white xl:text-[2.75rem]">
            Where conversations{" "}
            <span className="text-rambler-turquoise">happen.</span>
          </h2>
          <p className="mt-4 text-base text-white/60">
            A fast, friendly browser chat. Spin up rooms, drop in as a guest, and
            ramble away.
          </p>

          <ul className="mt-9 space-y-5">
            {highlights.map((h) => (
              <li key={h.title} className="flex items-start gap-4">
                <span
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base ring-1 ring-inset ring-white/10 ${accents[h.accent]}`}
                >
                  <i className={`fa-solid ${h.icon}`} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{h.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-white/55">
                    {h.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* device shot with a turquoise glow */}
        <div className="relative z-10">
          <div className="pointer-events-none absolute inset-x-8 top-4 -z-10 h-40 rounded-[40%] bg-rambler-turquoise/15 blur-3xl" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/app-showcase.png"
            alt="Rambler running on phone and desktop"
            className="h-auto w-full select-none [filter:drop-shadow(0_24px_50px_rgba(0,0,0,0.55))]"
          />
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
