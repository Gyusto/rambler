"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ForgotPasswordModal } from "@/features/auth/components/forgot-password-modal";
import { SocialLogins } from "@/features/auth/components/social-logins";

export function LoginForm() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const guest = useAuth((s) => s.guest);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [guestNick, setGuestNick] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.push("/chat");
    } catch {
      setError("Sorry, that didn't work. Check your details and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => login({ Username: username, Password: password }));
        }}
      >
        <Input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            className="text-xs text-white/60 hover:text-rambler-turquoise hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <Button type="submit" className="w-full" disabled={busy || !username || !password}>
          {busy ? (
            <>
              <Spinner /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <SocialLogins />

      <div className="flex items-center gap-3 text-xs text-white/40">
        <span className="h-px flex-1 bg-white/15" />
        or join as a guest
        <span className="h-px flex-1 bg-white/15" />
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => guest(guestNick));
        }}
      >
        <Input
          placeholder="Pick a nickname"
          value={guestNick}
          onChange={(e) => setGuestNick(e.target.value)}
        />
        <Button
          type="submit"
          variant="outline"
          className="h-11 shrink-0 rounded-lg px-5"
          disabled={busy || !guestNick}
        >
          {busy ? <Spinner /> : "Guest"}
        </Button>
      </form>

      {error && <p className="text-sm text-rambler-self">{error}</p>}

      <p className="text-center text-sm text-white/60">
        No account?{" "}
        <Link href="/register" className="text-rambler-turquoise hover:underline">
          Register
        </Link>
      </p>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </div>
  );
}
