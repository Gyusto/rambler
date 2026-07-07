"use client";

import { useCallback, useEffect, useState } from "react";
import { Loading, Spinner } from "@/components/ui/spinner";
import { channelsApi } from "@/features/chat/api/channels.api";
import type {
  ChannelDto,
  ChannelModeratorDto,
} from "@/features/chat/api/channels.types";
import { useChatStore } from "@/features/chat/state/chat-store";
import type { Conversation } from "@/features/chat/types";
import { BanListModal } from "./ban-list-modal";

const LABEL_CLASS =
  "font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--faint)]";

function levelLabel(level: number): string {
  if (level >= 150) return "Owner";
  if (level >= 10) return "Moderator";
  if (level >= 5) return "Operator";
  if (level >= 4) return "Half-op";
  if (level >= 3) return "Voice";
  return "Member";
}

export function RoomSettingsModal({
  open,
  onClose,
  conv,
}: {
  open: boolean;
  onClose: () => void;
  conv: Conversation;
}) {
  const canEdit = conv.myLevel >= 150; // RoomOwner
  const canModerate = conv.myLevel >= 10; // Moderator
  const [name, setName] = useState(conv.name);
  const [description, setDescription] = useState(conv.description ?? "");
  const [allowGuests, setAllowGuests] = useState(true);
  const [allowMedia, setAllowMedia] = useState(conv.allowMedia);
  const [allowLinks, setAllowLinks] = useState(conv.allowLinks);
  const [isSecret, setIsSecret] = useState(false);
  const [maxUsers, setMaxUsers] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [banListOpen, setBanListOpen] = useState(false);

  const [moderators, setModerators] = useState<ChannelModeratorDto[]>([]);
  const [modsLoading, setModsLoading] = useState(false);
  const [modsError, setModsError] = useState<string | null>(null);
  const [removingModId, setRemovingModId] = useState<number | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadModerators = useCallback(async () => {
    setModsLoading(true);
    setModsError(null);
    try {
      const list = await channelsApi.getChannelModeratorList(conv.id);
      setModerators(list ?? []);
    } catch {
      setModsError("Couldn't load moderators.");
    } finally {
      setModsLoading(false);
    }
  }, [conv.id]);

  useEffect(() => {
    if (open) {
      setName(conv.name);
      setDescription(conv.description ?? "");
      setAllowMedia(conv.allowMedia);
      setAllowLinks(conv.allowLinks);
      setSaved(false);
      setError(null);
      setConfirmDelete(false);
    }
  }, [open, conv.name, conv.description, conv.allowMedia, conv.allowLinks]);

  useEffect(() => {
    if (open) void loadModerators();
  }, [open, loadModerators]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await channelsApi.addUpdateChannel({
        Id: conv.id,
        Name: name,
        Description: description,
        AllowGuests: allowGuests,
        AllowMedia: allowMedia,
        AllowLinks: allowLinks,
        IsSecret: isSecret,
        MaxUsers: maxUsers,
      } as ChannelDto);
      setSaved(true);
    } catch {
      setError("Couldn't save. You may not have permission.");
    } finally {
      setSaving(false);
    }
  }

  async function removeModerator(moderator: ChannelModeratorDto) {
    setRemovingModId(moderator.Id);
    setModsError(null);
    try {
      await channelsApi.removeChannelModerator(conv.id, moderator);
      await loadModerators();
    } catch {
      setModsError("Couldn't remove moderator.");
    } finally {
      setRemovingModId(null);
    }
  }

  async function deleteRoom() {
    setDeleting(true);
    setError(null);
    try {
      await channelsApi.deleteChannel(conv.id);
      useChatStore.getState().closeConversation(conv.id);
      onClose();
    } catch {
      setError("Couldn't delete the room. You may not have permission.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 text-[var(--text)] shadow-[var(--shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Room settings</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-[var(--faint)]">Name</span>
            <input
              value={name}
              disabled={!canEdit}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] disabled:opacity-70"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-[var(--faint)]">Description</span>
            <textarea
              value={description}
              disabled={!canEdit}
              rows={2}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] disabled:opacity-70"
            />
          </label>

          <label className="block">
            <span className={`mb-1 block ${LABEL_CLASS}`}>Max users</span>
            <input
              type="number"
              min={0}
              value={maxUsers}
              disabled={!canEdit}
              onChange={(e) => setMaxUsers(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] disabled:opacity-70"
            />
            <span className="mt-1 block text-xs text-[var(--muted)]">0 means no limit.</span>
          </label>

          {canEdit && (
            <div className="flex gap-5 text-sm text-[var(--text-2)]">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={allowGuests} onChange={(e) => setAllowGuests(e.target.checked)} />
                Allow guests
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={isSecret} onChange={(e) => setIsSecret(e.target.checked)} />
                Secret
              </label>
            </div>
          )}

          {canEdit && (
            <div className="flex gap-5 text-sm text-[var(--text-2)]">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={allowMedia} onChange={(e) => setAllowMedia(e.target.checked)} />
                Allow media sharing
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={allowLinks} onChange={(e) => setAllowLinks(e.target.checked)} />
                Allow link sharing
              </label>
            </div>
          )}

          {/* moderators */}
          <div className="border-t border-[var(--line)] pt-4">
            <span className={`mb-2 block ${LABEL_CLASS}`}>Moderators</span>
            {modsLoading && <Loading label="Loading moderators…" compact />}
            {!modsLoading && modsError && (
              <p className="text-xs text-[color:var(--glow-a)]">{modsError}</p>
            )}
            {!modsLoading && !modsError && moderators.length === 0 && (
              <p className="text-xs text-[var(--muted)]">No moderators.</p>
            )}
            {!modsLoading && !modsError && moderators.length > 0 && (
              <ul className="flex flex-col gap-1">
                {moderators.map((m) => (
                  <li
                    key={m.Id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate text-[var(--text)]">{m.Nick}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-[var(--muted)]">
                        {levelLabel(m.Level)}
                      </span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => void removeModerator(m)}
                          disabled={removingModId !== null}
                          title="Remove moderator"
                          aria-label={`Remove moderator ${m.Nick}`}
                          className="grid h-7 w-7 place-items-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--raised)] hover:text-[color:var(--danger,#d9686c)] disabled:opacity-50"
                        >
                          {removingModId === m.Id ? (
                            <Spinner className="h-3.5 w-3.5" />
                          ) : (
                            <i className="fa-solid fa-user-xmark text-[13px]" />
                          )}
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {canModerate && (
            <button
              type="button"
              onClick={() => setBanListOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--line)] px-4 py-2 text-sm text-[var(--text)] transition-colors hover:bg-[var(--raised)]"
            >
              <i className="fa-solid fa-ban" />
              Banned members
            </button>
          )}

          <div className="text-xs text-[var(--muted)]">
            {conv.users.length} member{conv.users.length === 1 ? "" : "s"} · you are{" "}
            {conv.myLevel >= 150 ? "the owner" : conv.myLevel >= 10 ? "a moderator" : "a member"}
          </div>

          {error && <p className="text-sm text-[color:var(--glow-a)]">{error}</p>}
          {saved && <p className="text-sm text-[color:var(--glow-c)]">Saved.</p>}

          {canEdit && (
            <button
              type="button"
              onClick={save}
              disabled={saving || !name.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--glow-b)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving && <Spinner className="h-4 w-4" />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          )}

          {canEdit && (
            <div className="border-t border-[var(--line)] pt-4">
              <span className={`mb-2 block ${LABEL_CLASS}`}>Danger zone</span>
              {confirmDelete ? (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--muted)]">
                    This permanently deletes the room for everyone. This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="flex-1 rounded-lg border border-[var(--line)] px-4 py-2 text-sm text-[var(--text)] transition-colors hover:bg-[var(--raised)] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteRoom()}
                      disabled={deleting}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[color:var(--danger,#d9686c)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {deleting && <Spinner className="h-4 w-4" />}
                      {deleting ? "Deleting…" : "Delete room"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--danger,#d9686c)] px-4 py-2 text-sm font-medium text-[color:var(--danger,#d9686c)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--danger,#d9686c)_12%,transparent)]"
                >
                  <i className="fa-solid fa-trash" />
                  Delete room
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {canModerate && (
      <BanListModal
        open={banListOpen}
        onClose={() => setBanListOpen(false)}
        channelId={conv.id}
      />
    )}
    </>
  );
}
