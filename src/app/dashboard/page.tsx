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

const FILTERS = [
  { id: "all",    label: "All" },
  { id: "energy", label: "Energy" },
  { id: "crypto", label: "Crypto" },
  { id: "fx",     label: "FX" },
  { id: "tech",   label: "Tech" },
  { id: "risk",   label: "Risk" },
] as const;

type FilterId = typeof FILTERS[number]["id"];

/* ------------------------------------------------------------------ */
/* Skeleton loading — Facebook-style ghost cards                       */
/* ------------------------------------------------------------------ */

function SkeletonBar({ w = "100%", h = 10 }: { w?: string; h?: number }) {
  return (
    <div
      className="rounded bg-[--surface-overlay] animate-pulse"
      style={{ width: w, height: h }}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-lg bg-[--surface-raised] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonBar w="40%" h={14} />
        <SkeletonBar w="48px" h={14} />
      </div>
      <SkeletonBar w="100%" h={10} />
      <SkeletonBar w="85%" h={10} />
      <div className="flex gap-4 pt-1">
        <SkeletonBar w="80px" h={10} />
        <SkeletonBar w="80px" h={10} />
        <SkeletonBar w="80px" h={10} />
      </div>
      <div className="flex gap-4">
        <SkeletonBar w="60px" h={10} />
        <SkeletonBar w="60px" h={10} />
        <SkeletonBar w="60px" h={10} />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="rounded-lg bg-[--surface-raised] p-3 flex items-center gap-3">
      <div className="flex-1 space-y-1.5">
        <SkeletonBar w="50%" h={12} />
        <SkeletonBar w="80%" h={10} />
      </div>
      <SkeletonBar w="32px" h={12} />
    </div>
  );
}

function LoadingState() {
  const [step, setStep] = useState(0);
  const steps = [
    "Scanning news sources",
    "Reading articles",
    "Analysing scenarios",
    "Running backtests",
    "Checking quality",
  ];

  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 2200);
    return () => clearInterval(t);
  }, [steps.length]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-[--text-muted]">{steps[step]}...</p>
      <SkeletonCard />
      <SkeletonRow />
      <SkeletonRow />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Idea card                                                           */
/* ------------------------------------------------------------------ */

function IdeaCard({ idea, featured }: { idea: ValidatedIdea; featured?: boolean }) {
  const rec = idea.recommendation;
  const bt = idea.backtestSummary;
  const hasNumericLevels = rec.entryPrice > 0;

  return (
    <Link
      href={`/flags/${idea.flag.id}`}
      className={`block rounded-lg bg-[--surface-raised] hover:bg-[--surface-overlay] transition-colors ${featured ? "p-5" : "p-3"}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h2 className={`font-bold text-[--text-primary] ${featured ? "text-base" : "text-sm"} leading-tight`}>
            {getAssetDisplayName(idea.flag.affectedAssets[0]?.symbol ?? "")}
          </h2>
          {featured && <p className="text-2xs text-[--text-muted] mt-0.5">{idea.flag.category}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded ${
            rec.direction === "long" ? "bg-[--green-bg] text-[--green]" : "bg-[--red-bg] text-[--red]"
          }`}>
            {rec.direction === "long" ? "Long" : "Short"}
          </span>
          <span className="text-sm font-bold tabular-nums text-[--text-primary]">{rec.confidence}</span>
        </div>
      </div>

      <p className={`text-[--text-secondary] leading-relaxed mb-2 ${featured ? "text-sm" : "text-xs line-clamp-2"}`}>
        {idea.flag.summary}
      </p>

      {featured && (
        <>
          {/* Backtest stats (if available) */}
          {bt.scenarioCount > 0 && (
            <div className="flex items-center gap-4 text-xs text-[--text-muted] mb-2">
              <span>{bt.winRate}% win rate</span>
              <span>{bt.scenarioCount} scenarios</span>
              <span>{bt.profitFactor}:1 PF</span>
            </div>
          )}

          {/* Trade levels — text or numeric */}
          {hasNumericLevels ? (
            <div className="flex items-center gap-4 text-xs tabular-nums mb-2">
              <span>Entry <span className="font-semibold text-[--text-primary]">{fp(rec.entryPrice)}</span></span>
              <span>Stop <span className="font-semibold text-[--red]">{fp(rec.stopLoss)}</span></span>
              <span>Target <span className="font-semibold text-[--green]">{fp(rec.takeProfit)}</span></span>
            </div>
          ) : rec.entryText ? (
            <div className="text-xs text-[--text-muted] space-y-0.5 mb-2">
              <p>Entry: <span className="text-[--text-primary]">{rec.entryText}</span></p>
              {rec.stopText && <p>Stop: <span className="text-[--red]">{rec.stopText}</span></p>}
              {rec.targetText && <p>Target: <span className="text-[--green]">{rec.targetText}</span></p>}
            </div>
          ) : null}

          {/* Catalyst + timing */}
          {rec.catalyst && (
            <p className="text-xs text-[--text-muted] mb-2">
              Catalyst: <span className="text-[--text-secondary]">{rec.catalyst}</span>
            </p>
          )}
          {rec.timing && (
            <p className="text-xs text-[--text-muted] mb-2">
              Timing: <span className="text-[--text-secondary]">{rec.timing}</span>
            </p>
          )}
        </>
      )}

      <p className={`font-semibold text-[--accent] ${featured ? "text-sm mt-3" : "text-xs mt-2"}`}>
        Explore &rarr;
      </p>
    </Link>
  );
}

function fp(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");

  const fetchBriefing = useCallback(async (filter: FilterId) => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?assets=${filter}` : "";
      const res = await fetch(`/api/briefing${params}`);
      if (!res.ok) throw new Error();
      setBriefing(await res.json());
    } catch {
      setBriefing(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBriefing(activeFilter); }, [activeFilter, fetchBriefing]);

  const idea = briefing?.idea ?? null;
  const otherIdeas = briefing?.otherIdeas ?? [];
  const events = briefing?.events ?? [];

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header + filter */}
      <div>
        <h1 className="text-lg font-bold text-[--text-primary] mb-3">Dashboard</h1>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                activeFilter === f.id
                  ? "bg-[--accent] text-white"
                  : "bg-[--surface-raised] text-[--text-muted] hover:text-[--text-primary]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && <LoadingState />}

      {/* Content */}
      {!loading && (
        <div className="space-y-3">
          {/* Assessment */}
          <p className="text-sm text-[--text-secondary]">
            {briefing?.headline ?? "Unable to load"}
            {briefing?.totalAnalysed != null && briefing.totalAnalysed > 0 && (
              <span className="text-[--text-muted]"> &mdash; {briefing.totalAnalysed} analysed</span>
            )}
          </p>

          {/* Ideas */}
          {idea ? (
            <>
              <IdeaCard idea={idea} featured />
              {otherIdeas.map(o => (
                <IdeaCard key={o.flag.id} idea={o} />
              ))}
            </>
          ) : (
            <div className="rounded-lg bg-[--surface-raised] p-5">
              <p className="text-sm text-[--text-secondary]">
                {briefing?.detail ?? "Nothing meets the threshold right now."}
              </p>
            </div>
          )}

          {/* Events */}
          {events.length > 0 && (
            <div className="pt-2">
              <p className="text-2xs text-[--text-muted] mb-1.5">Upcoming events</p>
              {events.slice(0, 4).map(event => (
                <div key={event.id} className="flex items-center gap-2 text-xs py-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    event.impact === "high" ? "bg-[--accent]" : "bg-[--text-muted]"
                  }`} />
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
