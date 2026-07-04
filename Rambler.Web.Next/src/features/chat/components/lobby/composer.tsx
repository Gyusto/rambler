"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/features/chat/state/chat-store";
import { EmojiPicker } from "@/features/chat/components/lobby/emoji-picker";
import { TypingIndicator } from "@/features/chat/components/lobby/typing-indicator";
import { Spinner } from "@/components/ui/spinner";
import { mediaApi } from "@/features/chat/api/media.api";
import type { RoomUser } from "@/types/protocol";

interface PendingFile {
  id: string;
  file: File;
  isImage: boolean;
  /** object URL for image previews (revoked after send/remove) */
  preview?: string;
}

export function Composer() {
  const [text, setText] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingFile[]>([]);
  // @-mention autocomplete: the token being typed (null when inactive) + highlighted row
  const [mention, setMention] = useState<{ start: number; end: number; query: string } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const sendMedia = useChatStore((s) => s.sendMedia);
  const sendTyping = useChatStore((s) => s.sendTyping);
  const active = useChatStore((s) => (s.activeId ? s.conversations[s.activeId] : undefined));
  const replyTarget = useChatStore((s) => s.replyTarget);
  const setReplyTarget = useChatStore((s) => s.setReplyTarget);

  // typing: "start" on first keystroke, re-send while typing, "stop" on idle/send/switch
  const typingRef = useRef(false);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // which conversation we sent "start" for, so "stop" hits the same one after a switch
  const typingConvId = useRef<string | undefined>(undefined);
  const lastStartSent = useRef(0);

  function stopTyping() {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = null;
    if (typingRef.current) {
      typingRef.current = false;
      sendTyping(false, typingConvId.current);
      typingConvId.current = undefined;
    }
  }

  function signalTyping(convId: string) {
    const now = Date.now();
    if (!typingRef.current) {
      typingRef.current = true;
      typingConvId.current = convId;
      lastStartSent.current = now;
      sendTyping(true, convId);
    } else if (now - lastStartSent.current > 3000) {
      // keep the indicator alive while still typing
      lastStartSent.current = now;
      sendTyping(true, convId);
    }
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(stopTyping, 2500);
  }

  // stop typing when switching conversations or unmounting
  useEffect(() => stopTyping, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasPending = pending.length > 0;
  const canSend = !!active && !uploading && (text.trim().length > 0 || hasPending);

  let placeholder = "Connecting…";
  if (hasPending) placeholder = "Add a caption…";
  else if (active?.kind === "dm") placeholder = `Message ${active.name}…`;
  else if (active) placeholder = "Just ramble away…";

  function autosize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }

  // Re-detect the @-token at the caret. Only rooms have a user list to pick from.
  function syncMention(value: string, caret: number) {
    if (active?.kind !== "room") {
      setMention(null);
      return;
    }
    const m = /(^|\s)@([\w-]*)$/.exec(value.slice(0, caret));
    if (!m) {
      setMention(null);
      return;
    }
    const query = m[2];
    setMention({ start: caret - query.length - 1, end: caret, query });
    setMentionIndex(0);
  }

  function syncMentionFromEl() {
    const ta = taRef.current;
    if (ta) syncMention(ta.value, ta.selectionStart ?? ta.value.length);
  }

  // Replace the @partial token with "@Nick " and drop the caret after the space.
  function selectMention(user: RoomUser) {
    const ta = taRef.current;
    if (!mention || !ta) return;
    const value = ta.value;
    const insert = `@${user.Nick} `;
    const next = value.slice(0, mention.start) + insert + value.slice(mention.end);
    const caret = mention.start + insert.length;
    setText(next);
    setMention(null);
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (el) {
        el.focus();
        el.selectionStart = el.selectionEnd = caret;
      }
      autosize();
    });
  }

  function addFiles(files: File[]) {
    setUploadError(null);
    setPending((prev) => [
      ...prev,
      ...files.map((file) => {
        const isImage = file.type.startsWith("image/");
        return {
          id: `${file.name}-${file.size}-${prev.length}-${file.lastModified}`,
          file,
          isImage,
          preview: isImage ? URL.createObjectURL(file) : undefined,
        };
      }),
    ]);
  }

  function removePending(id: string) {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function submit() {
    if (!canSend || uploading) return;

    // staged files: upload each and send; the caption (if any) rides the first one.
    if (hasPending) {
      const items = pending;
      const caption = text.trim();
      setPending([]);
      setText("");
      requestAnimationFrame(autosize);
      stopTyping();
      setUploading(true);
      setUploadError(null);
      let failed = 0;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        try {
          const { url, contentType } = await mediaApi.upload(it.file);
          const kind = (contentType || it.file.type).startsWith("image/") ? "image" : "file";
          sendMedia(url, kind, i === 0 ? caption : undefined);
        } catch {
          failed += 1;
        }
        if (it.preview) URL.revokeObjectURL(it.preview);
      }
      setUploading(false);
      if (failed > 0) setUploadError(`Couldn't upload ${failed} file${failed > 1 ? "s" : ""}.`);
      taRef.current?.focus();
      return;
    }

    stopTyping();
    sendMessage(text, replyTarget?.postId);
    setReplyTarget(undefined);
    setText("");
    requestAnimationFrame(autosize);
    taRef.current?.focus();
  }

  function insertEmoji(emoji: string) {
    setText((t) => t + emoji);
    requestAnimationFrame(autosize);
    taRef.current?.focus();
  }

  // Users matching the active @-token, startsWith first, capped for the dropdown.
  const mentionMatches: RoomUser[] =
    mention && active?.kind === "room"
      ? (() => {
          const q = mention.query.toLowerCase();
          return active.users
            .filter((u) => u.Nick.toLowerCase().includes(q))
            .sort((a, b) => {
              const aStarts = a.Nick.toLowerCase().startsWith(q) ? 0 : 1;
              const bStarts = b.Nick.toLowerCase().startsWith(q) ? 0 : 1;
              return aStarts - bStarts || a.Nick.localeCompare(b.Nick);
            })
            .slice(0, 8);
        })()
      : [];
  const mentionOpen = mentionMatches.length > 0;
  const activeMention = Math.min(mentionIndex, mentionMatches.length - 1);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-picking the same file(s)
    if (files.length > 0 && active) addFiles(files);
  }

  return (
    <footer className="composer">
      <TypingIndicator />
      {replyTarget && (
        <div
          className="mb-1.5 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"
          style={{
            background: "var(--surface-2, var(--raised))",
            borderColor: "var(--line)",
          }}
        >
          <i className="fa-solid fa-reply flex-none" style={{ color: "var(--muted)" }} />
          <span className="min-w-0 flex-1 truncate">
            <span style={{ color: "var(--muted)" }}>Replying to </span>
            <span className="font-medium" style={{ color: "var(--text)" }}>
              {replyTarget.nick}
            </span>
            <span className="ml-2 truncate" style={{ color: "var(--muted)" }}>
              {replyTarget.text}
            </span>
          </span>
          <button
            className="tool flex-none"
            title="Cancel reply"
            aria-label="Cancel reply"
            onClick={() => setReplyTarget(undefined)}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}
      {uploadError && (
        <div className="mb-1.5 px-1 text-xs" style={{ color: "var(--danger, #d9686c)" }}>
          {uploadError}
        </div>
      )}
      {hasPending && (
        <div
          className="mb-1.5 flex flex-wrap gap-2 rounded-lg border p-2"
          style={{ background: "var(--surface-2, var(--raised))", borderColor: "var(--line)" }}
        >
          {pending.map((p) => (
            <div
              key={p.id}
              className="group relative flex items-center gap-2 overflow-hidden rounded-md border"
              style={{ borderColor: "var(--line)", background: "var(--surface)" }}
            >
              {p.isImage && p.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.preview} alt={p.file.name} className="h-14 w-14 object-cover" />
              ) : (
                <span className="flex h-14 items-center gap-2 px-3">
                  <i className="fa-solid fa-file text-[16px]" style={{ color: "var(--glow-b)" }} />
                  <span className="max-w-[140px] truncate text-xs" style={{ color: "var(--text)" }}>
                    {p.file.name}
                  </span>
                </span>
              )}
              <button
                type="button"
                title="Remove"
                aria-label={`Remove ${p.file.name}`}
                onClick={() => removePending(p.id)}
                className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full text-white opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: "rgba(0,0,0,.55)" }}
              >
                <i className="fa-solid fa-xmark text-[11px]" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="field">
        <div className="relative flex-none">
          <button
            className="tool"
            title="Add emoji"
            aria-label="Add emoji"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen((v) => !v)}
          >
            <i className="fa-regular fa-face-smile" />
          </button>
          {pickerOpen && <EmojiPicker onPick={insertEmoji} onClose={() => setPickerOpen(false)} />}
        </div>
        <button
          className="tool flex-none"
          title="Attach files"
          aria-label="Attach files"
          disabled={!active || uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? <Spinner className="h-4 w-4" /> : <i className="fa-solid fa-paperclip" />}
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md,.csv,.json,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
          className="hidden"
          onChange={onPickFile}
        />
        <div className="relative flex-1">
          {mentionOpen && (
            <ul
              className="absolute bottom-full left-0 z-20 mb-2 max-h-64 w-60 overflow-y-auto rounded-lg border p-1 shadow-lg"
              style={{ background: "var(--raised)", borderColor: "var(--line)" }}
              role="listbox"
            >
              {mentionMatches.map((u, i) => (
                <li key={u.Id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === activeMention}
                    // keep textarea focus so the caret/token survives the click
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setMentionIndex(i)}
                    onClick={() => selectMention(u)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                      i === activeMention ? "bg-rambler-turquoise/15" : ""
                    }`}
                    style={{ color: "var(--text)" }}
                  >
                    <span
                      className="grid h-6 w-6 flex-none place-items-center rounded-full text-[11px] font-semibold uppercase"
                      style={{ background: "var(--surface-2, var(--raised))", color: "var(--muted)" }}
                    >
                      {u.Nick.slice(0, 2)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{u.Nick}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <textarea
            ref={taRef}
            rows={1}
            className="w-full"
            placeholder={placeholder}
            value={text}
            disabled={!active}
            aria-label="Message the lobby"
            onChange={(e) => {
              setText(e.target.value);
              autosize();
              syncMention(e.target.value, e.target.selectionStart ?? e.target.value.length);
              if (active && e.target.value.trim()) signalTyping(active.id);
              else stopTyping();
            }}
            onKeyUp={syncMentionFromEl}
            onClick={syncMentionFromEl}
            onBlur={() => setMention(null)}
            onKeyDown={(e) => {
              if (mentionOpen) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMentionIndex((i) => (Math.min(i, mentionMatches.length - 1) + 1) % mentionMatches.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setMentionIndex(
                    (i) =>
                      (Math.min(i, mentionMatches.length - 1) - 1 + mentionMatches.length) %
                      mentionMatches.length,
                  );
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  selectMention(mentionMatches[activeMention]);
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setMention(null);
                  return;
                }
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape" && replyTarget) {
                e.preventDefault();
                setReplyTarget(undefined);
              }
            }}
          />
        </div>
        <button className="send" aria-label="Send message" disabled={!canSend} onClick={submit}>
          <i className="fa-solid fa-paper-plane" />
        </button>
      </div>
      <p className="hint">
        <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line
      </p>
    </footer>
  );
}
