"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/features/chat/state/chat-store";
import { EmojiPicker } from "@/features/chat/components/lobby/emoji-picker";
import { TypingIndicator } from "@/features/chat/components/lobby/typing-indicator";
import { Spinner } from "@/components/ui/spinner";
import { mediaApi } from "@/features/chat/api/media.api";

export function Composer() {
  const [text, setText] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const sendImage = useChatStore((s) => s.sendImage);
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

  const canSend = !!active && text.trim().length > 0;

  let placeholder = "Connecting…";
  if (active?.kind === "dm") placeholder = `Message ${active.name}…`;
  else if (active) placeholder = "Just ramble away…";

  function autosize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }

  function submit() {
    if (!canSend) return;
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

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file || !active) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await mediaApi.upload(file);
      sendImage(url);
    } catch {
      setUploadError("Couldn't upload that image.");
    } finally {
      setUploading(false);
    }
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
          title="Attach image"
          aria-label="Attach image"
          disabled={!active || uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? <Spinner className="h-4 w-4" /> : <i className="fa-solid fa-image" />}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={onPickFile}
        />
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
      </p>
    </footer>
  );
}
