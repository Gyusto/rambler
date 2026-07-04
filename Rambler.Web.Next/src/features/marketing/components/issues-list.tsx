"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { http } from "@/lib/api/http";

const GITHUB_URL = "https://github.com/8labs/rambler";

interface IssueLabel {
  Name: string;
  Color: string;
}

interface Issue {
  Number: number;
  Title: string;
  State: "open" | "closed";
  Url: string;
  Comments: number;
  CreatedAt: string;
  Author: string;
  Labels: IssueLabel[];
}

type Filter = "all" | "open" | "closed";

/** Short relative time like "3d ago"; falls back to a date for older items. */
function timeAgo(iso: string): string {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  const mins = Math.round(secs / 60);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Live list of the repo's GitHub issues (pull requests excluded server-side). */
export function IssuesList() {
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let active = true;
    http
      .get<Issue[]>("/Blog/issues")
      .then((data) => {
        if (active) setIssues(data);
      })
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => {
    const open = issues?.filter((i) => i.State === "open").length ?? 0;
    const closed = issues?.filter((i) => i.State === "closed").length ?? 0;
    return { all: (issues?.length ?? 0), open, closed };
  }, [issues]);

  const visible = useMemo(
    () => (issues ?? []).filter((i) => filter === "all" || i.State === filter),
    [issues, filter],
  );

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: `All ${counts.all || ""}`.trim() },
    { key: "open", label: `Open ${counts.open || ""}`.trim() },
    { key: "closed", label: `Closed ${counts.closed || ""}`.trim() },
  ];

  return (
    <div className="mt-10">
      {/* filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm transition-colors",
              filter === t.key
                ? "bg-white/10 text-white ring-1 ring-inset ring-white/15"
                : "text-white/60 hover:bg-white/5 hover:text-white",
            )}
          >
            {t.label}
          </button>
        ))}
        <a
          href={`${GITHUB_URL}/issues/new`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-rambler-turquoise px-3.5 py-1.5 text-sm font-medium text-rambler-indigo hover:brightness-110"
        >
          <i className="fa-solid fa-plus text-xs" />
          New issue
        </a>
      </div>

      {/* body */}
      <div className="mt-6">
        {error ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/50">
            Couldn&apos;t load issues right now.{" "}
            <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer" className="text-rambler-turquoise hover:text-white">
              View them on GitHub
            </a>
            .
          </p>
        ) : issues === null ? (
          <p className="text-sm text-white/40">
            <i className="fa-solid fa-circle-notch mr-2 animate-spin" />
            Loading issues…
          </p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-white/40">Nothing here yet.</p>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-white/10">
            {visible.map((issue) => (
              <li key={issue.Number} className="border-b border-white/10 last:border-b-0">
                <a
                  href={issue.Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 bg-[#211b33] px-4 py-3.5 transition-colors hover:bg-[#2a2340]"
                >
                  <i
                    className={cn(
                      "mt-0.5 text-base",
                      issue.State === "open"
                        ? "fa-regular fa-circle-dot text-rambler-turquoise"
                        : "fa-solid fa-circle-check text-rambler-violet",
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{issue.Title}</span>
                      {issue.Labels.map((l) => (
                        <span
                          key={l.Name}
                          className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
                          style={{
                            color: `#${l.Color}`,
                            borderColor: `#${l.Color}66`,
                            backgroundColor: `#${l.Color}1a`,
                          }}
                        >
                          {l.Name}
                        </span>
                      ))}
                    </div>
                    <div className="mt-1 text-xs text-white/40">
                      #{issue.Number} · opened {timeAgo(issue.CreatedAt)}
                      {issue.Author ? ` by ${issue.Author}` : ""}
                    </div>
                  </div>
                  {issue.Comments > 0 && (
                    <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-xs text-white/40">
                      <i className="fa-regular fa-comment text-[11px]" />
                      {issue.Comments}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
