"use client";

import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";

interface Node {
  x: number; // % position on the radial (desktop)
  y: number;
  icon: string;
  name: string;
  badge: string;
  detail: string;
  core?: boolean;
}

// positions sit on an ellipse around the centre (50,50)
const NODES: Node[] = [
  { x: 50, y: 9, icon: "fa-solid fa-server", name: "Rambler.Server", badge: ".NET 5 · Kestrel", detail: "REST + WebSocket", core: true },
  { x: 83, y: 30, icon: "fa-solid fa-bolt", name: "Rambler.Web.Next", badge: "Next.js 15", detail: ":5001 · new UI" },
  { x: 83, y: 70, icon: "fa-brands fa-angular", name: "Rambler.Client", badge: "AngularJS", detail: "legacy UI" },
  { x: 50, y: 91, icon: "fa-solid fa-database", name: "PostgreSQL", badge: "EF Core", detail: "persistence" },
  { x: 17, y: 70, icon: "fa-brands fa-docker", name: "Docker", badge: "Compose", detail: "db · server · web" },
  { x: 17, y: 30, icon: "fa-solid fa-file-code", name: "Rambler.Contracts", badge: "C# DTOs", detail: "shared protocol" },
];

function NodeCard({ n, className }: { n: Node; className?: string }) {
  return (
    <div
      className={cn(
        "w-[168px] rounded-2xl border bg-white/[0.04] p-3 text-center backdrop-blur-sm transition-all hover:-translate-y-0.5",
        n.core
          ? "border-rambler-turquoise/50 bg-rambler-turquoise/[0.08] shadow-lg shadow-rambler-turquoise/10"
          : "border-white/10 hover:border-white/25",
        className,
      )}
    >
      <span
        className={cn(
          "mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full text-sm ring-1 ring-inset ring-white/10",
          n.core ? "bg-rambler-turquoise/20 text-rambler-turquoise" : "bg-white/10 text-white/80",
        )}
      >
        <i className={n.icon} />
      </span>
      <div className="text-sm font-semibold text-white">{n.name}</div>
      {n.core && (
        <span className="mt-1 inline-block rounded-full bg-rambler-turquoise px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rambler-indigo">
          Core
        </span>
      )}
      <div className="mt-1 text-[11px] text-white/45">{n.badge}</div>
      <div className="text-[11px] text-rambler-turquoise/80">{n.detail}</div>
    </div>
  );
}

function Hub() {
  return (
    <div className="relative flex h-44 w-44 flex-col items-center justify-center rounded-full bg-rambler-indigo text-center shadow-2xl shadow-black/60 ring-1 ring-white/10">
      {/* soft accent glow */}
      <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-rambler-turquoise/20 [box-shadow:0_0_40px_-8px_rgba(78,186,165,0.4)_inset]" />
      {/* pulsing radar ring */}
      <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-rambler-turquoise/30 animate-pulse-ring" />
      <div className="text-5xl font-extrabold leading-none text-rambler-turquoise [text-shadow:0_0_18px_rgba(78,186,165,0.45)]">
        6
      </div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.15em] text-white">
        Components
      </div>
      <div className="text-[11px] text-white/45">one system</div>
    </div>
  );
}

export function ArchitectureSection() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-20">
      <Reveal className="mx-auto mb-12 max-w-xl text-center">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-rambler-turquoise">
          Under the hood
        </span>
        <h2 className="mt-3 text-4xl font-bold tracking-tight text-white">How it fits together</h2>
        <p className="mt-3 text-lg text-white/55">
          One .NET core, two front-ends, and everything wired over REST and WebSockets.
        </p>
      </Reveal>

      {/* Desktop radial */}
      <div className="relative mx-auto hidden aspect-[16/10] w-full lg:block">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <ellipse
            cx="50"
            cy="50"
            rx="38"
            ry="41"
            fill="none"
            stroke="white"
            strokeOpacity="0.1"
            strokeWidth="1"
            strokeDasharray="3 4"
            vectorEffect="non-scaling-stroke"
          />
          {NODES.map((n) => (
            <line
              key={n.name}
              className="animate-dash-flow"
              x1="50"
              y1="50"
              x2={n.x}
              y2={n.y}
              stroke="white"
              strokeOpacity="0.18"
              strokeWidth="1"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Reveal>
            <Hub />
          </Reveal>
        </div>

        {NODES.map((n, i) => (
          <div
            key={n.name}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          >
            <Reveal delay={120 + i * 90}>
              <NodeCard n={n} />
            </Reveal>
          </div>
        ))}
      </div>

      {/* Mobile / small screens: hub + grid */}
      <div className="lg:hidden">
        <div className="mb-6 flex justify-center">
          <Hub />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {NODES.map((n) => (
            <NodeCard key={n.name} n={n} className="w-full" />
          ))}
        </div>
      </div>
    </section>
  );
}
