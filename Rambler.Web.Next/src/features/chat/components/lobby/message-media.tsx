"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A media message's text is either a bare URL or a JSON `{ url, caption }`
 * payload (when the sender added a caption). Parse both, and tolerate a plain
 * URL that happens to look nothing like JSON.
 */
export function parseMedia(raw: string): { url: string; caption?: string } {
  if (raw && raw.startsWith("{")) {
    try {
      const obj = JSON.parse(raw);
      if (obj && typeof obj.url === "string") {
        return { url: obj.url, caption: typeof obj.caption === "string" ? obj.caption : undefined };
      }
    } catch {
      /* fall through to bare url */
    }
  }
  return { url: raw };
}

/** Extract and decode the display filename (last path segment) from a media URL. */
function fileName(src: string): string {
  try {
    const path = new URL(src, "http://x").pathname;
    const last = path.split("/").filter(Boolean).pop() ?? src;
    return decodeURIComponent(last);
  } catch {
    const last = src.split("/").filter(Boolean).pop() ?? src;
    try {
      return decodeURIComponent(last);
    } catch {
      return last;
    }
  }
}

/**
 * A small image thumbnail with a blur-up / skeleton loading state that opens a
 * full-screen lightbox when clicked.
 *
 * Loading approach: `loaded` starts false and flips true on the img's `onLoad`.
 * While loading we stack a pulsing skeleton box under the img, and the img
 * itself renders blurred, slightly scaled and transparent. On load it animates
 * to sharp/full-size/opaque, producing a blur-up reveal on first paint or
 * refresh. `onError` swaps in a small "unavailable" placeholder.
 */
export function MessageImage({ src }: Readonly<{ src: string }>) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (failed) {
    return (
      <div className="mt-1 inline-flex h-[120px] w-[180px] flex-col items-center justify-center gap-1.5 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--raised)] text-[var(--muted)]">
        <i className="fa-solid fa-image-slash text-lg" />
        <span className="text-[12px]">image unavailable</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open image"
        className="relative mt-1 block cursor-zoom-in overflow-hidden rounded-[var(--r-sm)] border border-[var(--line)] bg-transparent p-0"
      >
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-[var(--raised)]" aria-hidden />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`block max-h-[180px] max-w-[260px] object-cover transition-[filter,opacity,transform] duration-300 ${
            loaded ? "blur-0 scale-100 opacity-100" : "scale-105 opacity-0 blur-md"
          }`}
        />
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
            onClick={() => setOpen(false)}
          >
            <button
              type="button"
              aria-label="Close preview"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <i className="fa-solid fa-xmark text-lg" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full cursor-zoom-out select-none rounded-lg [filter:drop-shadow(0_30px_60px_rgba(0,0,0,0.6))]"
            />
          </div>,
          document.body,
        )}
    </>
  );
}

/** Font Awesome icon class for a filename, chosen by extension. */
function fileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "pdf":
      return "fa-file-pdf";
    case "txt":
    case "md":
    case "csv":
      return "fa-file-lines";
    case "doc":
    case "docx":
      return "fa-file-word";
    case "xls":
    case "xlsx":
      return "fa-file-excel";
    case "zip":
      return "fa-file-zipper";
    default:
      return "fa-file";
  }
}

/**
 * A compact document card for non-image uploads. Shows an extension-based icon
 * and the truncated filename; the whole card is a link that opens/downloads.
 */
export function FileCard({ src }: Readonly<{ src: string }>) {
  const name = fileName(src);
  const icon = fileIcon(name);

  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      title={name}
      className="mt-1 inline-flex max-w-[280px] items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-2,var(--raised))] px-3 py-2 no-underline transition-colors hover:border-[var(--glow-b)] hover:bg-[var(--raised)]"
    >
      <i className={`fa-solid ${icon} shrink-0 text-[18px] text-[var(--glow-b)]`} />
      <span className="min-w-0 flex-1 truncate text-[13.5px] text-[var(--text)]">{name}</span>
      <i className="fa-solid fa-arrow-down shrink-0 text-[12px] text-[var(--muted)]" />
    </a>
  );
}
