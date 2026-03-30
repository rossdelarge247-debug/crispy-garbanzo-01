"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { MacroEvent } from "@/types/macro-trader";
import { formatCurrencyPrice, getCurrencySymbol } from "@/lib/currency";
import FeedStatus from "@/components/FeedStatus";

interface CalendarData {
  events: MacroEvent[];
  aiBrief: { headline: string; detail: string };
  dataSource: string;
  updatedAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  central_bank: "Central Bank", inflation: "Inflation", employment: "Employment",
  growth: "Growth", trade: "Trade", sentiment: "Sentiment", energy: "Energy", other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  central_bank: "var(--accent)", inflation: "var(--red)", employment: "var(--green)",
  growth: "var(--green)", energy: "var(--amber)", other: "var(--text-muted)",
};

const RANGES = [
  { label: "This week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "This month", days: 30 },
];

/* ================================================================ */

function EventCard({ event }: { event: MacroEvent }) {
  const trade = event.topTrade;
  const cur = trade ? getCurrencySymbol(trade.asset) : "$";
  const isToday = event.dayLabel.includes("Today");
  const isTomorrow = event.dayLabel.includes("Tomorrow");

  return (
    <Link href={`/event/${event.id}`} className="card-hover block">
      {/* Day + time + impact */}
      <div className="flex items-center gap-2 mb-2">
        <span className="pill" style={{
          background: isToday ? "var(--accent-soft)" : "var(--surface-hover)",
          color: isToday ? "var(--accent)" : isTomorrow ? "var(--text-secondary)" : "var(--text-muted)",
        }}>
          {event.dayLabel}
        </span>
        <span className="micro">{event.timeLabel}</span>
        <span className="pill" style={{
          background: "transparent", fontSize: 9,
          border: `1px solid ${CATEGORY_COLORS[event.category] ?? "var(--text-muted)"}`,
          color: CATEGORY_COLORS[event.category] ?? "var(--text-muted)",
        }}>
          {CATEGORY_LABELS[event.category] ?? event.category}
        </span>
        <span className="micro ml-auto">{event.country}</span>
      </div>

      {/* Event title */}
      <p className="text-base font-medium mb-1" style={{ color: "var(--text)" }}>{event.title}</p>

      {/* Forecast vs previous */}
      {(event.forecast || event.previous) && (
        <div className="flex gap-4 mb-2">
          {event.forecast && <span className="caption">Forecast: <span style={{ color: "var(--text)" }}>{event.forecast}</span></span>}
          {event.previous && <span className="caption">Previous: <span style={{ color: "var(--text-muted)" }}>{event.previous}</span></span>}
        </div>
      )}

      {/* Top trade recommendation */}
      {trade && (
        <div className="rounded-lg py-3 px-3 mt-2" style={{ background: "var(--surface-hover)" }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="pill" style={{
                background: trade.direction === "long" ? "var(--green-soft)" : "var(--red-soft)",
                color: trade.direction === "long" ? "var(--green)" : "var(--red)",
              }}>
                {trade.direction === "long" ? "Long" : "Short"} {trade.assetName}
              </span>
              <span className="micro">{trade.riskReward}:1 R:R</span>
            </div>
            <span className="stat-medium" style={{ color: event.conviction >= 70 ? "var(--green)" : event.conviction >= 55 ? "var(--amber)" : "var(--text-muted)" }}>
              {event.conviction}%
            </span>
          </div>
          <p className="caption mb-2">{trade.thesis}</p>
          <div className="flex gap-3 micro">
            <span>Stop: <span style={{ color: "var(--red)" }}>{trade.stopLossPercent}%</span></span>
            <span>Target: <span style={{ color: "var(--green)" }}>{trade.takeProfitPercent}%</span></span>
            <span>{trade.leverage}x leverage</span>
            <span className="ml-auto">£{trade.tradeAmount} → <span style={{ color: "var(--green)" }}>+{cur}{trade.expectedReturn > 0 ? (trade.tradeAmount * trade.leverage * trade.takeProfitPercent / 100).toFixed(0) : "0"}</span></span>
          </div>
        </div>
      )}

      {/* No trade */}
      {!trade && event.affectedAssets.length > 0 && (
        <div className="flex gap-2 mt-2">
          {event.affectedAssets.slice(0, 3).map((a, i) => (
            <span key={i} className="pill" style={{ background: "var(--surface-hover)", color: "var(--text-muted)" }}>
              {a.name}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

/* Skeleton */
function Loading() {
  const [step, setStep] = useState(0);
  const steps = ["Loading calendar", "Enriching events", "Ranking opportunities"];
  useEffect(() => { const t = setInterval(() => setStep(s => (s + 1) % steps.length), 2000); return () => clearInterval(t); }, [steps.length]);

  return (
    <div className="space-y-4">
      <p className="caption">{steps[step]}...</p>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="card space-y-3">
          <div className="flex gap-2"><div className="h-5 w-24 rounded-lg skeleton" /><div className="h-5 w-16 rounded-lg skeleton" /></div>
          <div className="h-5 w-3/4 rounded-lg skeleton" />
          <div className="h-16 rounded-lg skeleton" />
        </div>
      ))}
    </div>
  );
}

/* Session line */
function SessionLine() {
  const now = new Date();
  const h = now.getUTCHours();
  const isOpen = h >= 8 && h < 21;
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <p className="caption flex items-center gap-2 mt-1">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: isOpen ? "var(--green)" : "var(--text-muted)" }} />
      <span>United Kingdom · {timeStr} · {isOpen ? "Markets open" : "Markets closed"}</span>
    </p>
  );
}

/* ================================================================
   Dashboard
   ================================================================ */

export default function MacroDashboard() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(7);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/macro-calendar?days=${range}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch { setData(null); }
    setLoading(false);
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group events by day
  const eventsByDay: Record<string, MacroEvent[]> = {};
  for (const e of data?.events ?? []) {
    const day = e.dayLabel.replace(/ \(.*\)/, ""); // "Wednesday" not "Wednesday (Today)"
    const key = `${new Date(e.date).toISOString().split("T")[0]}-${day}`;
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(e);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Welcome, Guest</h1>
          <SessionLine />
        </div>
        <div className="flex items-center gap-3">
          <Link href="/journal" className="micro" style={{ color: "var(--text-muted)" }}>Journal</Link>
          <button disabled className="pill" style={{ background: "var(--surface)", color: "var(--text-muted)", opacity: 0.6, cursor: "not-allowed" }}>Sign up</button>
        </div>
      </div>

      <FeedStatus />

      {/* Range toggle */}
      <div className="flex gap-1">
        {RANGES.map(r => (
          <button key={r.days} onClick={() => setRange(r.days)} className="pill transition-colors" style={{
            background: range === r.days ? "var(--accent)" : "var(--surface-hover)",
            color: range === r.days ? "white" : "var(--text-muted)",
          }}>
            {r.label}
          </button>
        ))}
      </div>

      {loading && <Loading />}

      {!loading && data && (
        <div className="space-y-6">
          {/* Brief */}
          <div className="card">
            <p className="section-label mb-2" style={{ color: "var(--accent)" }}>Market brief</p>
            <p className="text-base font-medium" style={{ color: "var(--text)" }}>{data.aiBrief.headline}</p>
            <p className="caption mt-1">{data.aiBrief.detail}</p>
          </div>

          {/* Events by day */}
          {Object.entries(eventsByDay).map(([key, events]) => {
            const dayLabel = events[0]?.dayLabel ?? "";
            const dateStr = key.split("-")[0];
            const isToday = dayLabel.includes("Today");

            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-3">
                  <p className="section-label">{dayLabel}</p>
                  <span className="micro" style={{ color: "var(--text-muted)" }}>{dateStr}</span>
                  {isToday && <span className="pill" style={{ background: "var(--accent-soft)", color: "var(--accent)", fontSize: 9, padding: "2px 6px" }}>Active</span>}
                  <span className="micro ml-auto">{events.length} {events.length === 1 ? "event" : "events"}</span>
                </div>
                <div className="space-y-3">
                  {events.map(e => <EventCard key={e.id} event={e} />)}
                </div>
              </div>
            );
          })}

          {(data.events?.length ?? 0) === 0 && (
            <div className="card text-center py-8">
              <p className="body-text">No events in this period.</p>
              <p className="caption mt-1">Try extending the range.</p>
            </div>
          )}

          <div className="flex items-center justify-between caption pt-4" style={{ borderTop: "1px solid var(--surface)" }}>
            <span>{data.dataSource} · {new Date(data.updatedAt).toLocaleTimeString()}</span>
            <Link href="/settings" style={{ color: "var(--accent)" }}>Settings</Link>
          </div>
        </div>
      )}
    </div>
  );
}
