"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadPreferences } from "@/lib/preferences";
import { getAssetDisplayName } from "@/lib/asset-names";
import type { ValidatedIdea, EconomicEvent } from "@/types";
import FeedStatus from "@/components/FeedStatus";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BriefingData {
  todayAssessment: {
    status: "yes" | "no";
    headline: string;
    detail: string;
    sessionState: string;
    sessionLabel: string;
  };
  idea: ValidatedIdea | null;
  otherIdeas: ValidatedIdea[];
  events: EconomicEvent[];
  dataSource: string;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "The markets never sleep";
  if (hour < 12) return "A new day dawns";
  if (hour < 18) return "The afternoon unfolds";
  return "The evening watch begins";
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

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prefs = loadPreferences();
    if (!prefs.onboarded) {
      router.replace("/onboarding");
      return;
    }

    fetch("/api/briefing")
      .then(res => {
        if (!res.ok) throw new Error("Briefing fetch failed");
        return res.json();
      })
      .then((data: BriefingData) => {
        setBriefing(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("[dashboard] Briefing error:", err);
        setError("Failed to load your dashboard. Please try again.");
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-text-secondary">Consulting the scrolls...</p>
          <p className="text-2xs text-text-muted">Analysing news, running backtests, checking the numbers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-text-secondary">{error}</p>
          <button onClick={() => window.location.reload()} className="text-xs text-accent hover:underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const assessment = briefing?.todayAssessment;
  const idea = briefing?.idea ?? null;
  const events = briefing?.events ?? [];

  return (
    <div className="space-y-8 max-w-3xl">
      {/* ==================================================================
          HERO — does today matter?
          ================================================================== */}
      <section className={`rounded-xl border p-6 ${
        idea
          ? "bg-conviction-high/10 border-conviction-high/20"
          : "bg-surface-raised border-surface-border"
      }`}>
        <p className="text-xs font-medium text-text-muted mb-1">{getGreeting()}</p>
        <h1 className="text-xl font-bold text-text-primary mb-2">Dashboard</h1>

        {idea ? (
          <>
            <p className="text-sm font-semibold text-conviction-high mb-1">
              {assessment?.headline ?? "I found something worth your attention"}
            </p>
            <p className="text-sm text-text-secondary leading-relaxed">
              {assessment?.detail}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-text-secondary leading-relaxed">
              {assessment?.headline ?? "The markets are quiet"}.{" "}
              {assessment?.detail ?? "Patience. I will tell you when something clears the bar."}
            </p>
          </>
        )}

        {assessment?.sessionLabel && (
          <p className="text-xs text-text-muted mt-3">{assessment.sessionLabel}</p>
        )}
      </section>

      {/* ==================================================================
          THE IDEA (0 or 1) — pre-validated, pre-backtested
          ================================================================== */}
      {idea && (
        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-3">
            Today&apos;s opportunity
          </h2>
          <div className="bg-surface-raised rounded-xl border border-surface-border p-5 space-y-4">
            {/* Asset + direction + confidence */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-text-primary leading-tight">
                  {getAssetDisplayName(idea.flag.affectedAssets[0]?.symbol ?? "")}
                </h3>
                <p className="text-xs text-text-muted">{idea.flag.category}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                  idea.recommendation.direction === "long"
                    ? "bg-conviction-high/15 text-conviction-high"
                    : "bg-conviction-danger/15 text-conviction-danger"
                }`}>
                  {idea.recommendation.direction === "long" ? "Go long" : "Go short"}
                </span>
                <span className={`text-sm font-bold tabular-nums ${
                  idea.recommendation.confidence >= 70 ? "text-conviction-high" :
                  idea.recommendation.confidence >= 55 ? "text-conviction-medium" : "text-text-muted"
                }`}>
                  {idea.recommendation.confidence}/100
                </span>
              </div>
            </div>

            {/* AI-generated thesis */}
            <p className="text-sm text-text-secondary leading-relaxed">
              {idea.flag.summary}
            </p>

            {/* Pre-computed backtest stats */}
            <div className="grid grid-cols-4 gap-3 bg-surface-overlay rounded-lg p-3">
              <div className="text-center">
                <div className="text-lg font-bold tabular-nums text-conviction-high">
                  {idea.backtestSummary.winRate}%
                </div>
                <div className="text-2xs text-text-muted">Win rate</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold tabular-nums text-text-primary">
                  {idea.backtestSummary.scenarioCount}
                </div>
                <div className="text-2xs text-text-muted">Tested</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold tabular-nums text-text-primary">
                  {idea.backtestSummary.profitFactor}:1
                </div>
                <div className="text-2xs text-text-muted">Profit factor</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold tabular-nums text-text-primary">
                  {idea.backtestSummary.avgDaysHeld}d
                </div>
                <div className="text-2xs text-text-muted">Avg hold</div>
              </div>
            </div>

            {/* Trade spec preview */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xs text-text-muted">Entry</p>
                <p className="text-sm font-bold tabular-nums text-text-primary">
                  {formatPrice(idea.recommendation.entryPrice)}
                </p>
              </div>
              <div>
                <p className="text-2xs text-text-muted">Stop</p>
                <p className="text-sm font-bold tabular-nums text-conviction-danger">
                  {formatPrice(idea.recommendation.stopLoss)}
                </p>
              </div>
              <div>
                <p className="text-2xs text-text-muted">Target</p>
                <p className="text-sm font-bold tabular-nums text-conviction-high">
                  {formatPrice(idea.recommendation.takeProfit)}
                </p>
              </div>
            </div>

            {/* Top reasons */}
            {idea.recommendation.reasons.length > 0 && (
              <div className="space-y-1">
                {idea.recommendation.reasons.slice(0, 3).map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-conviction-high text-xs font-bold mt-0.5 shrink-0">{i + 1}</span>
                    <p className="text-xs text-text-secondary leading-relaxed">{r}</p>
                  </div>
                ))}
              </div>
            )}

            {/* News headlines */}
            {idea.newsHeadlines.length > 0 && (
              <div className="border-t border-surface-border pt-3">
                <p className="text-2xs text-text-muted mb-1.5">News driving this</p>
                {idea.newsHeadlines.slice(0, 3).map((h, i) => (
                  <p key={i} className="text-xs text-text-secondary line-clamp-1 mb-0.5">
                    &bull; {h}
                  </p>
                ))}
              </div>
            )}

            {/* CTA */}
            <Link
              href={`/flags/${idea.flag.id}`}
              className="block w-full px-4 py-3 bg-accent text-white text-sm font-semibold rounded-lg hover:shadow-card transition-all text-center"
            >
              Explore this idea
            </Link>

            {idea.dataSource === "mock" && (
              <p className="text-2xs text-text-muted text-center">Demo data — connect Polygon API for live analysis</p>
            )}
          </div>
        </section>
      )}

      {/* ==================================================================
          EVENTS
          ================================================================== */}
      {events.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-3">
            What&apos;s driving the market
          </h2>
          <div className="bg-surface-raised rounded-xl border border-surface-border divide-y divide-surface-border">
            {events.map(event => (
              <div key={event.id} className="px-4 py-3 flex items-start gap-3">
                <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                  event.impact === "high" ? "bg-accent" : "bg-conviction-medium"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">
                    {event.title}
                    {event.country && <span className="text-text-muted"> &middot; {event.country}</span>}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {formatEventTime(event.date)}
                    {event.forecast && <span> — forecast: <span className="font-mono">{event.forecast}</span></span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==================================================================
          FEED STATUS + FOOTER
          ================================================================== */}
      <FeedStatus />

      <footer className="flex items-center justify-between text-xs text-text-muted pt-4 border-t border-surface-border">
        <span>
          {briefing?.dataSource ?? "demo"} &middot; Updated{" "}
          {briefing?.generatedAt ? formatTime(briefing.generatedAt) : "just now"}
        </span>
        <Link href="/preferences" className="text-accent hover:underline">
          Edit what the wizard watches
        </Link>
      </footer>
    </div>
  );
}
