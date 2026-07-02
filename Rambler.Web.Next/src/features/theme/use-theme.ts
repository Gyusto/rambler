"use client";

import { useEffect, useState } from "react";
import { DEFAULT_THEME } from "@/features/theme/themes";

const KEY = "lobby-theme";

function apply(id: string) {
  if (id === DEFAULT_THEME) document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", id);
}

/** Theme lives on <html data-theme>; CSS variables do the rest. Persisted. */
export function useTheme() {
  const [theme, setThemeState] = useState(DEFAULT_THEME);

  useEffect(() => {
    const saved = localStorage.getItem(KEY) || DEFAULT_THEME;
    setThemeState(saved);
    apply(saved);
  }, []);

  function setTheme(id: string) {
    setThemeState(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* ignore */
    }
    apply(id);
  }

  return { theme, setTheme };
}
