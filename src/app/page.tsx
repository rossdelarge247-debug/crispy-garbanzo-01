"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadPreferences } from "@/lib/preferences";
import { getSessionInfo, type SessionInfo } from "@/lib/session";
import type { MarketFlag, EconomicEvent } from "@/types";
import ConvictionBadge from "@/components/ConvictionBadge";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";

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
  dataSource: "live" | "mock";
  generatedAt: string;
}

function verdictStyle(verdict: "explore" | "monitor" | "wait") {
  switch (verdict) {
    case "explore": return "bg-conviction-high/15 text-conviction-high border-conviction-high/20";
    case "monitor": return "bg-conviction-medium/15 text-conviction-medium border-conviction-medium/20";
    case "wait": return "bg-surface-overlay text-text-muted border-surface-border";
  }
}

function verdictLabel(verdict: "explore" | "monitor" | "wait") {
  switch (verdict) {
    case "explore": return "Ready to explore";
    case "monitor": return "Keep watching";
    case "wait": return "Not yet";
  }
}

function dirIcon(dir: string | null) {
  if (dir === "long") return "↑";
  if (dir === "short") return "↓";
  return "→";
}

function dirColor(dir: string | null) {
  if (dir === "long") return "text-conviction-high";
  if (dir === "short") return "text-conviction-danger";
  return "text-text-muted";
}

export default function DailyBriefingPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prefs = loadPreferences();
    if (!prefs.onboarded) {
      router.push("/onboarding");
      return;
    }

    setSession(getSessionInfo());

    // Refresh session info every minute
    const interval = setInterval(() => setSession(getSessionInfo()), 60000);

    // Fetch briefing
    const focusSymbols = prefs.focusAssets.map(a => a.symbol).join(",");
    fetch(`/api/briefing?focusAssets=${encodeURIComponent(focusSymbols)}`)
      .then(res => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then(data => {
        setBriefing(data);
        setLoading(false);
      })
      .catch(err => {
        setError(String(err));
        setLoading(false);
      });

    return () => clearInterval(interval);
  }, [router]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <div className="h-8 w-64 bg-surface-overlay rounded-lg mb-2 skeleton" />
          <div className="h-5 w-48 bg-surface-overlay rounded-lg skeleton" />
        </div>
        <LoadingState
          title="Preparing your daily briefing..."
          subtitle="Scanning markets, news, and sentiment for your focus universe"
        />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Couldn't load your briefing" description={error} onRetry={() => window.location.reload()} />;
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const exploreSuggestions = briefing?.suggestions.filter(s => s.verdict === "explore") || [];
  const monitorSuggestions = briefing?.suggestions.filter(s => s.verdict === "monitor") || [];
  const waitSuggestions = briefing?.suggestions.filter(s => s.verdict === "wait") || [];

  return (
    <div className="animate-fade-in">
      {/* ================================================================
          HEADER — Session-aware greeting
          ================================================================ */}
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          {session && (
            <span className="text-sm">{session.emoji}</span>
          )}
          <span className="text-xs font-medium text-text-muted">
            {session?.label}
          </span>
          {briefing?.dataSource === "live" && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-lg bg-conviction-high/15 text-conviction-high">
              Live
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-1">
          Your daily briefing
        </h1>
        <p className="text-sm text-text-secondary">
          {today} · {session?.description}
        </p>
      </header>

      {/* ================================================================
          SESSION CONTEXT — What's happening right now
          ================================================================ */}
      {session && (
        <div className="bg-surface-raised rounded-xl border border-surface-border p-4 mb-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-text-muted">{session.nextEvent}</span>
          </div>
          <Link
            href="/settings"
            className="text-xs font-medium text-accent hover:text-accent-glow transition-colors"
          >
            Edit focus →
          </Link>
        </div>
      )}

      {/* ================================================================
          DAILY TRADE SUGGESTIONS — The main event
          ================================================================ */}
      {exploreSuggestions.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Today&apos;s suggestions</h2>
            <span className="text-xs text-text-muted">Trade Daddy thinks these are worth your time</span>
          </div>
          <div className="space-y-3">
            {exploreSuggestions.map(s => (
              <SuggestionCard key={s.flag.id} suggestion={s} featured />
            ))}
          </div>
        </section>
      )}

      {/* ================================================================
          WATCHLIST — Developing situations
          ================================================================ */}
      {monitorSuggestions.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-text-primary">On the watchlist</h2>
            <span className="text-xs text-text-muted">Not ready yet, but worth monitoring</span>
          </div>
          <div className="space-y-2">
            {monitorSuggestions.map(s => (
              <SuggestionCard key={s.flag.id} suggestion={s} />
            ))}
          </div>
        </section>
      )}

      {/* ================================================================
          KEY EVENTS — Calendar items
          ================================================================ */}
      {briefing && briefing.events.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Key events coming up</h2>
          </div>
          <div className="bg-surface-raised rounded-xl border border-surface-border overflow-hidden">
            {briefing.events.map((event, i) => (
              <div key={event.id} className={`flex items-center gap-3 px-4 py-3 ${i < briefing.events.length - 1 ? "border-b border-surface-border" : ""}`}>
                <span className="text-xs font-mono text-text-muted w-12 shrink-0">
                  {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <span className="text-sm font-medium text-text-primary flex-1 min-w-0 truncate">{event.title}</span>
                <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-lg ${
                  event.impact === "high" ? "bg-conviction-danger/15 text-conviction-danger" :
                  event.impact === "medium" ? "bg-conviction-medium/15 text-conviction-medium" :
                  "bg-surface-overlay text-text-muted"
                }`}>{event.impact}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================================================================
          DEVELOPING — Not ready but showing early signals
          ================================================================ */}
      {waitSuggestions.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Developing</h2>
            <span className="text-xs text-text-muted">Early signals — not actionable yet</span>
          </div>
          <div className="space-y-2">
            {waitSuggestions.map(s => (
              <SuggestionCard key={s.flag.id} suggestion={s} compact />
            ))}
          </div>
        </section>
      )}

      {/* ================================================================
          EMPTY STATE
          ================================================================ */}
      {briefing && briefing.suggestions.length === 0 && (
        <div className="bg-surface-raised rounded-xl border border-surface-border p-8 text-center">
          <p className="text-sm font-medium text-text-primary mb-2">All quiet today</p>
          <p className="text-sm text-text-muted mb-4">
            Trade Daddy hasn&apos;t found any strong signals in your focus universe right now.
            That&apos;s okay — sometimes the best trade is no trade.
          </p>
          <Link
            href="/settings"
            className="text-sm font-medium text-accent hover:text-accent-glow transition-colors"
          >
            Adjust your focus universe →
          </Link>
        </div>
      )}

      {/* ================================================================
          FOOTER
          ================================================================ */}
      <div className="mt-8 pt-6 border-t border-surface-border flex items-center justify-between">
        <p className="text-xs text-text-muted">
          {briefing?.dataSource === "live" ? "Data from live sources" : "Demo data"} · Updated {briefing ? new Date(briefing.generatedAt).toLocaleTimeString() : ""}
        </p>
        <Link href="/onboarding" className="text-xs font-medium text-text-muted hover:text-text-secondary transition-colors">
          Redo onboarding
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suggestion Card — the core UI object
// ---------------------------------------------------------------------------

function SuggestionCard({
  suggestion: s,
  featured,
  compact,
}: {
  suggestion: BriefingSuggestion;
  featured?: boolean;
  compact?: boolean;
}) {
  return (
    <Link href={`/flags/${s.flag.id}`} className="block group">
      <div className={`bg-surface-raised rounded-xl border border-surface-border transition-all duration-200 hover:border-accent/30 hover:shadow-card ${
        featured ? "p-5" : "p-4"
      }`}>
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-text-muted">{s.flag.category}</span>
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-lg border ${verdictStyle(s.verdict)}`}>
                {verdictLabel(s.verdict)}
              </span>
            </div>
            <h3 className={`font-semibold text-text-primary leading-tight group-hover:text-accent transition-colors ${
              featured ? "text-base" : "text-sm"
            }`}>
              {s.flag.title}
            </h3>
          </div>
          <ConvictionBadge score={s.flag.convictionScore} size="sm" />
        </div>

        {/* Summary */}
        {!compact && (
          <p className="text-sm text-text-secondary leading-relaxed mb-3 line-clamp-2">
            {s.flag.summary}
          </p>
        )}

        {/* Intel row */}
        <div className="flex items-center gap-4 text-xs">
          {s.topHypothesis && (
            <span className="text-text-secondary truncate flex-1">
              <span className={`font-semibold ${dirColor(s.topHypothesisDirection)}`}>
                {dirIcon(s.topHypothesisDirection)}
              </span>
              {" "}{s.topHypothesis}
            </span>
          )}
          <span className="text-text-muted shrink-0">
            {s.hypothesisCount} scenarios
          </span>
          {s.testsTotal > 0 && (
            <span className="text-text-muted shrink-0">
              <span className="text-conviction-high">{s.testsPassed}</span>/{s.testsTotal} tests
            </span>
          )}
        </div>

        {/* Suggested action */}
        {featured && (
          <div className="mt-3 pt-3 border-t border-surface-border flex items-center justify-between">
            <span className="text-xs text-text-muted">{s.flag.suggestedAction}</span>
            <span className="text-xs font-medium text-accent group-hover:translate-x-0.5 transition-transform">
              View details →
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
