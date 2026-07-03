"use client";

import { useCallback, useEffect, useState } from "react";
import { settingsApi } from "@/features/chat/api/settings.api";
import type { IgnoreDto } from "@/features/chat/api/settings.api";
import { ApiError } from "@/lib/api/http";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Loading, Spinner } from "@/components/ui/spinner";

/**
 * Icon-button that opens a modal listing the current user's ignored users,
 * letting them lift an ignore. Loads on open; backdrop click or Escape closes.
 * The ignore list is an account feature, so it's hidden for guest sessions.
 */
export function IgnoreListButton() {
  const isGuest = useAuth((s) => s.session?.isGuest);
  const [open, setOpen] = useState(false);
  const [ignores, setIgnores] = useState<IgnoreDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const settings = await settingsApi.getUserSettings();
      setIgnores(settings?.Ignores ?? []);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? "Sign in with an account to manage ignored users."
          : "Couldn't load your ignore list. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // guests have no account, so nothing to manage
  if (isGuest) return null;

  async function remove(ignore: IgnoreDto) {
    setRemovingId(ignore.Id);
    setError(null);
    try {
      await settingsApi.removeIgnore(ignore.IgnoreId ?? ignore.UserId);
      await load();
    } catch {
      setError("Couldn't remove that ignore. Please try again.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <>
      <button
        type="button"
        className="icon-btn"
        aria-label="Ignored users"
        title="Ignored users"
        onClick={() => setOpen(true)}
      >
        <i className="fa-solid fa-user-slash" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Ignored users"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
              <h2 className="text-base font-semibold">Ignored users</h2>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close"
                title="Close"
                onClick={() => setOpen(false)}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {loading && <Loading label="Loading ignore list…" />}

              {!loading && error && (
                <p className="py-4 text-center text-sm text-[var(--danger,#d9686c)]">{error}</p>
              )}

              {!loading && !error && ignores.length === 0 && (
                <p className="py-6 text-center text-sm text-[var(--muted)]">
                  You&apos;re not ignoring anyone.
                </p>
              )}

              {!loading && ignores.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {ignores.map((ignore) => (
                    <li
                      key={ignore.Id}
                      className="flex items-center gap-3 rounded-lg border border-[var(--line)] px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {ignore.IgnoreNick || "Unknown"}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--text)] hover:bg-[var(--line)] disabled:opacity-50"
                        disabled={removingId === ignore.Id}
                        onClick={() => remove(ignore)}
                      >
                        {removingId === ignore.Id && <Spinner className="h-3 w-3" />}
                        {removingId === ignore.Id ? "Removing…" : "Remove"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
