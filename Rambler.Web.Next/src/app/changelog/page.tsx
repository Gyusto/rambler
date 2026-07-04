import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ArchitectureSection } from "@/features/marketing/components/architecture-section";
import {
  RELEASES,
  changeTypeMeta,
  formatReleaseDate,
} from "@/features/marketing/changelog-data";

export const metadata: Metadata = {
  title: "Changelog · Rambler",
  description: "Every Rambler release, newest first - what's new, improved and fixed.",
};

export default function ChangelogPage() {
  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="flex min-h-full flex-col">
          <SiteHeader />

          <div className="flex-1">
          <section className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-20">
            <Reveal className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-rambler-turquoise">
                Changelog
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                What&apos;s new in Rambler
              </h1>
              <p className="mt-4 text-lg text-white/55">
                Every release, newest first. We ship often - here&apos;s the trail.
              </p>
            </Reveal>

            <ol className="mt-14 space-y-10 border-l border-white/10">
              {RELEASES.map((release, i) => (
                <Reveal key={release.version} delay={i * 60}>
                  <li className="relative pl-8">
                    {/* timeline node */}
                    <span
                      aria-hidden
                      className="absolute -left-[7px] top-1.5 h-3.5 w-3.5 rounded-full bg-rambler-turquoise ring-4 ring-rambler-indigo"
                    />

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 font-mono text-xs font-semibold text-white ring-1 ring-inset ring-white/15">
                        v{release.version}
                      </span>
                      <span className="text-sm text-white/45">
                        {formatReleaseDate(release.date)}
                      </span>
                      {i === 0 && (
                        <span className="inline-flex items-center rounded-full bg-rambler-turquoise/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-rambler-turquoise ring-1 ring-inset ring-rambler-turquoise/25">
                          Latest
                        </span>
                      )}
                    </div>

                    {release.summary && (
                      <p className="mt-3 text-[15px] font-medium text-white/80">
                        {release.summary}
                      </p>
                    )}

                    <ul className="mt-4 space-y-2.5">
                      {release.changes.map((change) => {
                        const meta = changeTypeMeta[change.type];
                        return (
                          <li key={change.text} className="flex items-start gap-3">
                            <span
                              className={cn(
                                "mt-0.5 inline-flex w-[86px] shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset",
                                meta.accent,
                              )}
                            >
                              <i className={cn("fa-solid text-[9px]", meta.icon)} />
                              {meta.label}
                            </span>
                            <span className="text-sm leading-relaxed text-white/70">
                              {change.text}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                </Reveal>
              ))}
            </ol>
          </section>

          <ArchitectureSection />
          </div>

          <SiteFooter />
        </div>
      </div>
    </AppShell>
  );
}
