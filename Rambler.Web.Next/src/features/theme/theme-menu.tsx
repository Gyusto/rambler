"use client";

import { useEffect, useRef, useState } from "react";
import { THEMES } from "@/features/theme/themes";
import { useTheme } from "@/features/theme/use-theme";

export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
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
  }, []);

  return (
    <div className="popwrap" ref={wrapRef}>
      <button
        className="icon-btn"
        title="Change theme"
        aria-label="Change theme"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <i className="fa-solid fa-palette" />
      </button>

      <div className={`pop${open ? " open" : ""}`} role="menu" aria-label="Themes">
        <h3>Theme</h3>
        {THEMES.map((t) => (
          <button
            key={t.id}
            className="theme-opt"
            role="menuitemradio"
            aria-checked={theme === t.id}
            onClick={() => {
              setTheme(t.id);
              setOpen(false);
            }}
          >
            <span
              className="swatch"
              style={{ background: t.dots[0] }}
            />
            <span>{t.name}</span>
            <i className="check fa-solid fa-check" />
          </button>
        ))}
      </div>
    </div>
  );
}
