"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadPreferences } from "@/lib/preferences";
import { getSessionInfo, type SessionInfo } from "@/lib/session";
import { generateDailyTasks, type DailyTask } from "@/lib/tasks";
import type { MarketFlag, EconomicEvent } from "@/types";

interface BriefingSuggestion {
  flag: MarketFlag;
  hypothesisCount: number;
  topHypothesis: string | null;
  topHypothesisDirection: string | null;
  testsPassed: number;
  testsTotal: number;
  verdict: "explore" | "monitor" | "wait";
  verdictReason: string;
}

interface BriefingData {
  suggestions: BriefingSuggestion[];
  events: EconomicEvent[];
  dataSource: string;
  generatedAt: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const priorityBorderClass: Record<string, string> = {
  high: "border-l-2 border-l-accent",
  medium: "border-l-2 border-l-conviction-medium",
  low: "",
};

const priorityBadgeClass: Record<string, string> = {
  high: "bg-accent/15 text-accent",
  medium: "bg-conviction-medium/15 text-conviction-medium",
  low: "bg-surface-border/30 text-text-muted",
};

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prefs = loadPreferences();
    if (!prefs.onboarded) {
      router.replace("/onboarding");
      return;
    }

    const sessionInfo = getSessionInfo();
    setSession(sessionInfo);

    const focusSymbols = prefs.focusAssets.map((a) => a.symbol).join(",");
    const url = `/api/briefing${focusSymbols ? `?focusAssets=${encodeURIComponent(focusSymbols)}` : ""}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Briefing fetch failed");
        return res.json();
      })
      .then((data: BriefingData) => {
        setBriefing(data);

        const flags = data.suggestions.map((s) => s.flag);
        const verdicts: Record<string, "explore" | "monitor" | "wait"> = {};
        for (const s of data.suggestions) {
          verdicts[s.flag.id] = s.verdict;
        }
        const generatedTasks = generateDailyTasks(flags, data.events, verdicts);
        setTasks(generatedTasks);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[dashboard] Briefing error:", err);
        setError("Failed to load your briefing. Please try again.");
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-3xl animate-pulse">📡</div>
          <p className="text-sm text-text-secondary">Loading your briefing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-3xl">⚠️</div>
          <p className="text-sm text-text-secondary">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-accent hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const highCount = tasks.filter((t) => t.priority === "high").length;

  const monitorSuggestions =
    briefing?.suggestions.filter((s) => s.verdict === "monitor") ?? [];

  return (
    <div className="space-y-8">
      {/* ================================================================
          HEADER
          ================================================================ */}
      <header className="space-y-1">
        <p className="text-2xl font-bold tracking-tight">
          {session?.emoji} {getGreeting()}
        </p>
        <h1 className="text-lg font-semibold text-text-primary">
          Your tasks for today
        </h1>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{formatDate()}</span>
          <span className="w-1 h-1 rounded-full bg-surface-border" />
          <span>{session?.label}</span>
        </div>
        {tasks.length > 0 && (
          <p className="text-sm text-text-secondary mt-1">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
            {highCount > 0 && (
              <span className="text-accent">
                {" "}
                &middot; {highCount} high priority
              </span>
            )}
          </p>
        )}
      </header>

      {/* ================================================================
          TASK LIST
          ================================================================ */}
      {tasks.length === 0 ? (
        <div className="bg-surface-raised rounded-xl border border-surface-border p-8 text-center">
          <p className="text-2xl mb-2">☕</p>
          <p className="text-sm text-text-secondary">
            No tasks right now. Daddy is watching the markets — you&apos;ll be
            notified when something comes up.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={task.actionUrl}
              className={`block bg-surface-raised rounded-xl border border-surface-border p-4 hover:border-accent/30 transition-colors ${priorityBorderClass[task.priority]}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">
                  {task.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary text-sm">
                    {task.title}
                  </p>
                  <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">
                    {task.subtitle}
                  </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${priorityBadgeClass[task.priority]}`}
                  >
                    {task.priority}
                  </span>
                  <span className="text-xs font-medium text-accent whitespace-nowrap">
                    {task.action} &rarr;
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ================================================================
          KEY EVENTS
          ================================================================ */}
      {briefing && briefing.events.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Upcoming events
          </h2>
          <div className="bg-surface-raised rounded-xl border border-surface-border divide-y divide-surface-border">
            {briefing.events.map((event) => (
              <div key={event.id} className="px-4 py-3 flex items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    event.impact === "high"
                      ? "bg-accent"
                      : event.impact === "medium"
                        ? "bg-conviction-medium"
                        : "bg-surface-border"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">
                    {event.title}
                  </p>
                  <p className="text-xs text-text-muted">
                    {event.country} &middot;{" "}
                    {formatTime(event.date)}
                    {event.forecast && ` &middot; Forecast: ${event.forecast}`}
                  </p>
                </div>
                <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                  {event.impact}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================================================================
          ACTIVE WATCHLIST
          ================================================================ */}
      {monitorSuggestions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Active watchlist
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {monitorSuggestions.map((s) => (
              <Link
                key={s.flag.id}
                href={`/flags/${s.flag.id}`}
                className="bg-surface-raised rounded-xl border border-surface-border p-4 hover:border-accent/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-text-muted">
                    {s.flag.affectedAssets[0]?.symbol ?? "Market"}
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-conviction-medium/15 text-conviction-medium">
                    monitor
                  </span>
                </div>
                <p className="text-sm font-semibold text-text-primary line-clamp-1">
                  {s.flag.title}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {s.verdictReason}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ================================================================
          FOOTER
          ================================================================ */}
      <footer className="flex items-center justify-between text-xs text-text-muted pt-4 border-t border-surface-border">
        <span>
          Data from {briefing?.dataSource ?? "demo"} sources &middot; Updated{" "}
          {briefing?.generatedAt
            ? formatTime(briefing.generatedAt)
            : "just now"}
        </span>
        <Link
          href="/preferences"
          className="text-accent hover:underline"
        >
          Edit focus universe
        </Link>
      </footer>
    </div>
  );
}
