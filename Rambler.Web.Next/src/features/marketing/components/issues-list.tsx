"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const REPO = "8labs/rambler";
const GITHUB_URL = "https://github.com/8labs/rambler";

interface GhLabel {
  name: string;
  color: string;
}

interface GhIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  html_url: string;
  comments: number;
  created_at: string;
  user: { login: string } | null;
  labels: GhLabel[];
  pull_request?: unknown;
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

/** Live list of the repo's GitHub issues (pull requests excluded). */
export function IssuesList() {
  const [issues, setIssues] = useState<GhIssue[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let active = true;
    fetch(`https://api.github.com/repos/${REPO}/issues?state=all&per_page=100&sort=updated`, {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: GhIssue[]) => {
        if (active) setIssues(data.filter((i) => !i.pull_request));
      })
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => {
    const open = issues?.filter((i) => i.state === "open").length ?? 0;
    const closed = issues?.filter((i) => i.state === "closed").length ?? 0;
    return { all: (issues?.length ?? 0), open, closed };
  }, [issues]);

  const visible = useMemo(
    () => (issues ?? []).filter((i) => filter === "all" || i.state === filter),
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
              <li key={issue.number} className="border-b border-white/10 last:border-b-0">
                <a
                  href={issue.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 bg-[#211b33] px-4 py-3.5 transition-colors hover:bg-[#2a2340]"
                >
                  <i
                    className={cn(
                      "mt-0.5 text-base",
                      issue.state === "open"
                        ? "fa-regular fa-circle-dot text-rambler-turquoise"
                        : "fa-solid fa-circle-check text-rambler-violet",
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{issue.title}</span>
                      {issue.labels.map((l) => (
                        <span
                          key={l.name}
                          className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
                          style={{
                            color: `#${l.color}`,
                            borderColor: `#${l.color}66`,
                            backgroundColor: `#${l.color}1a`,
                          }}
                        >
                          {l.name}
                        </span>
                      ))}
                    </div>
                    <div className="mt-1 text-xs text-white/40">
                      #{issue.number} · opened {timeAgo(issue.created_at)}
                      {issue.user ? ` by ${issue.user.login}` : ""}
                    </div>
                  </div>
                  {issue.comments > 0 && (
                    <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-xs text-white/40">
                      <i className="fa-regular fa-comment text-[11px]" />
                      {issue.comments}
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
