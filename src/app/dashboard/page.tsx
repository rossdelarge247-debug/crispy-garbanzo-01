"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadPreferences } from "@/lib/preferences";
import { getSessionInfo, type SessionInfo } from "@/lib/session";
import {
  getAssetDisplayName,
  getAssetShortName,
  getAssetName,
} from "@/lib/asset-names";
import type { MarketFlag, EconomicEvent } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BriefingSuggestion {
  flag: MarketFlag;
  assetDisplayName: string;
  assetShortName: string;
  hypothesisCount: number;
  topHypothesis: string | null;
  topHypothesisDirection: string | null;
  testsPassed: number;
  testsTotal: number;
  verdict: "explore" | "monitor" | "wait";
  verdictReason: string;
  tradeabilityWarning: string | null;
  // Intelligence layer
  regimeBadge: string;
  regimeColor: string;
  regimeExplanation: string;
  confidenceScore: number;
  confidenceGrade: "A" | "B" | "C" | "D" | "F";
  confidenceSummary: string;
  anomalyWarning: string | null;
}

interface TodayAssessment {
  status: "yes" | "maybe" | "no";
  headline: string;
  detail: string;
  regimeNote: string | null;
  sessionState: string;
  sessionLabel: string;
  sessionEmoji: string;
  nextEvent: string;
}

interface BriefingData {
  todayAssessment: TodayAssessment;
  suggestions: BriefingSuggestion[];
  events: EconomicEvent[];
  dataSource: string;
  generatedAt: string;
}

interface StoredDryRun {
  id: string;
  config: {
    asset: string;
    direction: string;
    tradeAmount: number;
    leverage: number;
  };
  summary: { winRate: number };
  moneyProjection: { expectedValue: number };
  recommendation: string;
  recommendationText: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

function sessionBadgeClass(state: string): string {
  switch (state) {
    case "market_open":
      return "bg-conviction-high/15 text-conviction-high";
    case "pre_market":
      return "bg-conviction-medium/15 text-conviction-medium";
    default:
      return "bg-surface-overlay text-text-muted";
  }
}

function directionLabel(d: string | null): string {
  if (d === "long") return "Go long";
  if (d === "short") return "Go short";
  return "Neutral";
}

function directionColor(d: string | null): string {
  if (d === "long") return "text-conviction-high";
  if (d === "short") return "text-conviction-danger";
  return "text-text-muted";
}

function loadStoredDryRuns(): StoredDryRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("trade-daddy-dry-runs");
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [storedRuns, setStoredRuns] = useState<StoredDryRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prefs = loadPreferences();
    if (!prefs.onboarded) {
      router.replace("/onboarding");
      return;
    }

    setSession(getSessionInfo());
    setStoredRuns(loadStoredDryRuns());

    const focusSymbols = prefs.focusAssets.map((a) => a.symbol).join(",");
    const params = new URLSearchParams();
    if (focusSymbols) params.set("focusAssets", focusSymbols);
    if (prefs.riskStyle) params.set("riskStyle", prefs.riskStyle);
    const url = `/api/briefing${params.toString() ? `?${params.toString()}` : ""}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Briefing fetch failed");
        return res.json();
      })
      .then((data: BriefingData) => {
        setBriefing(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[dashboard] Briefing error:", err);
        setError("Failed to load your dashboard. Please try again.");
        setLoading(false);
      });
  }, [router]);

  /* ---- loading / error states ---- */

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-text-secondary">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
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

  /* ---- derived data ---- */

  const suggestions = briefing?.suggestions ?? [];
  const exploreSuggestions = suggestions.filter((s) => s.verdict === "explore");
  const monitorSuggestions = suggestions.filter((s) => s.verdict === "monitor");
  const topSuggestion = exploreSuggestions[0] ?? null;
  const backupSuggestions = exploreSuggestions.slice(1, 3);
  const todayAssessment = briefing?.todayAssessment ?? null;

  // Use API-provided assessment (regime-aware) or derive locally
  type HeroState = "yes" | "maybe" | "no";
  const heroState: HeroState = todayAssessment?.status ?? (
    exploreSuggestions.length > 0 ? "yes" :
    monitorSuggestions.length > 0 ? "maybe" : "no"
  );

  // Events related to the user's suggestions — not a generic calendar
  const suggestedAssetSymbols = new Set(
    suggestions.flatMap((s) => s.flag.affectedAssets.map((a) => a.symbol))
  );
  const relatedEvents = (briefing?.events ?? []).filter((ev) => {
    // Keep high-impact events or events whose country/title relates to suggestions
    return ev.impact === "high" || ev.impact === "medium";
  });

  return (
    <div className="space-y-8 max-w-3xl">
      {/* ================================================================
          A. "DOES TODAY MATTER?" HERO
          ================================================================ */}
      <section
        className={`rounded-xl border p-6 ${
          heroState === "yes"
            ? "bg-conviction-high/10 border-conviction-high/20"
            : heroState === "maybe"
              ? "bg-conviction-medium/10 border-conviction-medium/20"
              : "bg-surface-raised border-surface-border"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-medium text-text-muted mb-1">
              {getGreeting()}
            </p>
            <h1 className="text-xl font-bold text-text-primary mb-2">
              Dashboard
            </h1>
            {heroState === "yes" && (
              <>
                <p className="text-sm font-semibold text-conviction-high mb-1">
                  {todayAssessment?.headline ?? "There\u2019s a setup worth looking at today"}
                </p>
                <p className="text-sm text-text-secondary">
                  {todayAssessment?.detail ?? topSuggestion?.flag.title}
                </p>
              </>
            )}
            {heroState === "maybe" && (
              <div>
                <p className="text-sm text-conviction-medium mb-1">
                  {todayAssessment?.headline ?? "A few things are developing \u2014 worth keeping an eye on"}
                </p>
                {todayAssessment?.detail && (
                  <p className="text-xs text-text-secondary">{todayAssessment.detail}</p>
                )}
              </div>
            )}
            {heroState === "no" && (
              <p className="text-sm text-text-secondary">
                {todayAssessment?.headline ?? "Nothing strong today"}.{" "}
                {todayAssessment?.detail ?? "That\u2019s fine \u2014 Daddy will let you know when something comes up."}
              </p>
            )}
            {todayAssessment?.regimeNote && (
              <p className="text-xs text-text-muted mt-2 italic">{todayAssessment.regimeNote}</p>
            )}
          </div>
          {session && (
            <span
              className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${sessionBadgeClass(session.state)}`}
            >
              {session.label}
            </span>
          )}
        </div>
        {session && (
          <p className="text-xs text-text-muted mt-3">{session.nextEvent}</p>
        )}
      </section>

      {/* ================================================================
          B. TOP TRADE IDEA CARD (if YES)
          ================================================================ */}
      {topSuggestion && (
        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-3">
            Top trade idea
          </h2>
          <div className="bg-surface-raised rounded-xl border border-surface-border p-5">
            {/* Asset name + direction */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-text-primary leading-tight">
                  {getAssetDisplayName(
                    topSuggestion.flag.affectedAssets[0]?.symbol ?? ""
                  )}
                </h3>
                <span className="text-xs text-text-muted">
                  {topSuggestion.flag.category}
                </span>
              </div>
              <span
                className={`shrink-0 text-sm font-semibold px-3 py-1 rounded-full ${
                  topSuggestion.topHypothesisDirection === "long"
                    ? "bg-conviction-high/15 text-conviction-high"
                    : topSuggestion.topHypothesisDirection === "short"
                      ? "bg-conviction-danger/15 text-conviction-danger"
                      : "bg-surface-overlay text-text-muted"
                }`}
              >
                {directionLabel(topSuggestion.topHypothesisDirection)}
              </span>
            </div>

            {/* Why now */}
            <p className="text-sm text-text-secondary mb-3 leading-relaxed">
              {topSuggestion.flag.summary}
            </p>

            {/* Intelligence badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {topSuggestion.regimeBadge && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${topSuggestion.regimeColor}`}>
                  {topSuggestion.regimeBadge}
                </span>
              )}
              {topSuggestion.confidenceGrade && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-overlay ${
                  topSuggestion.confidenceGrade === "A" ? "text-emerald-400" :
                  topSuggestion.confidenceGrade === "B" ? "text-emerald-300" :
                  topSuggestion.confidenceGrade === "C" ? "text-amber-400" : "text-orange-400"
                }`}>
                  Grade {topSuggestion.confidenceGrade} · {topSuggestion.confidenceScore}
                </span>
              )}
            </div>

            {/* Conviction bar */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-text-muted">Conviction</span>
              <div className="flex-1 h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    topSuggestion.confidenceScore >= 70
                      ? "bg-conviction-high"
                      : topSuggestion.confidenceScore >= 50
                        ? "bg-conviction-medium"
                        : "bg-conviction-low"
                  }`}
                  style={{ width: `${topSuggestion.confidenceScore ?? topSuggestion.flag.convictionScore}%` }}
                />
              </div>
              <span className="text-xs font-mono text-text-primary font-semibold">
                {topSuggestion.confidenceScore ?? topSuggestion.flag.convictionScore}
              </span>
            </div>

            {/* Regime explanation */}
            {topSuggestion.regimeExplanation && (
              <p className="text-xs text-text-muted mb-3 leading-relaxed">{topSuggestion.regimeExplanation}</p>
            )}

            {/* Tradeability warning */}
            {topSuggestion.tradeabilityWarning && (
              <div className="mb-3 p-2.5 rounded-lg bg-amber-400/5 border border-amber-400/20">
                <p className="text-xs text-amber-300">{topSuggestion.tradeabilityWarning}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <Link
                href={`/flags/${topSuggestion.flag.id}`}
                className="inline-flex items-center px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:shadow-card transition-all"
              >
                Run simulation
              </Link>
              <Link
                href={`/flags/${topSuggestion.flag.id}`}
                className="inline-flex items-center px-4 py-2 border border-surface-border text-text-secondary text-sm font-medium rounded-lg hover:bg-surface-overlay transition-all"
              >
                See full analysis
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================
          C. OTHER IDEAS
          ================================================================ */}
      {backupSuggestions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-3">
            Other ideas
          </h2>
          <div className="space-y-2">
            {backupSuggestions.map((s) => {
              const symbol = s.flag.affectedAssets[0]?.symbol ?? "";
              return (
                <Link
                  key={s.flag.id}
                  href={`/flags/${s.flag.id}`}
                  className="block bg-surface-raised rounded-xl border border-surface-border p-4 hover:border-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-text-primary truncate">
                          {s.assetShortName || getAssetShortName(symbol)}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            s.topHypothesisDirection === "long"
                              ? "bg-conviction-high/15 text-conviction-high"
                              : s.topHypothesisDirection === "short"
                                ? "bg-conviction-danger/15 text-conviction-danger"
                                : "bg-surface-overlay text-text-muted"
                          }`}
                        >
                          {s.topHypothesisDirection === "long"
                            ? "\u2191"
                            : s.topHypothesisDirection === "short"
                              ? "\u2193"
                              : "\u2192"}{" "}
                          {directionLabel(s.topHypothesisDirection)}
                        </span>
                        {s.regimeBadge && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.regimeColor}`}>
                            {s.regimeBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary line-clamp-1">
                        {s.flag.summary}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`font-mono text-xs font-semibold ${
                        (s.confidenceScore ?? s.flag.convictionScore) >= 70
                          ? "text-emerald-400"
                          : (s.confidenceScore ?? s.flag.convictionScore) >= 50
                            ? "text-amber-400"
                            : "text-text-muted"
                      }`}>
                        {s.confidenceScore ?? s.flag.convictionScore}
                      </span>
                      {s.confidenceGrade && (
                        <span className="block text-xs text-text-muted">Grade {s.confidenceGrade}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ================================================================
          D. WHAT'S DRIVING THE MARKET TODAY
          ================================================================ */}
      {relatedEvents.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-3">
            What&apos;s driving the market today
          </h2>
          <div className="bg-surface-raised rounded-xl border border-surface-border divide-y divide-surface-border">
            {relatedEvents.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="px-4 py-3 flex items-start gap-3"
              >
                <span
                  className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                    event.impact === "high"
                      ? "bg-accent"
                      : "bg-conviction-medium"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">
                    {event.title}
                    {event.country && (
                      <span className="text-text-muted">
                        {" "}
                        &middot; {event.country}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {formatEventTime(event.date)}
                    {event.forecast && (
                      <span>
                        {" "}
                        — forecast: <span className="font-mono">{event.forecast}</span>
                      </span>
                    )}
                    {event.previous && (
                      <span>
                        , previous: <span className="font-mono">{event.previous}</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================================================================
          E. ACTIVE SIMULATIONS / PAPER TRADES
          ================================================================ */}
      {storedRuns.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-3">
            Recent simulations
          </h2>
          <div className="space-y-2">
            {storedRuns.slice(0, 3).map((run) => (
              <div
                key={run.id}
                className="bg-surface-raised rounded-xl border border-surface-border p-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">
                    {getAssetName(run.config.asset)}
                  </p>
                  <p className="text-xs text-text-muted">
                    {directionLabel(run.config.direction)} &middot;{" "}
                    <span className="font-mono">
                      {run.summary.winRate}% win rate
                    </span>
                  </p>
                </div>
                <span
                  className={`font-mono text-sm font-bold ${
                    run.moneyProjection.expectedValue >= 0
                      ? "text-conviction-high"
                      : "text-conviction-danger"
                  }`}
                >
                  {run.moneyProjection.expectedValue >= 0 ? "+" : ""}
                  &pound;{run.moneyProjection.expectedValue.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================================================================
          F. FOOTER
          ================================================================ */}
      <footer className="flex items-center justify-between text-xs text-text-muted pt-4 border-t border-surface-border">
        <span>
          {briefing?.dataSource ?? "demo"} &middot; Updated{" "}
          {briefing?.generatedAt
            ? formatTime(briefing.generatedAt)
            : "just now"}
        </span>
        <Link href="/preferences" className="text-accent hover:underline">
          Edit what Daddy watches
        </Link>
      </footer>
    </div>
  );
}
