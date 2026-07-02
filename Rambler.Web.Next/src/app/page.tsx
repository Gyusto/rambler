import { AppShell } from "@/components/layout/app-shell";
import { LandingHero } from "@/features/marketing/components/landing-hero";

export default function Home() {
  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <LandingHero />
      </div>
    </AppShell>
  );
}
