import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { Reveal } from "@/components/ui/reveal";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ArchitectureSection } from "@/features/marketing/components/architecture-section";
import { IssuesList } from "@/features/marketing/components/issues-list";

export const metadata: Metadata = {
  title: "Changelog · Rambler",
  description: "What's changing in Rambler — bugs and feature requests, straight from GitHub.",
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
                  What we&apos;re working on
                </h1>
                <p className="mt-4 text-lg text-white/55">
                  Bugs and feature requests, straight from GitHub. Found something? Open an issue.
                </p>
              </Reveal>

              <IssuesList />
            </section>

            <ArchitectureSection />
          </div>

          <SiteFooter />
        </div>
      </div>
    </AppShell>
  );
}
