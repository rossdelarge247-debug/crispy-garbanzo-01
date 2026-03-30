"use client";

/**
 * DataFeedPanel — prominent data connectivity at top of Mission Control.
 * Shows per-provider status, failure reasons, fallback status, retry CTAs.
 */

import { useState, useEffect, useCallback } from "react";

interface Provider {
  source: string;
  status: "live" | "stale" | "error" | "unknown";
  lastUpdate: string | null;
  rateLimit: string | null;
  role: string;
  impactIfDown: string;
  fallback: string | null;
  feedCount: number;
  live: number;
  stale: number;
  error: number;
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
  forex_factory: "Calendar", anthropic: "Claude AI", newsapi: "NewsAPI",
  coingecko: "CoinGecko", rss: "RSS Feeds",
};

function formatAge(iso: string | null): string {
  if (!iso) return "never";
  const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${Math.round(sec / 3600)}h`;
}

function StatusDot({ status }: { status: string }) {
  const color = status === "live" ? "bg-[--green]" : status === "stale" ? "bg-[--amber]" : status === "error" ? "bg-[--red]" : "bg-[--text-muted]";
  return <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />;
}

function StatusLabel({ status }: { status: string }) {
  const color = status === "live" ? "text-[--green]" : status === "stale" ? "text-[--amber]" : status === "error" ? "text-[--red]" : "text-[--text-muted]";
  const label = status === "live" ? "Connected" : status === "stale" ? "Stale" : status === "error" ? "Offline" : "Unknown";
  return <span className={`micro font-semibold ${color}`}>{label}</span>;
}

export default function FeedStatus() {
  const [data, setData] = useState<FeedsResponse | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchFeeds = useCallback(async () => {
    try {
      const res = await fetch("/api/feeds");
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchFeeds(); }, [fetchFeeds]);

  async function handleRetry(source: string) {
    setRetrying(source);
    // Re-fetch the main mission control data to trigger provider reconnection
    await fetch("/api/mission-control").catch(() => {});
    // Then refresh feed status
    await fetchFeeds();
    setRetrying(null);
  }

  if (loading) {
    return (
      <div className="card p-3">
        <div className="flex items-center gap-2 caption text-[--text-muted]">
          <span className="w-2 h-2 rounded-full bg-[--text-muted] animate-pulse" />
          Checking data feeds...
        </div>
      </div>
    );
  }

  const summary = data?.summary;
  const providers = data?.providers ?? [];
  const overallStatus = (summary?.error ?? 0) > 0 ? "error" : (summary?.stale ?? 0) > 0 ? "stale" : (summary?.live ?? 0) > 0 ? "live" : "unknown";
  const warnings = summary?.warnings ?? [];

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[--surface-hover] transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <StatusDot status={overallStatus} />
          <span className="caption font-medium text-[--text]">Data feeds</span>
          <span className="micro text-[--text-muted]">
            {summary && summary.total > 0
              ? `${summary.live} connected${(summary?.stale ?? 0) > 0 ? ` · ${summary.stale} stale` : ""}${(summary?.error ?? 0) > 0 ? ` · ${summary.error} offline` : ""}`
              : "Feeds activate when you open an event"
            }
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {providers.map(p => <StatusDot key={p.source} status={p.status} />)}
          <span className="micro text-[--text-muted] ml-1">{expanded ? "▴" : "▾"}</span>
        </div>
      </button>

      {/* Collapsed warnings */}
      {!expanded && warnings.length > 0 && (
        <div className="px-4 pb-3 -mt-1">
          {warnings.slice(0, 1).map((w, i) => (
            <p key={i} className="micro text-[--amber]">{w}</p>
          ))}
        </div>
      )}

      {/* Expanded: full provider detail */}
      {expanded && (
        <div className="px-4 pb-4">
          <div className="space-y-0">
            {providers.map(p => (
              <div key={p.source} className="py-3" style={{ borderTop: "1px solid var(--surface-overlay)" }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <StatusDot status={p.status} />
                    <span className="caption font-semibold text-[--text]">{SOURCE_LABELS[p.source] ?? p.source}</span>
                    <StatusLabel status={p.status} />
                  </div>
                  <div className="flex items-center gap-2">
                    {p.lastUpdate && (
                      <span className="micro text-[--text-muted]">{formatAge(p.lastUpdate)} ago</span>
                    )}
                    {p.status !== "live" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRetry(p.source); }}
                        disabled={retrying === p.source}
                        className="micro font-semibold text-[--accent] hover:underline disabled:opacity-50"
                      >
                        {retrying === p.source ? "Retrying..." : "Retry"}
                      </button>
                    )}
                  </div>
                </div>

                <p className="micro text-[--text-muted] mb-0.5">{p.role}</p>

                {/* Status detail */}
                {p.status === "live" && (
                  <p className="micro text-[--green]">
                    {p.live}/{p.feedCount} feeds active
                    {p.rateLimit && <span className="text-[--text-muted]"> · {p.rateLimit}</span>}
                  </p>
                )}

                {p.status === "stale" && (
                  <div className="micro">
                    <p className="text-[--amber]">Data is outdated — last successful pull was {formatAge(p.lastUpdate)} ago</p>
                    {p.fallback && <p className="text-[--text-muted]">Fallback: {p.fallback}</p>}
                    <p className="text-[--text-muted]">Impact: {p.impactIfDown}</p>
                  </div>
                )}

                {p.status === "error" && (
                  <div className="micro">
                    <p className="text-[--red]">Connection failed — unable to reach this provider</p>
                    {p.fallback && <p className="text-[--amber]">Using fallback: {p.fallback}</p>}
                    <p className="text-[--text-muted]">Impact: {p.impactIfDown}</p>
                  </div>
                )}

                {p.status === "unknown" && (
                  <p className="micro text-[--text-muted]">Not yet attempted — will connect on next data refresh</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 micro text-[--text-muted]" style={{ borderTop: "1px solid var(--surface-overlay)" }}>
            <span>Last checked {data?.checkedAt ? new Date(data.checkedAt).toLocaleTimeString() : "—"}</span>
            <button onClick={fetchFeeds} className="text-[--accent] font-semibold">Refresh all</button>
          </div>
        </div>
      )}
    </div>
  );
}
