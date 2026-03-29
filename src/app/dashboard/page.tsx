"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadPreferences } from "@/lib/preferences";
import { getAssetDisplayName } from "@/lib/asset-names";
import type { ValidatedIdea, EconomicEvent } from "@/types";
import FeedStatus from "@/components/FeedStatus";

interface BriefingData {
  todayAssessment: {
    status: "yes" | "no";
    headline: string;
    detail: string;
  };
  idea: ValidatedIdea | null;
  events: EconomicEvent[];
  dataSource: string;
  generatedAt: string;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

export default function DashboardPage() {
  const router = useRouter();
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prefs = loadPreferences();
    if (!prefs.onboarded) { router.replace("/onboarding"); return; }

    fetch("/api/briefing")
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data: BriefingData) => { setBriefing(data); setLoading(false); })
      .catch(() => { setError("Failed to load. Try again."); setLoading(false); });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-[--accent] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[--text-secondary]">Analysing markets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-sm text-[--text-secondary]">{error} <button onClick={() => window.location.reload()} className="text-[--accent] underline ml-1">Retry</button></p>
      </div>
    );
  }

  const idea = briefing?.idea ?? null;
  const events = briefing?.events ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Hero */}
      <div>
        <h1 className="text-lg font-bold text-[--text-primary] mb-1">Dashboard</h1>
        <p className="text-sm text-[--text-secondary]">
          {briefing?.todayAssessment?.headline ?? "Checking markets..."}
        </p>
      </div>

      {/* The idea — or nothing */}
      {idea ? (
        <Link
          href={`/flags/${idea.flag.id}`}
          className="block rounded-lg border border-[--border] bg-[--surface-raised] p-5 hover:border-[--accent]/30 transition-colors"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-base font-bold text-[--text-primary]">
                {getAssetDisplayName(idea.flag.affectedAssets[0]?.symbol ?? "")}
              </h2>
              <p className="text-xs text-[--text-muted]">{idea.flag.category}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                idea.recommendation.direction === "long"
                  ? "bg-[--green-bg] text-[--green]"
                  : "bg-[--red-bg] text-[--red]"
              }`}>
                {idea.recommendation.direction === "long" ? "Long" : "Short"}
              </span>
              <span className="text-sm font-bold tabular-nums text-[--text-primary]">
                {idea.recommendation.confidence}
              </span>
            </div>
          </div>

          <p className="text-sm text-[--text-secondary] leading-relaxed mb-3">
            {idea.flag.summary}
          </p>

          <div className="flex items-center gap-4 text-xs text-[--text-muted] mb-3">
            <span>{idea.backtestSummary.winRate}% win rate</span>
            <span>{idea.backtestSummary.scenarioCount} scenarios tested</span>
            <span>{idea.backtestSummary.profitFactor}:1 profit factor</span>
          </div>

          <div className="flex items-center gap-4 text-xs tabular-nums">
            <span>Entry <span className="font-semibold text-[--text-primary]">{formatPrice(idea.recommendation.entryPrice)}</span></span>
            <span>Stop <span className="font-semibold text-[--red]">{formatPrice(idea.recommendation.stopLoss)}</span></span>
            <span>Target <span className="font-semibold text-[--green]">{formatPrice(idea.recommendation.takeProfit)}</span></span>
          </div>

          <div className="mt-4 text-sm font-semibold text-[--accent]">
            Explore this idea &rarr;
          </div>
        </Link>
      ) : (
        <div className="rounded-lg border border-[--border] bg-[--surface-raised] p-5">
          <p className="text-sm text-[--text-secondary]">
            {briefing?.todayAssessment?.detail ?? "Nothing clears the bar right now. I will tell you when something does."}
          </p>
        </div>
      )}

      {/* Events — compact */}
      {events.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-[--text-muted] mb-2">Upcoming events</h2>
          <div className="space-y-1">
            {events.slice(0, 4).map(event => (
              <div key={event.id} className="flex items-center gap-2 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  event.impact === "high" ? "bg-[--accent]" : "bg-[--text-muted]"
                }`} />
                <span className="text-[--text-primary] truncate">{event.title}</span>
                {event.country && <span className="text-[--text-muted] shrink-0">{event.country}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feed status + footer */}
      <FeedStatus />
      <div className="flex items-center justify-between text-2xs text-[--text-muted] pt-2 border-t border-[--border]">
        <span>{briefing?.dataSource ?? "demo"}</span>
        <Link href="/preferences" className="text-[--accent]">Preferences</Link>
      </div>
    </div>
  );
}
