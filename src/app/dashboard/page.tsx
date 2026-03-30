"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { MacroEvent } from "@/types/macro-trader";
import { getCurrencySymbol } from "@/lib/currency";
import FeedStatus from "@/components/FeedStatus";

interface CalendarData {
  events: MacroEvent[];
  aiBrief: { headline: string; detail: string };
  dataSource: string;
  updatedAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  central_bank: "var(--accent)", inflation: "var(--red)", employment: "var(--green)",
  growth: "var(--green)", energy: "var(--amber)", other: "var(--text-muted)",
};

const CATEGORY_LABELS: Record<string, string> = {
  central_bank: "Central Bank", inflation: "Inflation", employment: "Employment",
  growth: "Growth", energy: "Energy", sentiment: "Sentiment", trade: "Trade", other: "Other",
};

/* ================================================================
   Event card — flat, no box-in-box
   ================================================================ */

function EventCard({ event }: { event: MacroEvent }) {
  const trade = event.topTrade;

  return (
    <Link href={`/event/${event.id}`} className="block py-4 hover:bg-[--surface-hover] -mx-4 px-4 transition-colors" style={{ borderRadius: "var(--radius)" }}>
      {/* Time + category + country */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="micro font-semibold" style={{ color: "var(--text)" }}>{event.timeLabel}</span>
        <span className="pill" style={{
          background: "transparent", fontSize: 9,
          border: `1px solid ${CATEGORY_COLORS[event.category] ?? "var(--text-muted)"}`,
          color: CATEGORY_COLORS[event.category] ?? "var(--text-muted)",
        }}>
          {CATEGORY_LABELS[event.category] ?? event.category}
        </span>
        <span className="micro" style={{ color: "var(--text-muted)" }}>{event.country}</span>
        {event.impact === "high" && <span className="pill" style={{ background: "var(--red-soft)", color: "var(--red)", fontSize: 9 }}>High impact</span>}
        {event.conviction >= 50 && (
          <span className="micro font-semibold ml-auto" style={{ color: event.conviction >= 70 ? "var(--green)" : "var(--amber)" }}
            title="Trade conviction: based on historical pattern reliability, event predictability, and consensus clarity">
            {event.conviction}% conviction
          </span>
        )}
      </div>

      {/* Title + AI summary */}
      <p className="text-base font-medium mb-1" style={{ color: "var(--text)" }}>{event.title}</p>
      {trade && (
        <p className="caption mb-2" style={{ color: "var(--text-secondary)" }}>
          {trade.thesis}
        </p>
      )}

      {/* Forecast vs previous */}
      {(event.forecast || event.previous) && (
        <div className="flex gap-4 mb-1 micro">
          {event.forecast && <span>Forecast: <span style={{ color: "var(--text)" }}>{event.forecast}</span></span>}
          {event.previous && <span>Previous: <span style={{ color: "var(--text-muted)" }}>{event.previous}</span></span>}
        </div>
      )}

      {/* Market expectations + sentiment */}
      {event.marketExpectation && (
        <p className="micro leading-relaxed mb-1" style={{ color: "var(--text-muted)" }}>{event.marketExpectation}</p>
      )}
      {event.sentimentContext && (
        <p className="micro leading-relaxed mb-2" style={{ color: "var(--text-muted)", fontStyle: "italic" }}>{event.sentimentContext}</p>
      )}

      {/* Asset opportunities — flat list with thin dividers */}
      {event.affectedAssets.length > 0 && (
        <div>
          {event.affectedAssets.map((a, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5" style={{ borderTop: i > 0 ? "1px solid var(--surface-hover)" : "none" }}>
              <span className="pill" style={{
                background: a.direction === "long" ? "var(--green-soft)" : "var(--red-soft)",
                color: a.direction === "long" ? "var(--green)" : "var(--red)",
              }}>
                {a.direction === "long" ? "↑" : "↓"} {a.name}
              </span>
              <span className="micro flex-1" style={{ color: "var(--text-muted)" }}>{a.reasoning}</span>
              {i === 0 && trade && (
                <span className="micro" style={{ color: "var(--text-muted)" }}>{trade.riskReward}:1 R:R · {trade.leverage}x</span>
              )}
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}

/* ================================================================
   Skeleton
   ================================================================ */

function Loading() {
  const [step, setStep] = useState(0);
  const steps = ["Loading economic calendar", "Enriching events with trade opportunities", "Ranking by conviction"];
  useEffect(() => { const t = setInterval(() => setStep(s => (s + 1) % steps.length), 2200); return () => clearInterval(t); }, [steps.length]);

  return (
    <div className="space-y-4">
      <p className="caption">{steps[step]}...</p>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="py-4 space-y-2">
          <div className="flex gap-2"><div className="h-4 w-16 rounded skeleton" /><div className="h-4 w-20 rounded skeleton" /></div>
          <div className="h-5 w-3/4 rounded skeleton" />
          <div className="h-4 w-full rounded skeleton" />
          <div className="h-4 w-1/2 rounded skeleton" />
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   Session line
   ================================================================ */

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
   Group events into This Week / Next Week with day sections
   ================================================================ */

interface DayGroup { dayLabel: string; dateStr: string; isToday: boolean; isTomorrow: boolean; events: MacroEvent[]; }
interface WeekGroup { label: string; days: DayGroup[]; }

function groupIntoWeeks(events: MacroEvent[]): WeekGroup[] {
  const now = new Date();
  const todayDate = now.toISOString().split("T")[0];
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Get start of this week (Monday)
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  thisMonday.setHours(0, 0, 0, 0);

  const nextMonday = new Date(thisMonday);
  nextMonday.setDate(thisMonday.getDate() + 7);

  // Group by day
  const byDay: Record<string, MacroEvent[]> = {};
  for (const e of events) {
    const dateStr = new Date(e.date).toISOString().split("T")[0];
    if (!byDay[dateStr]) byDay[dateStr] = [];
    byDay[dateStr].push(e);
  }

  function makeDayGroup(dateStr: string, events: MacroEvent[]): DayGroup {
    const d = new Date(dateStr + "T12:00:00Z");
    const dayName = DAYS[d.getDay()];
    const isToday = dateStr === todayDate;
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = dateStr === tomorrow.toISOString().split("T")[0];

    let dayLabel = dayName;
    if (isToday) dayLabel = "Today";
    else if (isTomorrow) dayLabel = "Tomorrow";

    return { dayLabel, dateStr, isToday, isTomorrow, events };
  }

  const thisWeekDays: DayGroup[] = [];
  const nextWeekDays: DayGroup[] = [];
  const laterDays: DayGroup[] = [];

  for (const [dateStr, dayEvents] of Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b))) {
    const d = new Date(dateStr + "T12:00:00Z");
    const group = makeDayGroup(dateStr, dayEvents);

    if (d < nextMonday) thisWeekDays.push(group);
    else if (d < new Date(nextMonday.getTime() + 7 * 24 * 3600 * 1000)) nextWeekDays.push(group);
    else laterDays.push(group);
  }

  const weeks: WeekGroup[] = [];
  if (thisWeekDays.length > 0) weeks.push({ label: "This week", days: thisWeekDays });
  if (nextWeekDays.length > 0) weeks.push({ label: "Next week", days: nextWeekDays });
  if (laterDays.length > 0) weeks.push({ label: "Later", days: laterDays });

  return weeks;
}

/* ================================================================
   Dashboard
   ================================================================ */

export default function MacroDashboard() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/macro-calendar?days=14");
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch { setData(null); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const weeks = data ? groupIntoWeeks(data.events) : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Welcome, Guest</h1>
          <SessionLine />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Link href="/journal" className="micro" style={{ color: "var(--text-muted)" }}>Journal</Link>
          <button disabled className="pill" style={{ background: "var(--surface)", color: "var(--text-muted)", opacity: 0.6, cursor: "not-allowed" }}>Sign up</button>
        </div>
      </div>

      <FeedStatus />

      {loading && <Loading />}

      {!loading && data && (
        <div className="space-y-8">
          {/* Market brief */}
          <div className="card">
            <p className="section-label mb-2" style={{ color: "var(--accent)" }}>Market brief</p>
            <p className="text-base font-medium leading-relaxed mb-2" style={{ color: "var(--text)" }}>{data.aiBrief.headline}</p>
            <p className="body-text">{data.aiBrief.detail}</p>
          </div>

          {/* Events grouped by week then day */}
          {weeks.map(week => (
            <div key={week.label}>
              {/* Week divider */}
              <div className="flex items-center gap-3 mb-4">
                <span className="section-label">{week.label}</span>
                <div className="flex-1 h-px" style={{ background: "var(--surface-hover)" }} />
              </div>

              <div className="space-y-6">
                {week.days.map(day => (
                  <div key={day.dateStr}>
                    {/* Day header */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold" style={{ color: day.isToday ? "var(--accent)" : "var(--text)" }}>
                        {day.dayLabel}
                      </span>
                      <span className="micro" style={{ color: "var(--text-muted)" }}>
                        {new Date(day.dateStr + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                      {day.isToday && <span className="pill" style={{ background: "var(--accent-soft)", color: "var(--accent)", fontSize: 9, padding: "2px 6px" }}>Live</span>}
                      <span className="micro ml-auto" style={{ color: "var(--text-muted)" }}>
                        {day.events.length} {day.events.length === 1 ? "event" : "events"}
                      </span>
                    </div>

                    {/* Events for this day */}
                    <div className="divide-y" style={{ borderColor: "var(--surface-hover)" }}>
                      {day.events.map(e => <EventCard key={e.id} event={e} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {weeks.length === 0 && (
            <div className="card text-center py-8">
              <p className="body-text">No upcoming events.</p>
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
