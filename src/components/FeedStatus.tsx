"use client";

/**
 * FeedStatus — compact data feed health summary for the dashboard.
 *
 * Shows: how many feeds are live/stale/erroring, last update time,
 * and any issues. Expandable to show per-provider detail.
 */

import { useState, useEffect } from "react";

interface FeedHealth {
  id: string;
  name: string;
  status: "live" | "stale" | "error" | "unknown";
  lastSuccessAt: string | null;
  lastError: string | null;
  dataAge: number;
  ttl: number;
  source: string;
  rateLimit: string | null;
}

interface ProviderStatus {
  source: string;
  status: string;
  feedCount: number;
  live: number;
  stale: number;
  error: number;
  lastUpdate: string | null;
  rateLimit: string | null;
}

interface FeedSummary {
  total: number;
  live: number;
  stale: number;
  error: number;
  oldestDataAge: number;
  issues: string[];
}

interface FeedsResponse {
  summary: FeedSummary;
  providers: ProviderStatus[];
  feeds: FeedHealth[];
  checkedAt: string;
}

const SOURCE_LABELS: Record<string, string> = {
  polygon: "Polygon (Prices)",
  gdelt: "GDELT (News)",
  reddit: "Reddit",
  stocktwits: "StockTwits",
  "alternative.me": "Fear & Greed",
  alpha_vantage: "Alpha Vantage",
  forex_factory: "Calendar",
  anthropic: "Claude AI",
};

function statusDot(status: string) {
  switch (status) {
    case "live": return "bg-[--green]";
    case "stale": return "bg-[--amber]";
    case "error": return "bg-[--red]";
    default: return "bg-[--text-muted]";
  }
}

function formatAge(seconds: number): string {
  if (seconds < 0) return "never";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${Math.round(seconds / 3600)}h ago`;
}

export default function FeedStatus() {
  const [data, setData] = useState<FeedsResponse | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/feeds")
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-2xs text-[--text-muted]">
        <div className="w-1.5 h-1.5 rounded-full bg-[--text-muted] animate-pulse" />
        Checking feeds...
      </div>
    );
  }

  if (!data || data.summary.total === 0) {
    return (
      <div className="flex items-center gap-2 text-2xs text-[--text-muted]">
        <div className="w-1.5 h-1.5 rounded-full bg-[--text-muted]" />
        No active data feeds
      </div>
    );
  }

  const { summary } = data;
  const hasIssues = summary.error > 0 || summary.stale > summary.live;

  return (
    <div className="rounded-lg bg-[--surface-raised] overflow-hidden">
      {/* Summary row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[--surface-overlay] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${
            summary.error > 0 ? "bg-[--red]" :
            summary.stale > 0 ? "bg-[--amber]" :
            summary.live > 0 ? "bg-[--green]" : "bg-[--text-muted]"
          }`} />
          <span className="text-2xs font-medium text-[--text-primary]">
            Data feeds
          </span>
          <span className="text-2xs text-[--text-muted]">
            {summary.live} live
            {summary.stale > 0 && <span className="text-[--amber]"> · {summary.stale} stale</span>}
            {summary.error > 0 && <span className="text-[--red]"> · {summary.error} error</span>}
          </span>
        </div>
        <span className="text-2xs text-[--text-muted]">
          {expanded ? "▴" : "▾"}
        </span>
      </button>

      {/* Issues banner */}
      {hasIssues && !expanded && summary.issues.length > 0 && (
        <div className="px-3 pb-2">
          <p className="text-2xs text-[--amber] line-clamp-1">
            {summary.issues[0]}
          </p>
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="pt-1 px-3 py-2 space-y-1.5">
          {data.providers.map(p => (
            <div key={p.source} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${statusDot(p.status)}`} />
                <span className="text-2xs font-medium text-[--text-primary]">
                  {SOURCE_LABELS[p.source] ?? p.source}
                </span>
              </div>
              <div className="flex items-center gap-2 text-2xs text-[--text-muted]">
                {p.lastUpdate && (
                  <span>{formatAge(Math.round((Date.now() - new Date(p.lastUpdate).getTime()) / 1000))}</span>
                )}
                {p.rateLimit && (
                  <span className="text-[--text-muted]/60">{p.rateLimit}</span>
                )}
                <span className={`font-medium ${
                  p.status === "live" ? "text-[--green]" :
                  p.status === "stale" ? "text-[--amber]" :
                  p.status === "error" ? "text-[--red]" : "text-[--text-muted]"
                }`}>
                  {p.status === "live" ? "Live" : p.status === "stale" ? "Stale" : p.status === "error" ? "Error" : "—"}
                </span>
              </div>
            </div>
          ))}

          {summary.issues.length > 0 && (
            <div className="pt-1 pt-1/50">
              {summary.issues.map((issue, i) => (
                <p key={i} className="text-2xs text-[--amber]">{issue}</p>
              ))}
            </div>
          )}

          <p className="text-2xs text-[--text-muted]/60 pt-0.5">
            Checked {new Date(data.checkedAt).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}
