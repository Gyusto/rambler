"use client";

import { useEffect, useRef, useState } from "react";
import { EMOJI_CATEGORIES } from "@/features/chat/emoji-data";

const RECENT_KEY = "rambler.recentEmoji";

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

export function EmojiPicker({
  onPick,
  onClose,
}: Readonly<{ onPick: (emoji: string) => void; onClose: () => void }>) {
  const [cat, setCat] = useState<string>("recent");
  const [recent, setRecent] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const r = loadRecent();
    setRecent(r);
    setCat(r.length ? "recent" : EMOJI_CATEGORIES[0].id);
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function pick(emoji: string) {
    onPick(emoji);
    const next = [emoji, ...recent.filter((e) => e !== emoji)].slice(0, 24);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  const emojis = cat === "recent" ? recent : EMOJI_CATEGORIES.find((c) => c.id === cat)?.emojis ?? [];
  const tabCls = (id: string) =>
    `grid h-8 w-8 place-items-center rounded-md text-[15px] transition-colors ${
      cat === id ? "bg-[var(--raised)] text-[var(--glow-b)]" : "text-[var(--muted)] hover:bg-[var(--raised)]"
    }`;

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 z-50 mb-3.5 w-[min(320px,calc(100vw-2rem))] max-w-[320px] overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]"
    >
      <div className="flex items-center gap-0.5 border-b border-[var(--line)] px-2 py-1.5">
        <button type="button" className={tabCls("recent")} title="Recent" onClick={() => setCat("recent")}>
          <i className="fa-regular fa-clock" />
        </button>
        {EMOJI_CATEGORIES.map((c) => (
          <button key={c.id} type="button" className={tabCls(c.id)} title={c.label} onClick={() => setCat(c.id)}>
            <i className={`fa-solid ${c.icon}`} />
          </button>
        ))}
      </div>

      <div className="grid h-[240px] grid-cols-8 content-start gap-0.5 overflow-y-auto p-2">
        {emojis.length === 0 && (
          <div className="col-span-8 py-8 text-center text-[13px] text-[var(--muted)]">
            No recent emoji yet.
          </div>
        )}
        {emojis.map((e, i) => (
          <button
            key={`${e}-${i}`}
            type="button"
            className="grid h-8 w-8 place-items-center rounded-md text-[20px] leading-none hover:bg-[var(--raised)]"
            onClick={() => pick(e)}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
