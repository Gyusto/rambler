"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * An image that expands into a full-screen preview when clicked.
 * Click the backdrop, the close button, or press Escape to dismiss.
 */
export function ImageLightbox({
  src,
  alt,
  className,
}: Readonly<{ src: string; alt: string; className?: string }>) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    // lock body scroll while the preview is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Preview screenshot"
        className="group block w-full cursor-zoom-in border-0 bg-transparent p-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={className}
          loading="eager"
        />
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-label="Screenshot preview"
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
              alt={alt}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full cursor-zoom-out select-none rounded-lg [filter:drop-shadow(0_30px_60px_rgba(0,0,0,0.6))]"
            />
          </div>,
          document.body,
        )}
    </>
  );
}
