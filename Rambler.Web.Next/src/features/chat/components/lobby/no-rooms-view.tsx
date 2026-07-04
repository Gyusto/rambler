"use client";

import { useEffect, useState } from "react";
import { Loading } from "@/components/ui/spinner";
import { channelsApi } from "@/features/chat/api/channels.api";
import type { ListChannel } from "@/features/chat/api/channels.types";
import { useChatStore } from "@/features/chat/state/chat-store";

type Scope = "active" | "all";

/**
 * Empty-state shown in the center chat column when the user has no
 * conversation open. Loads browsable rooms (active first, with a toggle to
 * all non-secret rooms) and lets the user join one to get started.
 */
export function NoRoomsView() {
  const [rooms, setRooms] = useState<ListChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [scope, setScope] = useState<Scope>("active");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);

    (async () => {
      try {
        const list =
          scope === "all"
            ? await channelsApi.getChannelList()
            : await channelsApi.getOpenChannelList();
        if (!cancelled) setRooms(list ?? []);
      } catch {
        if (!cancelled) setError("Couldn't load rooms. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scope]);

  function join(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    useChatStore.getState().joinRoom(trimmed);
  }

  const emptyLabel =
    scope === "all"
      ? "No rooms found right now."
      : "No active rooms right now - try browsing all rooms.";

  return (
    <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div className="my-auto flex w-full max-w-[520px] flex-col overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] shadow-[0_18px_50px_-20px_rgba(0,0,0,.55)]">
        {/* header */}
        <div className="flex flex-col items-center gap-3 border-b border-[var(--line)] px-6 py-7 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full border border-[var(--line)] text-[20px] text-[var(--glow-b)]">
            <i className="fa-solid fa-comments" />
          </span>
          <h2 className="m-0 text-[18px] font-bold tracking-[-.01em]">
            No rooms joined
          </h2>
          <p className="m-0 max-w-[36ch] text-[13px] text-[var(--muted)]">
            You haven&apos;t joined any rooms yet. Pick one below to start
            chatting.
          </p>
        </div>

        {/* scope toggle */}
        <div className="border-b border-[var(--line)] px-4 py-3">
          <div className="flex gap-1 rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] p-1">
            {(
              [
                { key: "active", label: "Active" },
                { key: "all", label: "All rooms" },
              ] as const
            ).map((opt) => {
              const active = scope === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setScope(opt.key)}
                  className={`flex-1 rounded-[7px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-[var(--raised)] text-[var(--text)] shadow-[0_1px_2px_rgba(0,0,0,.2)]"
                      : "bg-transparent text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* room list */}
        <div className="max-h-[46vh] min-h-[160px] overflow-y-auto p-2">
          {loading && <Loading label="Loading rooms…" />}

          {!loading && error && (
            <div className="px-3 py-6 text-center text-[13px] text-[var(--glow-a)]">
              {error}
            </div>
          )}

          {!loading && !error && rooms.length === 0 && (
            <div className="px-3 py-6 text-center text-[13px] text-[var(--muted)]">
              {emptyLabel}
            </div>
          )}

          {!loading &&
            !error &&
            rooms.map((room) => (
              <div
                key={room.Id || room.Name}
                className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 transition-colors hover:bg-[var(--raised)]"
              >
                <i className="fa-solid fa-hashtag w-4 flex-none text-center text-[13px] text-[var(--glow-b)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium text-[var(--text)]">
                    {room.Name}
                  </div>
                  {room.Description && (
                    <div className="truncate text-[12px] text-[var(--muted)]">
                      {room.Description}
                    </div>
                  )}
                </div>
                <span className="flex flex-none items-center gap-1.5 text-[12px] text-[var(--faint)]">
                  <i className="fa-solid fa-users text-[11px]" />
                  {room.UserCount}
                </span>
                <button
                  type="button"
                  onClick={() => join(room.Name)}
                  className="flex-none rounded-[10px] bg-[var(--glow-b)] px-3.5 py-1.5 text-[13px] font-semibold text-white transition-[filter,opacity] hover:brightness-110"
                >
                  Join
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
