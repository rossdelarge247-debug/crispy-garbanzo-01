"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getAssetDisplayName } from "@/lib/asset-names";
import type { ValidatedIdea, EconomicEvent } from "@/types";
import FeedStatus from "@/components/FeedStatus";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fp(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

// ---------------------------------------------------------------------------
// Loading state — shown while the system analyses markets
// ---------------------------------------------------------------------------

function AnalysingState() {
  const [dots, setDots] = useState("");
  const [step, setStep] = useState(0);

  const steps = [
    "Scanning news sources",
    "Reading articles",
    "Analysing scenarios",
    "Running backtests",
    "Checking quality bar",
  ];

  useEffect(() => {
    const dotTimer = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 400);
    const stepTimer = setInterval(() => setStep(s => (s + 1) % steps.length), 2500);
    return () => { clearInterval(dotTimer); clearInterval(stepTimer); };
  }, [steps.length]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-5 h-5 border-2 border-[--accent] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-[--text-primary] font-medium">{steps[step]}{dots}</p>
        <p className="text-xs text-[--text-muted] mt-1">This takes a moment — real analysis, not a template</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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

  function handleFilter(id: FilterId) {
    if (id === activeFilter) return;
    setActiveFilter(id);
  }

  const idea = briefing?.idea ?? null;
  const otherIdeas = briefing?.otherIdeas ?? [];
  const events = briefing?.events ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header + filter */}
      <div>
        <h1 className="text-lg font-bold text-[--text-primary] mb-3">Dashboard</h1>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => handleFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeFilter === f.id
                  ? "bg-[--accent] text-white"
                  : "bg-[--surface-raised] text-[--text-muted] hover:text-[--text-primary] border border-[--border]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && <AnalysingState />}

      {/* Content */}
      {!loading && (
        <>
          {/* Assessment */}
          <p className="text-sm text-[--text-secondary]">
            {briefing?.headline ?? "Unable to load"}
            {briefing?.totalAnalysed != null && briefing.totalAnalysed > 0 && (
              <span className="text-[--text-muted]"> — {briefing.totalAnalysed} {briefing.totalAnalysed === 1 ? "theme" : "themes"} analysed</span>
            )}
          </p>

          {/* The idea — or nothing */}
          {idea ? (
            <Link
              href={`/flags/${idea.flag.id}`}
              className="block rounded-lg border border-[--border] bg-[--surface-raised] p-5 hover:border-[--accent]/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-base font-bold text-[--text-primary]">
                  {getAssetDisplayName(idea.flag.affectedAssets[0]?.symbol ?? "")}
                </h2>
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

              <div className="flex items-center gap-4 text-xs text-[--text-muted] mb-2">
                <span>{idea.backtestSummary.winRate}% win rate</span>
                <span>{idea.backtestSummary.scenarioCount} scenarios</span>
                <span>{idea.backtestSummary.profitFactor}:1 PF</span>
              </div>

              <div className="flex items-center gap-4 text-xs tabular-nums">
                <span>Entry <span className="font-semibold text-[--text-primary]">{fp(idea.recommendation.entryPrice)}</span></span>
                <span>Stop <span className="font-semibold text-[--red]">{fp(idea.recommendation.stopLoss)}</span></span>
                <span>Target <span className="font-semibold text-[--green]">{fp(idea.recommendation.takeProfit)}</span></span>
              </div>

              <p className="mt-3 text-sm font-semibold text-[--accent]">Explore this idea &rarr;</p>
            </Link>
          ) : (
            <div className="rounded-lg border border-[--border] bg-[--surface-raised] p-5">
              <p className="text-sm text-[--text-secondary]">
                {briefing?.detail ?? "Nothing meets the quality threshold right now."}
              </p>
            </div>
          )}

          {/* Other ideas */}
          {otherIdeas.length > 0 && (
            <div className="space-y-2">
              {otherIdeas.map(o => (
                <Link
                  key={o.flag.id}
                  href={`/flags/${o.flag.id}`}
                  className="flex items-center gap-3 rounded-lg border border-[--border] bg-[--surface-raised] p-3 hover:border-[--accent]/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-[--text-primary] truncate">
                        {getAssetDisplayName(o.flag.affectedAssets[0]?.symbol ?? "")}
                      </span>
                      <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded ${
                        o.recommendation.direction === "long" ? "bg-[--green-bg] text-[--green]" : "bg-[--red-bg] text-[--red]"
                      }`}>
                        {o.recommendation.direction === "long" ? "Long" : "Short"}
                      </span>
                      <span className="text-xs font-bold tabular-nums text-[--text-muted] ml-auto shrink-0">
                        {o.recommendation.confidence}
                      </span>
                    </div>
                    <p className="text-xs text-[--text-secondary] line-clamp-1">{o.flag.summary}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Events */}
          {events.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[--text-muted] mb-2">Upcoming events</p>
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

          <FeedStatus />

          <div className="flex items-center justify-between text-2xs text-[--text-muted] pt-2 border-t border-[--border]">
            <span>{briefing?.dataSource ?? "demo"}</span>
            <Link href="/settings" className="text-[--accent]">Settings</Link>
          </div>
        </>
      )}
    </div>
  );
}
