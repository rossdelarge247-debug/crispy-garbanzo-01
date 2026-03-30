"use client";

/**
 * Macro & News — economic calendar + filtered news for the watchlist.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MissionControlData } from "@/types/mission-control";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function timeUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return "passed";
  const hours = ms / (1000 * 3600);
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

export default function MacroPage() {
  const [data, setData] = useState<MissionControlData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mission-control")
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  // Collect all events across instruments + calendar highlights
  const allEvents = data?.calendarHighlights ?? [];

  // Collect instrument-specific events
  const instrumentEvents = data?.instruments.flatMap(inst =>
    inst.regime.upcomingEvents.map(e => ({ ...e, instrument: inst.name, symbol: inst.symbol }))
  ) ?? [];

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-light text-[--text] tracking-tight">Macro & News</h1>
        <Link href="/dashboard" className="text-xs text-[--text-muted]">&larr; Dashboard</Link>
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-12 card rounded-lg animate-pulse" />)}
        </div>
      )}

      {!loading && data && (
        <div className="space-y-5">
          {/* AI Brief */}
          {data.aiBrief.headline && (
            <div className="rounded-lg card p-3">
              <p className="text-2xs font-semibold text-[--text-muted] mb-1">Market brief</p>
              <p className="text-sm text-[--text] font-medium">{data.aiBrief.headline}</p>
              {data.aiBrief.detail && <p className="text-xs text-[--text-secondary] mt-1">{data.aiBrief.detail}</p>}
            </div>
          )}

          {/* Calendar */}
          <div>
            <p className="text-xs font-semibold text-[--text-muted] mb-2">Economic calendar</p>
            {allEvents.length > 0 ? (
              <div className="space-y-1">
                {allEvents.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg card p-2.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${e.impact === "high" ? "bg-[--accent]" : "bg-[--text-muted]"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[--text]">{e.title}</p>
                      <p className="text-2xs text-[--text-muted]">{e.country} · {formatDate(e.date)} {formatTime(e.date)}</p>
                    </div>
                    <span className={`text-2xs font-bold shrink-0 ${e.impact === "high" ? "text-[--accent]" : "text-[--text-muted]"}`}>
                      {timeUntil(e.date)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[--text-muted]">No upcoming events</p>
            )}
          </div>

          {/* Events by instrument */}
          {instrumentEvents.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[--text-muted] mb-2">Events affecting your watchlist</p>
              <div className="space-y-1">
                {instrumentEvents.map((e, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg card p-2.5 text-xs">
                    <div>
                      <span className="font-medium text-[--text]">{e.title}</span>
                      <span className="text-[--text-muted] ml-2">{e.impact}</span>
                    </div>
                    <span className="text-[--accent] font-medium">{e.instrument}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regime summary per instrument */}
          <div>
            <p className="text-xs font-semibold text-[--text-muted] mb-2">Regime summary</p>
            <div className="space-y-1">
              {data.instruments.map(inst => (
                <div key={inst.symbol} className="flex items-center justify-between rounded-lg card p-2.5 text-xs">
                  <span className="font-medium text-[--text]">{inst.name}</span>
                  <span className="text-[--text-secondary]">{inst.regime.regimeSummary}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
