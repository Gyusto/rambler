"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/features/chat/state/chat-store";
import { EmojiPicker } from "@/features/chat/components/lobby/emoji-picker";
import { TypingIndicator } from "@/features/chat/components/lobby/typing-indicator";

export function Composer() {
  const [text, setText] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const sendTyping = useChatStore((s) => s.sendTyping);
  const active = useChatStore((s) => (s.activeId ? s.conversations[s.activeId] : undefined));

  // Typing signal: emit "start" on first keystroke, re-arm "start" periodically
  // so the receiver's TTL never lapses mid-typing, and emit "stop" after a short
  // idle gap (or on send / switch / unmount).
  const typingRef = useRef(false);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // the conversation we last sent a "start" for, so "stop" targets THAT one
  // (not whatever became active after a switch).
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
      // re-arm "start" so the receiver's 6s TTL keeps refreshing while typing
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
    sendMessage(text);
    setText("");
    requestAnimationFrame(autosize);
    taRef.current?.focus();
  }

  function insertEmoji(emoji: string) {
    setText((t) => t + emoji);
    requestAnimationFrame(autosize);
    taRef.current?.focus();
  }

  return (
    <footer className="composer">
      <TypingIndicator />
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
