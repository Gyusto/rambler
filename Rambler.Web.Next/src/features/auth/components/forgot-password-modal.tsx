"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { accountApi } from "@/features/auth/api/account.api";

type Step = "request" | "verify" | "done";

export function ForgotPasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset internal state whenever the modal is (re)opened.
  useEffect(() => {
    if (open) {
      setStep("request");
      setEmail("");
      setToken("");
      setNewPassword("");
      setNotice(null);
      setError(null);
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await accountApi.resetPassword(email);
      setNotice("If that email exists, a reset code is on its way.");
      setStep("verify");
    } catch {
      setError("Sorry, that didn't work. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function completeReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await accountApi.verifyResetPassword({
        Email: email,
        Token: token,
        NewPassword: newPassword,
      });
      setNotice(null);
      setStep("done");
    } catch {
      setError("That code didn't work. Check it and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Reset your password"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <GlassCard
        className="relative w-full max-w-sm p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Reset password</h2>
            <p className="mt-1 text-sm text-white/50">
              {step === "request" && "Enter your email to get a reset code."}
              {step === "verify" && "Enter the code we sent and a new password."}
              {step === "done" && "All set."}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        {step === "request" && (
          <form className="space-y-3" onSubmit={requestReset}>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
            {error && <p className="text-sm text-rambler-self">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy || !email}>
              {busy ? (
                <>
                  <Spinner /> Sending…
                </>
              ) : (
                "Send reset code"
              )}
            </Button>
          </form>
        )}

        {step === "verify" && (
          <form className="space-y-3" onSubmit={completeReset}>
            {notice && <p className="text-sm text-rambler-turquoise">{notice}</p>}
            <Input
              placeholder="Reset code"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="one-time-code"
              autoFocus
            />
            <Input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            {error && <p className="text-sm text-rambler-self">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={busy || !token || !newPassword}
            >
              {busy ? (
                <>
                  <Spinner /> Updating…
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </form>
        )}

        {step === "done" && (
          <div className="space-y-4">
            <p className="text-sm text-rambler-turquoise">
              Password updated - you can sign in now.
            </p>
            <Button type="button" className="w-full" onClick={onClose}>
              Back to sign in
            </Button>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
