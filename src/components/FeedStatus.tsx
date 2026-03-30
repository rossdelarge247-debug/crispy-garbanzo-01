"use client";

/**
 * DataFeedPanel — prominent data connectivity status at top of Mission Control.
 *
 * Shows: connection status per provider, data freshness, fallback status,
 * and impact warnings when feeds are down.
 */

import { useState, useEffect } from "react";

interface Provider {
  source: string;
  status: "live" | "stale" | "error" | "unknown";
  lastUpdate: string | null;
  rateLimit: string | null;
  role: string;
  impactIfDown: string;
  fallback: string | null;
}

interface FeedSummary {
  total: number;
  live: number;
  stale: number;
  error: number;
  warnings: string[];
}

interface FeedsResponse {
  summary: FeedSummary;
  providers: Provider[];
  checkedAt: string;
}

const SOURCE_LABELS: Record<string, string> = {
  polygon: "Polygon", gdelt: "GDELT", reddit: "Reddit", stocktwits: "StockTwits",
  "alternative.me": "Fear & Greed", alpha_vantage: "Alpha Vantage",
  forex_factory: "Forex Factory", anthropic: "Claude AI", newsapi: "NewsAPI",
};

function formatAge(iso: string | null): string {
  if (!iso) return "never";
  const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  return `${Math.round(sec / 3600)}h ago`;
}

function StatusDot({ status }: { status: string }) {
  const color = status === "live" ? "bg-[--green]" : status === "stale" ? "bg-[--amber]" : status === "error" ? "bg-[--red]" : "bg-[--text-muted]";
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color}`} />;
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
      <div className="rounded-lg bg-[--surface-raised] p-3">
        <div className="flex items-center gap-2 text-2xs text-[--text-muted]">
          <span className="w-1.5 h-1.5 rounded-full bg-[--text-muted] animate-pulse" />
          Checking data feeds...
        </div>
      </div>
    );
  }

  const summary = data?.summary;
  const providers = data?.providers ?? [];
  const hasIssues = (summary?.error ?? 0) > 0 || (summary?.stale ?? 0) > 0;
  const warnings = summary?.warnings ?? [];

  // Overall status
  const overallStatus = (summary?.error ?? 0) > 0 ? "error" : (summary?.stale ?? 0) > 0 ? "stale" : (summary?.live ?? 0) > 0 ? "live" : "unknown";
  const overallColor = overallStatus === "live" ? "text-[--green]" : overallStatus === "stale" ? "text-[--amber]" : overallStatus === "error" ? "text-[--red]" : "text-[--text-muted]";
  const overallLabel = overallStatus === "live" ? "All feeds connected" : overallStatus === "stale" ? "Some feeds stale" : overallStatus === "error" ? "Feed issues detected" : "No active feeds";

  return (
    <div className="rounded-lg bg-[--surface-raised] overflow-hidden">
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[--surface-overlay] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <StatusDot status={overallStatus} />
          <span className={`text-2xs font-semibold ${overallColor}`}>{overallLabel}</span>
          {summary && summary.total > 0 && (
            <span className="text-2xs text-[--text-muted]">
              {summary.live}/{summary.total} live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Mini provider dots */}
          <div className="flex gap-0.5">
            {providers.map(p => <StatusDot key={p.source} status={p.status} />)}
          </div>
          <span className="text-2xs text-[--text-muted]">{expanded ? "▴" : "▾"}</span>
        </div>
      </button>

      {/* Warnings — shown when collapsed and there are issues */}
      {!expanded && warnings.length > 0 && (
        <div className="px-3 pb-2">
          {warnings.slice(0, 2).map((w, i) => (
            <p key={i} className="text-2xs text-[--amber] leading-relaxed">{w}</p>
          ))}
        </div>
      )}

      {/* Expanded: full provider detail */}
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5">
          {providers.map(p => (
            <div key={p.source} className="flex items-start gap-2 py-1.5">
              <StatusDot status={p.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-semibold text-[--text-primary]">
                    {SOURCE_LABELS[p.source] ?? p.source}
                  </span>
                  <span className={`text-2xs font-medium ${
                    p.status === "live" ? "text-[--green]" : p.status === "stale" ? "text-[--amber]" : p.status === "error" ? "text-[--red]" : "text-[--text-muted]"
                  }`}>
                    {p.status === "live" ? "Connected" : p.status === "stale" ? "Stale" : p.status === "error" ? "Offline" : "—"}
                  </span>
                  {p.lastUpdate && (
                    <span className="text-2xs text-[--text-muted]">{formatAge(p.lastUpdate)}</span>
                  )}
                </div>
                <p className="text-2xs text-[--text-muted]">{p.role}</p>
                {p.status !== "live" && p.status !== "unknown" && (
                  <p className="text-2xs text-[--amber] mt-0.5">
                    {p.fallback ? `Using ${p.fallback} fallback. ` : ""}{p.impactIfDown}
                  </p>
                )}
                {p.rateLimit && (
                  <p className="text-2xs text-[--text-muted]">Rate limit: {p.rateLimit}</p>
                )}
              </div>
            </div>
          ))}

          {data?.checkedAt && (
            <p className="text-2xs text-[--text-muted] pt-1">
              Last checked {new Date(data.checkedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
