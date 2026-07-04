"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/features/chat/state/chat-store";
import { EmojiPicker } from "@/features/chat/components/lobby/emoji-picker";
import { TypingIndicator } from "@/features/chat/components/lobby/typing-indicator";
import { Spinner } from "@/components/ui/spinner";
import { mediaApi } from "@/features/chat/api/media.api";

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
  // media/link permissions default to allowed when the flag is unknown
  const mediaAllowed = active?.allowMedia !== false;
  const linksAllowed = active?.allowLinks !== false;

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
        {mediaAllowed && (
          <>
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
          </>
        )}
        <textarea
          ref={taRef}
          rows={1}
          placeholder={placeholder}
          value={text}
          disabled={!active}
          aria-label="Message the lobby"
          onChange={(e) => {
            setText(e.target.value);
            autosize();
            if (active && e.target.value.trim()) signalTyping(active.id);
            else stopTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape" && replyTarget) {
              e.preventDefault();
              setReplyTarget(undefined);
            }
          }}
        />
        <button className="send" aria-label="Send message" disabled={!canSend} onClick={submit}>
          <i className="fa-solid fa-paper-plane" />
        </button>
      </div>
      <p className="hint">
        <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line
        {!linksAllowed && (
          <span className="ml-2" style={{ color: "var(--muted)" }}>
            · Link sharing is disabled in this channel
          </span>
        )}
      </p>
    </footer>
  );
}
