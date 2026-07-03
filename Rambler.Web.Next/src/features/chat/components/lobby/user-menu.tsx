"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { RoomUser } from "@/types/protocol";

// Role levels that map to the backend ModerationLevel enum:
// Operator = Admin (full room control), Moderator = can kick/ban/warn, None = clear role.
export const MODE = { OPERATOR: 100, MODERATOR: 10, NONE: 0 } as const;

interface UserMenuProps {
  user: RoomUser;
  isSelf: boolean;
  /** can kick/ban this user (caller is Moderator+) */
  canModerate: boolean;
  /** can promote/demote this user's role (caller is Admin/Owner) */
  canManage: boolean;
  onMessage: () => void | Promise<void>;
  onIgnore: () => void | Promise<void>;
  onSetMode: (level: number) => void | Promise<void>;
  onKick: () => void | Promise<void>;
  onBan: () => void | Promise<void>;
  onKickBan: () => void | Promise<void>;
  /** avatar + name row content */
  children: ReactNode;
}

export function UserMenu({
  user,
  isSelf,
  canModerate,
  canManage,
  onMessage,
  onIgnore,
  onSetMode,
  onKick,
  onBan,
  onKickBan,
  children,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const moreRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !moreRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    const r = moreRef.current?.getBoundingClientRect();
    if (r) {
      // Anchor the menu directly below (and right-aligned to) this user's button.
      const MENU_W = 240;
      const MENU_H = 380; // approx; enough to decide flip
      const margin = 8;
      let left = r.right - MENU_W;
      if (left < margin) left = margin;
      if (left + MENU_W > window.innerWidth - margin) left = window.innerWidth - margin - MENU_W;
      // flip above the row if it would overflow the bottom of the viewport
      let top = r.bottom + 4;
      if (top + MENU_H > window.innerHeight - margin) {
        top = Math.max(margin, r.top - 4 - MENU_H);
      }
      setPos({ top, left });
    }
    setOpen((v) => !v);
  }

  function act(fn: () => void | Promise<void>) {
    return () => {
      void fn();
      setOpen(false);
    };
  }

  const iconBtn =
    "grid h-6 w-6 place-items-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]";
  const item =
    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] text-[var(--text)] hover:bg-[var(--line)]";
  const danger = `${item} text-[color:var(--danger,#d9686c)]`;
  const label = "px-2.5 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--faint)]";
  const hasMenu = !isSelf; // ignore is always available for others

  return (
    <div className="member group">
      {children}

      {/* hover actions */}
      <div className="ml-auto flex flex-none items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {!isSelf && (
          <button type="button" className={iconBtn} title="Message" aria-label={`Message ${user.Nick}`} onClick={() => onMessage()}>
            <i className="fa-solid fa-envelope text-[12px]" />
          </button>
        )}
        {hasMenu && (
          <button
            ref={moreRef}
            type="button"
            className={iconBtn}
            title="More"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`More actions for ${user.Nick}`}
            onClick={toggle}
          >
            <i className="fa-solid fa-ellipsis-vertical text-[13px]" />
          </button>
        )}
      </div>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${user.Nick}`}
          style={{ position: "fixed", top: pos.top, left: pos.left }}
          className="z-50 max-h-[80vh] w-60 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow)]"
        >
          <button type="button" role="menuitem" className={item} onClick={act(onIgnore)}>
            <i className="fa-solid fa-user-slash w-4 text-center text-[var(--muted)]" /> Ignore
          </button>

          {canManage && (
            <>
              <div className={label}>Role</div>
              <button type="button" role="menuitem" className={item} onClick={act(() => onSetMode(MODE.OPERATOR))}>
                <i className="fa-solid fa-crown w-4 text-center text-[var(--muted)]" /> Make Operator
              </button>
              <button type="button" role="menuitem" className={item} onClick={act(() => onSetMode(MODE.MODERATOR))}>
                <i className="fa-solid fa-star w-4 text-center text-[var(--muted)]" /> Make Moderator
              </button>
              <button type="button" role="menuitem" className={item} onClick={act(() => onSetMode(MODE.NONE))}>
                <i className="fa-regular fa-circle w-4 text-center text-[var(--muted)]" /> Remove role
              </button>
            </>
          )}

          {canModerate && (
            <>
              <div className={label}>User actions</div>
              <button type="button" role="menuitem" className={danger} onClick={act(onKick)}>
                <i className="fa-solid fa-user-xmark w-4 text-center" /> Kick User
              </button>
              <button type="button" role="menuitem" className={danger} onClick={act(onBan)}>
                <i className="fa-solid fa-ban w-4 text-center" /> Ban User
              </button>
              <button type="button" role="menuitem" className={danger} onClick={act(onKickBan)}>
                <i className="fa-solid fa-gavel w-4 text-center" /> Kick &amp; Ban
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
