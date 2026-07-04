"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loading, Spinner } from "@/components/ui/spinner";
import { accountApi } from "@/features/auth/api/account.api";

type Status = "pending" | "success" | "error";

function VerifyEmail() {
  const params = useSearchParams();
  // Backend verification links use `?code=...`; accept `token` too so either
  // spelling works. `email` comes straight off the link.
  const token = params.get("token") ?? params.get("code") ?? "";
  const emailParam = params.get("email") ?? "";

  const [status, setStatus] = useState<Status>("pending");

  // Resend-verification sub-form state.
  const [resendEmail, setResendEmail] = useState(emailParam);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !emailParam) {
      setStatus("error");
      return;
    }
    let cancelled = false;
    setStatus("pending");
    accountApi
      .verifyEmail({ Token: token, Email: emailParam })
      .then(() => !cancelled && setStatus("success"))
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [token, emailParam]);

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    setResendBusy(true);
    setResendNotice(null);
    try {
      await accountApi.requestEmailVerification(resendEmail);
      setResendNotice("If that email needs verifying, a new link is on its way.");
    } catch {
      setResendNotice("Sorry, that didn't work. Please try again.");
    } finally {
      setResendBusy(false);
    }
  }

  return (
      <GlassCard className="w-full max-w-sm p-8">
        <h1 className="mb-1 text-center text-2xl font-semibold text-white">
          Verify email
        </h1>

        {status === "pending" && (
          <>
            <p className="mb-6 text-center text-sm text-white/50">
              Confirming your email address…
            </p>
            <Loading label="Verifying…" />
          </>
        )}

        {status === "success" && (
          <div className="space-y-5">
            <p className="text-center text-sm text-rambler-turquoise">
              Email verified - you can sign in.
            </p>
            <Link href="/login" className="block">
              <Button className="w-full">Back to sign in</Button>
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-5">
            <p className="text-center text-sm text-rambler-self">
              We couldn&apos;t verify that link. It may have expired or already
              been used.
            </p>

            <form className="space-y-3" onSubmit={resend}>
              <p className="text-sm text-white/60">
                Need a new link? Enter your email to resend it.
              </p>
              <Input
                type="email"
                placeholder="Email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                autoComplete="email"
              />
              {resendNotice && (
                <p className="text-sm text-rambler-turquoise">{resendNotice}</p>
              )}
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                disabled={resendBusy || !resendEmail}
              >
                {resendBusy ? (
                  <>
                    <Spinner /> Sending…
                  </>
                ) : (
                  "Resend verification email"
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-white/60">
              <Link href="/login" className="text-rambler-turquoise hover:underline">
                Back to sign in
              </Link>
            </p>
          </div>
        )}
      </GlassCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <SiteHeader />
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4">
          <Suspense fallback={<Loading label="Loading…" />}>
            <VerifyEmail />
          </Suspense>
        </div>
        <SiteFooter />
      </div>
    </AppShell>
  );
}
