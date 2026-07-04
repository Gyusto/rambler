import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/card";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export default function TermsPage() {
  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="flex min-h-full flex-col">
          <SiteHeader />

          <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
            <GlassCard className="p-8">
              <h1 className="text-2xl font-semibold text-white">Terms of Service</h1>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-white/60">
                <p>
                  Rambler is an open-source group chat provided as-is. Be kind, follow room rules, and
                  don&apos;t abuse the service or other people using it.
                </p>
                <p>
                  Room owners and moderators may warn, mute, or ban users. Server administrators may
                  remove content or accounts that break these terms.
                </p>
                <p>
                  And yes - we use cookies to keep you signed in. By registering or using this system you
                  agree to these terms and to any delicious cookies we decide to stuff your browser with.
                  🍪
                </p>
              </div>
            </GlassCard>
          </div>

          <SiteFooter />
        </div>
      </div>
    </AppShell>
  );
}
