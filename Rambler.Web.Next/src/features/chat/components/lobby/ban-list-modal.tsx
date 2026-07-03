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
                <BanRow
                  key={ban.Id}
                  ban={ban}
                  channelId={channelId}
                  removing={removingId === ban.Id}
                  onRemove={() => remove(ban)}
                  onReload={load}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(value?: string): string {
  if (!value) return "";
  const t = Date.parse(value);
  return Number.isNaN(t) ? value : new Date(t).toLocaleDateString();
}

/** One ban: view, edit its reason (updateBan), see the user's history (getUserBans), or lift it. */
function BanRow({
  ban,
  channelId,
  removing,
  onRemove,
  onReload,
}: {
  ban: ChannelBanDto;
  channelId: string;
  removing: boolean;
  onRemove: () => void;
  onReload: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState(ban.Reason ?? "");
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ChannelBanDto[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  async function save() {
    setSaving(true);
    setRowError(null);
    try {
      await channelsApi.updateBan({ ...ban, Reason: reason });
      setEditing(false);
      await onReload();
    } catch {
      setRowError("Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleHistory() {
    const next = !showHistory;
    setShowHistory(next);
    if (next && history === null) {
      setHistoryLoading(true);
      try {
        setHistory((await channelsApi.getUserBans(channelId, ban.UserId)) ?? []);
      } catch {
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    }
  }

  return (
    <li className="rounded-lg border border-[var(--line)] px-3 py-2">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{ban.Nick || "Unknown"}</div>
          {editing ? (
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason"
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
          ) : (
            <div className="truncate text-xs text-[var(--muted)]">
              {ban.Reason || "No reason given"}
            </div>
          )}
          {rowError && <div className="mt-1 text-xs text-[var(--danger,#d9686c)]">{rowError}</div>}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {editing ? (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md bg-[var(--glow-b)] px-2.5 py-1 text-xs font-medium text-white hover:brightness-110 disabled:opacity-50"
                disabled={saving}
                onClick={save}
              >
                {saving && <Spinner className="h-3 w-3" />}
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--muted)] hover:bg-[var(--line)]"
                onClick={() => {
                  setEditing(false);
                  setReason(ban.Reason ?? "");
                  setRowError(null);
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--line)] hover:text-[var(--text)]"
                title="History"
                aria-label={`Ban history for ${ban.Nick}`}
                onClick={toggleHistory}
              >
                <i className="fa-solid fa-clock-rotate-left text-[12px]" />
              </button>
              <button
                type="button"
                className="grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--line)] hover:text-[var(--text)]"
                title="Edit reason"
                aria-label={`Edit ban reason for ${ban.Nick}`}
                onClick={() => setEditing(true)}
              >
                <i className="fa-solid fa-pen text-[12px]" />
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--text)] hover:bg-[var(--line)] disabled:opacity-50"
                disabled={removing}
                onClick={onRemove}
              >
                {removing && <Spinner className="h-3 w-3" />}
                {removing ? "Removing…" : "Remove"}
              </button>
            </>
          )}
        </div>
      </div>

      {showHistory && (
        <div className="mt-2 border-t border-[var(--line)] pt-2">
          {historyLoading && <Loading label="Loading history…" compact />}
          {!historyLoading && history && history.length === 0 && (
            <p className="py-1 text-xs text-[var(--muted)]">No prior bans for this user.</p>
          )}
          {!historyLoading && history && history.length > 0 && (
            <ul className="flex flex-col gap-1">
              {history.map((h) => (
                <li key={h.Id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-[var(--muted)]">{h.Reason || "No reason given"}</span>
                  {formatDate(h.Created) && (
                    <span className="shrink-0 text-[var(--faint,var(--muted))]">{formatDate(h.Created)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
