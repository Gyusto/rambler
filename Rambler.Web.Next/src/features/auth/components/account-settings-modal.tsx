"use client";

import { useEffect, useState } from "react";
import { accountApi } from "@/features/auth/api/account.api";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Spinner } from "@/components/ui/spinner";

/**
 * Account settings for the signed-in user. Currently surfaces the change-email
 * flow (RequestEmailChange -> ValidateChangeEmail). Guests have no account, so
 * they see a prompt to sign in instead. Backend has no authenticated
 * change-password endpoint, so only email is offered.
 */
export function AccountSettingsModal({
  open,
  onClose,
}: Readonly<{ open: boolean; onClose: () => void }>) {
  const isGuest = useAuth((s) => s.session?.isGuest);

  const [step, setStep] = useState<"request" | "confirm" | "done">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // reset on open
  useEffect(() => {
    if (open) {
      setStep("request");
      setEmail("");
      setCode("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function requestChange(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await accountApi.requestEmailChange(email.trim());
      setStep("confirm");
    } catch {
      setError("Couldn't start the email change. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmChange(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await accountApi.validateChangeEmail({ Email: email.trim(), Token: code.trim() });
      setStep("done");
    } catch {
      setError("That code didn't work. Please check it and try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--glow-b)]";
  const primaryBtn =
    "inline-flex items-center justify-center gap-2 rounded-md bg-[var(--glow-b)] px-3.5 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex w-full max-w-md flex-col rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Account settings"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <h2 className="text-base font-semibold">Account settings</h2>
          <button type="button" className="icon-btn" aria-label="Close" title="Close" onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="px-4 py-4">
          {isGuest ? (
            <p className="py-4 text-center text-sm text-[var(--muted)]">
              Sign in with an account to manage settings.
            </p>
          ) : (
            <>
              <div className="mb-3 text-sm font-medium">Change email</div>

              {step === "request" && (
                <form onSubmit={requestChange} className="flex flex-col gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="New email address"
                    className={inputCls}
                    autoFocus
                  />
                  <button type="submit" className={primaryBtn} disabled={busy || !email.trim()}>
                    {busy && <Spinner className="h-4 w-4" />}
                    {busy ? "Sending…" : "Send confirmation code"}
                  </button>
                </form>
              )}

              {step === "confirm" && (
                <form onSubmit={confirmChange} className="flex flex-col gap-3">
                  <p className="text-xs text-[var(--muted)]">
                    We sent a confirmation code to <span className="text-[var(--text)]">{email}</span>.
                    Enter it below to finish.
                  </p>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Confirmation code"
                    className={inputCls}
                    autoFocus
                  />
                  <button type="submit" className={primaryBtn} disabled={busy || !code.trim()}>
                    {busy && <Spinner className="h-4 w-4" />}
                    {busy ? "Confirming…" : "Confirm new email"}
                  </button>
                </form>
              )}

              {step === "done" && (
                <div className="flex flex-col items-center gap-3 py-3 text-center">
                  <i className="fa-solid fa-circle-check text-2xl text-rambler-turquoise" />
                  <p className="text-sm">Your email has been updated.</p>
                  <button type="button" className={primaryBtn} onClick={onClose}>
                    Done
                  </button>
                </div>
              )}

              {error && (
                <p className="mt-3 text-center text-sm text-[var(--danger,#d9686c)]">{error}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
