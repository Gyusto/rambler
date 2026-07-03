"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { SocialLogins } from "@/features/auth/components/social-logins";

export function RegisterForm() {
  const router = useRouter();
  const register = useAuth((s) => s.register);

  const [nick, setNick] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verify, setVerify] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mismatch = verify.length > 0 && password !== verify;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({ Nick: nick, Email: email, Password: password, PasswordVerify: verify });
      router.push("/chat");
    } catch {
      setError("Couldn't register - that username may be taken. Try another.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <Input placeholder="Username" value={nick} onChange={(e) => setNick(e.target.value)} />
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
      />
      <Input
        type="password"
        placeholder="Confirm password"
        value={verify}
        onChange={(e) => setVerify(e.target.value)}
        autoComplete="new-password"
      />

      {mismatch && <p className="text-sm text-rambler-self">Passwords don&apos;t match.</p>}
      {error && <p className="text-sm text-rambler-self">{error}</p>}

      <Button
        type="submit"
        className="w-full"
        disabled={busy || !nick || !password || mismatch}
      >
        {busy ? (
          <>
            <Spinner /> Creating account…
          </>
        ) : (
          "Create account"
        )}
      </Button>

      <SocialLogins />

      <p className="text-center text-sm text-white/60">
        Already have an account?{" "}
        <Link href="/login" className="text-rambler-turquoise hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
