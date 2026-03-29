"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getAssetDisplayName } from "@/lib/asset-names";
import type { ValidatedIdea, EconomicEvent } from "@/types";
import FeedStatus from "@/components/FeedStatus";

interface BriefingData {
  headline: string;
  detail: string;
  idea: ValidatedIdea | null;
  otherIdeas: ValidatedIdea[];
  events: EconomicEvent[];
  dataSource: string;
  totalAnalysed: number;
  generatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Skeleton loading                                                    */
/* ------------------------------------------------------------------ */

function Sk({ w = "100%", h = 10 }: { w?: string; h?: number }) {
  return <div className="rounded bg-[--surface-overlay] animate-pulse" style={{ width: w, height: h }} />;
}

function SkeletonCard() {
  return (
    <div className="rounded-lg bg-[--surface-raised] p-4 space-y-2">
      <div className="flex justify-between"><Sk w="45%" h={13} /><Sk w="40px" h={13} /></div>
      <Sk w="90%" h={10} />
      <Sk w="70%" h={10} />
    </div>
  );
}

function LoadingState() {
  const [step, setStep] = useState(0);
  const steps = ["Scanning news", "Reading articles", "Analysing scenarios", "Running backtests", "Checking quality"];
  useEffect(() => { const t = setInterval(() => setStep(s => (s + 1) % steps.length), 2200); return () => clearInterval(t); }, [steps.length]);
  return (
    <div className="space-y-3">
      <p className="text-xs text-[--text-muted]">{steps[step]}...</p>
      <SkeletonCard /><SkeletonCard /><SkeletonCard />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Confidence badge with tooltip                                       */
/* ------------------------------------------------------------------ */

function ConfidenceBadge({ idea }: { idea: ValidatedIdea }) {
  const [showTip, setShowTip] = useState(false);
  const rec = idea.recommendation;
  const bt = idea.backtestSummary;
  const color = rec.confidence >= 70 ? "text-[--green]" : rec.confidence >= 50 ? "text-[--amber]" : "text-[--text-muted]";

  return (
    <div className="relative">
      <button
        onClick={() => setShowTip(!showTip)}
        className={`text-sm font-bold tabular-nums ${color} cursor-help`}
        title="Click for breakdown"
      >
        {rec.confidence}%
      </button>
      {showTip && (
        <div className="absolute right-0 top-6 z-50 w-56 rounded-lg bg-[--surface-raised] shadow-lg p-3 text-xs space-y-1.5"
          onMouseLeave={() => setShowTip(false)}>
          <p className="font-semibold text-[--text-primary] mb-1">{rec.confidenceLabel} confidence</p>
          {bt.scenarioCount > 0 && <p className="text-[--text-secondary]">Win rate: {bt.winRate}% across {bt.scenarioCount} scenarios</p>}
          {bt.profitFactor > 0 && <p className="text-[--text-secondary]">Profit factor: {bt.profitFactor}:1</p>}
          {rec.reasons.length > 0 && <p className="text-[--text-muted] pt-1">{rec.reasons[0]}</p>}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Idea card                                                           */
/* ------------------------------------------------------------------ */

function IdeaCard({ idea }: { idea: ValidatedIdea }) {
  const rec = idea.recommendation;
  const bt = idea.backtestSummary;

  return (
    <Link
      href={`/flags/${idea.flag.id}`}
      className="block rounded-lg bg-[--surface-raised] hover:bg-[--surface-overlay] transition-colors p-4"
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="min-w-0">
          <span className="text-sm font-bold text-[--text-primary]">
            {getAssetDisplayName(idea.flag.affectedAssets[0]?.symbol ?? "")}
          </span>
          <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded ml-2 ${
            rec.direction === "long" ? "bg-[--green-bg] text-[--green]" : "bg-[--red-bg] text-[--red]"
          }`}>
            {rec.direction === "long" ? "Long" : "Short"}
          </span>
        </div>
        <ConfidenceBadge idea={idea} />
      </div>
      <p className="text-xs text-[--text-secondary] leading-relaxed line-clamp-2 mb-1.5">{idea.flag.summary}</p>
      {bt.scenarioCount > 0 && (
        <p className="text-2xs text-[--text-muted]">
          {bt.winRate}% win rate · {bt.scenarioCount} scenarios · {bt.profitFactor}:1 PF
        </p>
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Group ideas by asset class                                          */
/* ------------------------------------------------------------------ */

interface Section {
  title: string;
  ideas: ValidatedIdea[];
}

function groupByAssetClass(ideas: ValidatedIdea[]): Section[] {
  const buckets: Record<string, ValidatedIdea[]> = {
    "FX": [],
    "Crypto": [],
    "Stocks": [],
    "Commodities": [],
    "Other": [],
  };

  for (const idea of ideas) {
    const symbol = idea.flag.affectedAssets[0]?.symbol ?? "";
    const cat = idea.flag.category.toLowerCase();

    if (cat.includes("fx") || cat.includes("macro") || cat.includes("calendar") || symbol.includes("-USD") && !symbol.includes("BTC") && !symbol.includes("ETH")) {
      buckets["FX"].push(idea);
    } else if (cat.includes("crypto") || ["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD", "DOGE-USD", "ADA-USD"].includes(symbol)) {
      buckets["Crypto"].push(idea);
    } else if (cat.includes("tech") || cat.includes("risk") || ["NVDA", "AAPL", "MSFT", "GOOGL", "TSLA", "META", "SPY", "QQQ"].includes(symbol)) {
      buckets["Stocks"].push(idea);
    } else if (cat.includes("energy") || cat.includes("geopolitical") || ["BZ=F", "CL=F", "GC=F", "SI=F", "NG=F"].includes(symbol)) {
      buckets["Commodities"].push(idea);
    } else {
      buckets["Other"].push(idea);
    }
  }

  return Object.entries(buckets)
    .filter(([, ideas]) => ideas.length > 0)
    .map(([title, ideas]) => ({ title, ideas }));
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBriefing = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/briefing");
      if (!res.ok) throw new Error();
      setBriefing(await res.json());
    } catch { setBriefing(null); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBriefing(); }, [fetchBriefing]);

  const allIdeas = briefing ? [briefing.idea, ...briefing.otherIdeas].filter(Boolean) as ValidatedIdea[] : [];
  const sections = groupByAssetClass(allIdeas);
  const events = briefing?.events ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-lg font-bold text-[--text-primary]">Dashboard</h1>

      {loading && <LoadingState />}

      {!loading && (
        <div className="space-y-5">
          {/* Assessment */}
          <p className="text-sm text-[--text-secondary]">{briefing?.headline ?? "Unable to load"}</p>

          {/* Ideas by section */}
          {sections.length > 0 ? (
            sections.map(section => (
              <div key={section.title}>
                <p className="text-xs font-semibold text-[--text-muted] mb-2">{section.title}</p>
                <div className="space-y-2">
                  {section.ideas.map(idea => (
                    <IdeaCard key={idea.flag.id} idea={idea} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg bg-[--surface-raised] p-5">
              <p className="text-sm text-[--text-secondary]">
                {briefing?.detail ?? "Nothing meets the threshold right now."}
              </p>
            </div>
          )}

          {/* Events */}
          {events.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[--text-muted] mb-1.5">Upcoming events</p>
              {events.slice(0, 4).map(event => (
                <div key={event.id} className="flex items-center gap-2 text-xs py-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${event.impact === "high" ? "bg-[--accent]" : "bg-[--text-muted]"}`} />
                  <span className="text-[--text-primary] truncate">{event.title}</span>
                  {event.country && <span className="text-[--text-muted] shrink-0">{event.country}</span>}
                </div>
              ))}
            </div>
          )}

          <FeedStatus />
          <div className="flex items-center justify-between text-2xs text-[--text-muted] pt-2">
            <span>{briefing?.dataSource ?? "demo"}</span>
            <Link href="/settings" className="text-[--accent]">Settings</Link>
          </div>
        </div>
      )}
    </div>
  );
}
