import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <AppShell>
      <div className="flex h-full items-center justify-center p-4">
        <GlassCard className="w-full max-w-sm p-8">
          <h1 className="mb-1 text-center text-2xl font-semibold text-white">Welcome back</h1>
          <p className="mb-6 text-center text-sm text-white/50">Sign in to start rambling.</p>
          <LoginForm />
        </GlassCard>
      </div>
    </AppShell>
  );
}
