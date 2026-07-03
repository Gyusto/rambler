"use client";

import { Reveal } from "@/components/ui/reveal";
import { ImageLightbox } from "@/features/marketing/components/image-lightbox";

const SHOTS = [
  "/screens/shot-2.png",
  "/screens/shot-1.png",
  "/screens/shot-3.png",
  "/screens/shot-5.png",
  "/screens/shot-4.png",
];

/** A masonry screenshot gallery — each shot opens full-screen on click. */
export function ScreenshotGallery() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-24">
      <Reveal className="mx-auto mb-14 max-w-xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-rambler-turquoise">
          See it in action
        </span>
        <h2 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-[2.75rem]">
          A closer look
        </h2>
        <p className="mt-4 text-lg text-white/55">
          Reactions, replies, file sharing, themes - the whole chat, in the wild.
        </p>
      </Reveal>

      <div className="gap-4 [column-fill:_balance] sm:columns-2 lg:columns-3 [&>*]:mb-4">
        {SHOTS.map((src, i) => (
          <Reveal key={src} delay={i * 70} className="break-inside-avoid">
            <ImageLightbox
              src={src}
              alt="Rambler screenshot"
              className="w-full select-none transition-transform duration-300 [filter:drop-shadow(0_18px_40px_rgba(0,0,0,0.5))] hover:-translate-y-1"
            />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
