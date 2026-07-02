"use client";

import { useEffect, useState } from "react";
import { Loading } from "@/components/ui/spinner";
import { channelsApi } from "@/features/chat/api/channels.api";
import type { ListChannel } from "@/features/chat/api/channels.types";
import { useChatStore } from "@/features/chat/state/chat-store";

type Scope = "active" | "all" | "my";

function emptyLabel(scope: Scope): string {
  if (scope === "my") return "You don't own any rooms yet. Start one above.";
  if (scope === "all") return "No rooms found. Start one above.";
  return "No open rooms right now. Start one above.";
}

interface RoomBrowserProps {
  open: boolean;
  onClose: () => void;
}

export function RoomBrowser({ open, onClose }: RoomBrowserProps) {
  const joinRoom = useChatStore((s) => s.joinRoom);

  const [rooms, setRooms] = useState<ListChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [scope, setScope] = useState<Scope>("active");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(undefined);

    (async () => {
      try {
        const load = () => {
          if (scope === "my") return channelsApi.getMyChannelList();
          if (scope === "all") return channelsApi.getChannelList();
          return channelsApi.getOpenChannelList();
        };
        const list = await load();
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
  }, [open, scope]);

  // reset scope + join input whenever the modal opens
  useEffect(() => {
    if (open) {
      setScope("active");
      setName("");
    }
  }, [open]);

  if (!open) return null;

  function join(room: string) {
    const trimmed = room.trim();
    if (!trimmed) return;
    joinRoom(trimmed);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Browse rooms"
    >
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default border-0 bg-black/50"
      />

      <div className="relative z-10 flex max-h-[85vh] min-h-[420px] w-full max-w-[560px] flex-col overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] shadow-[0_18px_50px_-20px_rgba(0,0,0,.55)]">
        <div className="flex items-center gap-2 border-b border-[var(--line)] px-5 py-4">
          <h2 className="m-0 flex-1 text-[17px] font-bold tracking-[-.01em]">
            Browse rooms
          </h2>
          <button
            type="button"
            title="Close"
            aria-label="Close"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-[10px] bg-transparent text-[var(--muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]"
          >
            <i className="fa-solid fa-xmark text-[16px]" />
          </button>
        </div>

        {/* scope toggle */}
        <div className="border-b border-[var(--line)] px-5 py-3">
          <div className="flex gap-1 rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] p-1">
            {(
              [
                { key: "active", label: "Active" },
                { key: "all", label: "All rooms" },
                { key: "my", label: "My rooms" },
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

        {/* join by name */}
        <div className="border-b border-[var(--line)] px-5 py-4">
          <label className="mb-2 block text-[12px] font-medium text-[var(--muted)]">
            Join a room by name
          </label>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              join(name);
            }}
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="room name"
              className="min-w-0 flex-1 rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-[14px] text-[var(--text)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--faint)] focus:border-[var(--glow-b)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--glow-b)_20%,transparent)]"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-none rounded-[10px] bg-[var(--glow-b)] px-3.5 py-2 text-[14px] font-semibold text-white transition-[filter,opacity] hover:brightness-110 disabled:cursor-default disabled:opacity-40"
            >
              Join
            </button>
          </form>
        </div>

        {/* open room list */}
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading && <Loading label="Loading rooms…" />}

          {!loading && error && (
            <div className="px-3 py-6 text-center text-[13px] text-[var(--glow-a)]">
              {error}
            </div>
          )}

          {!loading && !error && rooms.length === 0 && (
            <div className="px-3 py-6 text-center text-[13px] text-[var(--muted)]">
              {emptyLabel(scope)}
            </div>
          )}

          {!loading &&
            !error &&
            rooms.map((room) => (
              <button
                type="button"
                key={room.Id || room.Name}
                onClick={() => join(room.Name)}
                className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors hover:bg-[var(--raised)]"
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
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
