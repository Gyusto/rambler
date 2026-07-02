"use client";

import { useCallback, useEffect, useState } from "react";
import { channelsApi } from "@/features/chat/api/channels.api";
import type { ChannelBanDto } from "@/features/chat/api/channels.types";
import { Loading, Spinner } from "@/components/ui/spinner";

interface BanListModalProps {
  open: boolean;
  onClose: () => void;
  channelId: string;
}

/**
 * Lists the active bans for a channel and lets a moderator lift them.
 * Loads on open; backdrop click or Escape closes.
 */
export function BanListModal({ open, onClose, channelId }: BanListModalProps) {
  const [bans, setBans] = useState<ChannelBanDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await channelsApi.getChannelBans(channelId);
      setBans(list ?? []);
    } catch {
      setError("Couldn't load the ban list. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function remove(ban: ChannelBanDto) {
    setRemovingId(ban.Id);
    setError(null);
    try {
      await channelsApi.removeChannelBan(ban);
      await load();
    } catch {
      setError("Couldn't remove that ban. Please try again.");
    } finally {
      setRemovingId(null);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Banned members"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <h2 className="text-base font-semibold">Banned members</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            title="Close"
            onClick={onClose}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading && <Loading label="Loading bans…" />}

          {!loading && error && (
            <p className="py-4 text-center text-sm text-[var(--danger,#d9686c)]">{error}</p>
          )}

          {!loading && !error && bans.length === 0 && (
            <p className="py-6 text-center text-sm text-[var(--muted)]">No active bans.</p>
          )}

          {!loading && bans.length > 0 && (
            <ul className="flex flex-col gap-2">
              {bans.map((ban) => (
                <li
                  key={ban.Id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--line)] px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{ban.Nick || "Unknown"}</div>
                    <div className="truncate text-xs text-[var(--muted)]">
                      {ban.Reason || "No reason given"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--text)] hover:bg-[var(--line)] disabled:opacity-50"
                    disabled={removingId === ban.Id}
                    onClick={() => remove(ban)}
                  >
                    {removingId === ban.Id && <Spinner className="h-3 w-3" />}
                    {removingId === ban.Id ? "Removing…" : "Remove"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
