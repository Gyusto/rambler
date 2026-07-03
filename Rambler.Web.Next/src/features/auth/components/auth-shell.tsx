import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";

interface AuthShellProps {
  /** Heading shown above the form (e.g. "Welcome back"). */
  title: string;
  /** Supporting line shown beneath the heading. */
  subtitle: string;
  /** The auth form (LoginForm / RegisterForm). */
  children: ReactNode;
}

const phoneShadow = "[filter:drop-shadow(0_22px_45px_rgba(0,0,0,0.55))]";

/**
 * Split-screen shell for the auth pages. The left panel (lg+ only) shows three
 * overlapping phone shots of Rambler in action so the sign-in screen previews
 * the product; the form sits in a card on the right. The whole page is exactly
 * one viewport tall and never scrolls; on small screens only the form + footer
 * show.
 */
export function AuthShell({ title, subtitle, children }: Readonly<AuthShellProps>) {
  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-rambler-indigo">
      {/* Split-screen area fills the viewport minus the footer */}
      <div className="relative min-h-0 w-full flex-1 lg:grid lg:grid-cols-2">
        {/* Left: overlapping product screenshots (lg+) */}
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
          <div className="relative z-10 mt-10 max-w-md shrink-0">
            <h2 className="text-4xl font-bold leading-[1.1] tracking-tight text-white xl:text-[2.65rem]">
              Where conversations{" "}
              <span className="text-rambler-turquoise">happen.</span>
            </h2>
            <p className="mt-3 text-base text-white/60">
              Drop in as a guest or sign in — the room's already going.
            </p>
          </div>

          {/* three overlapping phone shots (they bleed past the edges) */}
          <div className="relative z-10 mt-6 flex min-h-0 flex-1 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/auth/phone-3.png"
              alt=""
              aria-hidden
              className={`absolute left-[2%] top-1/2 h-[80%] w-auto -translate-y-1/2 -rotate-[9deg] select-none ${phoneShadow}`}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/auth/phone-2.png"
              alt=""
              aria-hidden
              className={`absolute right-[2%] top-1/2 h-[80%] w-auto -translate-y-1/2 rotate-[9deg] select-none ${phoneShadow}`}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/auth/phone-1.png"
              alt="Rambler chat on mobile"
              className={`relative z-10 h-[96%] w-auto select-none ${phoneShadow}`}
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
