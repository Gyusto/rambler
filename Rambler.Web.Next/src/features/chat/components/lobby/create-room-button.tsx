"use client";

import { useEffect, useState } from "react";
import { channelsApi } from "@/features/chat/api/channels.api";
import type { ChannelDto } from "@/features/chat/api/channels.types";
import { useChatStore } from "@/features/chat/state/chat-store";
import { Spinner } from "@/components/ui/spinner";

export function CreateRoomButton() {
  const joinRoom = useChatStore((s) => s.joinRoom);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowGuests, setAllowGuests] = useState(true);
  const [isSecret, setIsSecret] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // close + reset on Escape while the modal is open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pending]);

  function reset() {
    setName("");
    setDescription("");
    setAllowGuests(true);
    setIsSecret(false);
    setError(undefined);
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || pending) return;

    setPending(true);
    setError(undefined);
    try {
      await channelsApi.addUpdateChannel({
        Id: "",
        Name: trimmed,
        Description: description.trim(),
        AllowGuests: allowGuests,
        IsSecret: isSecret,
        MaxUsers: 0,
      } as ChannelDto);
      joinRoom(trimmed);
      close();
    } catch {
      setError("Couldn't create that room - the name may be taken.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--glow-b)] px-3 py-1.5 text-sm font-semibold text-white transition-[filter] hover:brightness-110"
      >
        <i className="fa-solid fa-plus text-[12px]" />
        New room
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Create a room"
        >
          {/* backdrop */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => !pending && close()}
            className="absolute inset-0 h-full w-full cursor-default border-0 bg-black/50"
          />

          <form
            onSubmit={submit}
            className="relative z-10 flex w-full max-w-[480px] flex-col overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] shadow-[0_18px_50px_-20px_rgba(0,0,0,.55)]"
          >
            <div className="flex items-center gap-2 border-b border-[var(--line)] px-5 py-4">
              <h2 className="m-0 flex-1 text-[17px] font-bold tracking-[-.01em]">
                Create a room
              </h2>
              <button
                type="button"
                title="Close"
                aria-label="Close"
                onClick={() => !pending && close()}
                className="grid h-8 w-8 place-items-center rounded-[10px] bg-transparent text-[var(--muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]"
              >
                <i className="fa-solid fa-xmark text-[16px]" />
              </button>
            </div>

            <div className="flex flex-col gap-4 px-5 py-5">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="create-room-name"
                  className="text-[12px] font-medium text-[var(--muted)]"
                >
                  Name
                </label>
                <input
                  id="create-room-name"
                  type="text"
                  value={name}
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                  placeholder="room name"
                  className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-[14px] text-[var(--text)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--faint)] focus:border-[var(--glow-b)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--glow-b)_20%,transparent)]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="create-room-description"
                  className="text-[12px] font-medium text-[var(--muted)]"
                >
                  Description
                </label>
                <input
                  id="create-room-description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="what's this room about? (optional)"
                  className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-[14px] text-[var(--text)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--faint)] focus:border-[var(--glow-b)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--glow-b)_20%,transparent)]"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={allowGuests}
                  onChange={(e) => setAllowGuests(e.target.checked)}
                  className="h-4 w-4 accent-[var(--glow-b)]"
                />
                Allow guests
              </label>

              <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={isSecret}
                  onChange={(e) => setIsSecret(e.target.checked)}
                  className="h-4 w-4 accent-[var(--glow-b)]"
                />
                Secret
                <span className="text-[12px] text-[var(--muted)]">
                  (hidden from room lists)
                </span>
              </label>

              {error && (
                <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-[13px] text-[var(--glow-a)]">
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--line)] px-5 py-4">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="rounded-[10px] bg-transparent px-3.5 py-2 text-[14px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)] disabled:cursor-default disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || pending}
                className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--glow-b)] px-3.5 py-2 text-[14px] font-semibold text-white transition-[filter,opacity] hover:brightness-110 disabled:cursor-default disabled:opacity-40"
              >
                {pending && <Spinner className="h-3.5 w-3.5" />}
                {pending ? "Creating…" : "Create room"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
