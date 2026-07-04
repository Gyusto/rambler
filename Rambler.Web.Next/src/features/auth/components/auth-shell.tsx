import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
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
 * Split-screen shell for the auth pages. It shares the site header and footer
 * with the rest of the public pages so the chrome stays consistent. Between
 * them, the left panel (lg+ only) shows three overlapping phone shots of
 * Rambler in action while the form sits in a card on the right. The whole page
 * is one viewport tall and never scrolls; on small screens only the header,
 * form and footer show.
 */
export function AuthShell({ title, subtitle, children }: Readonly<AuthShellProps>) {
  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-rambler-indigo">
      <SiteHeader />

      {/* Split-screen area fills the viewport between the header and footer */}
      <div className="relative min-h-0 w-full flex-1 lg:grid lg:grid-cols-2">
        {/* Left: overlapping product screenshots (lg+) */}
        <aside className="relative hidden overflow-hidden border-r border-white/5 bg-[#1b2140] px-12 py-10 lg:flex lg:flex-col xl:px-14">
          {/* soft accent pools */}
          <div className="pointer-events-none absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-rambler-turquoise/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-rambler-violet/10 blur-3xl" />

          {/* headline */}
          <div className="relative z-10 max-w-md shrink-0">
            <h2 className="text-4xl font-bold leading-[1.1] tracking-tight text-white xl:text-[2.65rem]">
              Where conversations{" "}
              <span className="text-rambler-turquoise">happen.</span>
            </h2>
            <p className="mt-3 text-base text-white/60">
              Drop in as a guest or sign in — the room&apos;s already going.
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
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 sm:p-7">
              <h1 className="text-2xl font-semibold text-white">{title}</h1>
              <p className="mb-5 mt-1 text-sm text-white/50">{subtitle}</p>
              {children}
            </div>
          </div>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
