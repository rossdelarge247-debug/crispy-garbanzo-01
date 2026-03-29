"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getAssetDisplayName } from "@/lib/asset-names";
import type { ValidatedIdea } from "@/types";
import FeedStatus from "@/components/FeedStatus";

interface BriefingData {
  headline: string;
  detail: string;
  idea: ValidatedIdea | null;
  otherIdeas: ValidatedIdea[];
  dataSource: string;
  totalAnalysed: number;
  generatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Sparkline — 7-day price history + direction projection              */
/* ------------------------------------------------------------------ */

function Sparkline({ prices, direction }: { prices: number[]; direction: string }) {
  if (prices.length < 2) return <div className="w-[100px] h-[40px] bg-[--surface-overlay] rounded" />;

  const w = 100;
  const h = 40;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pad = 4;

  const pts = prices.map((v, i) => ({
    x: (i / (prices.length - 1)) * (w - pad * 2) + pad,
    y: h - pad - ((v - min) / range) * (h - pad * 2),
  }));

  const line = pts.map(p => `${p.x},${p.y}`).join(" ");
  const last = pts[pts.length - 1];
  const isUp = direction === "long";

  // Projection: short dashed line extending the trend
  const projX = w - 2;
  const projY = isUp ? Math.max(pad, last.y - 8) : Math.min(h - pad, last.y + 8);

  return (
    <svg width={w} height={h} className="shrink-0" viewBox={`0 0 ${w} ${h}`}>
      <polyline points={line} fill="none" stroke="var(--text-muted)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Direction projection */}
      <line x1={last.x} y1={last.y} x2={projX} y2={projY}
        stroke={isUp ? "var(--green)" : "var(--red)"} strokeWidth={1.5} strokeDasharray="2,2" />
      {/* Current price dot */}
      <circle cx={last.x} cy={last.y} r={2.5} fill={isUp ? "var(--green)" : "var(--red)"} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton loading                                                    */
/* ------------------------------------------------------------------ */

function Sk({ w = "100%", h = 10 }: { w?: string; h?: number }) {
  return <div className="rounded bg-[--surface-overlay] animate-pulse" style={{ width: w, height: h }} />;
}

function SkeletonCard() {
  return (
    <div className="rounded-lg bg-[--surface-raised] p-4 flex gap-3">
      <Sk w="100px" h={40} />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between"><Sk w="45%" h={13} /><Sk w="40px" h={13} /></div>
        <Sk w="90%" h={10} />
        <Sk w="50%" h={10} />
      </div>
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
      <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Confidence tooltip                                                  */
/* ------------------------------------------------------------------ */

function ConfidenceBadge({ idea }: { idea: ValidatedIdea }) {
  const [showTip, setShowTip] = useState(false);
  const rec = idea.recommendation;
  const bt = idea.backtestSummary;
  const color = rec.confidence >= 70 ? "text-[--green]" : rec.confidence >= 50 ? "text-[--amber]" : "text-[--text-muted]";

  return (
    <div className="relative shrink-0">
      <button onClick={() => setShowTip(!showTip)} className={`text-sm font-bold tabular-nums ${color} cursor-help`}>
        {rec.confidence}%
      </button>
      {showTip && (
        <div className="absolute right-0 top-6 z-50 w-52 rounded-lg bg-[--bg] shadow-lg p-3 text-xs space-y-1" onMouseLeave={() => setShowTip(false)}>
          <p className="font-semibold text-[--text-primary]">{rec.confidenceLabel} confidence</p>
          {bt.scenarioCount > 0 && <p className="text-[--text-secondary]">{bt.winRate}% win rate · {bt.scenarioCount} scenarios</p>}
          {bt.profitFactor > 0 && <p className="text-[--text-secondary]">Profit factor: {bt.profitFactor}:1</p>}
          {rec.catalyst && <p className="text-[--text-muted]">{rec.catalyst}</p>}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Idea card with sparkline                                            */
/* ------------------------------------------------------------------ */

function IdeaCard({ idea }: { idea: ValidatedIdea }) {
  const rec = idea.recommendation;

  return (
    <Link
      href={`/flags/${idea.flag.id}`}
      className="flex gap-3 rounded-lg bg-[--surface-raised] hover:bg-[--surface-overlay] transition-colors p-4"
    >
      <Sparkline prices={idea.priceHistory7d} direction={rec.direction} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-[--text-primary] truncate">
              {getAssetDisplayName(idea.flag.affectedAssets[0]?.symbol ?? "")}
            </span>
            <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded ${
              rec.direction === "long" ? "bg-[--green-bg] text-[--green]" : "bg-[--red-bg] text-[--red]"
            }`}>
              {rec.direction === "long" ? "Long" : "Short"}
            </span>
          </div>
          <ConfidenceBadge idea={idea} />
        </div>
        <p className="text-xs text-[--text-secondary] leading-relaxed line-clamp-2">{idea.flag.summary}</p>
        {rec.catalyst && (
          <p className="text-2xs text-[--text-muted] mt-1 truncate">{rec.catalyst}</p>
        )}
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Group by asset class                                                */
/* ------------------------------------------------------------------ */

function groupByAssetClass(ideas: ValidatedIdea[]): { title: string; ideas: ValidatedIdea[] }[] {
  const buckets: Record<string, ValidatedIdea[]> = { FX: [], Crypto: [], Stocks: [], Commodities: [], Other: [] };

  for (const idea of ideas) {
    const sym = idea.flag.affectedAssets[0]?.symbol ?? "";
    const cat = idea.flag.category.toLowerCase();

    if (["BZ=F", "CL=F", "GC=F", "SI=F", "NG=F"].includes(sym) || cat.includes("energy") || cat.includes("geopolitical") || cat.includes("commodit")) {
      buckets.Commodities.push(idea);
    } else if (["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD", "DOGE-USD", "ADA-USD"].includes(sym) || cat.includes("crypto")) {
      buckets.Crypto.push(idea);
    } else if (sym.includes("-USD") || cat.includes("fx") || cat.includes("macro") || sym === "DXY") {
      buckets.FX.push(idea);
    } else if (["SPY", "QQQ", "NVDA", "AAPL", "MSFT", "GOOGL", "TSLA", "META", "AMZN", "NFLX"].includes(sym) || cat.includes("tech") || cat.includes("risk") || cat.includes("stock")) {
      buckets.Stocks.push(idea);
    } else {
      buckets.Other.push(idea);
    }
  }

  return Object.entries(buckets).filter(([, v]) => v.length > 0).map(([title, ideas]) => ({ title, ideas }));
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

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-lg font-bold text-[--text-primary]">Dashboard</h1>

      {loading && <LoadingState />}

      {!loading && (
        <div className="space-y-5">
          <p className="text-sm text-[--text-secondary]">{briefing?.headline ?? "Unable to load"}</p>

          {sections.length > 0 ? (
            sections.map(section => (
              <div key={section.title}>
                <p className="text-xs font-semibold text-[--text-muted] mb-2">{section.title}</p>
                <div className="space-y-2">
                  {section.ideas.map(idea => <IdeaCard key={idea.flag.id} idea={idea} />)}
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
