"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { MarketFlagDetail, Hypothesis, ValidatedIdea, BacktestScenario, NewsArticle } from "@/types";
import { savePosition, type PaperPosition } from "@/lib/paper-positions";

interface Props {
  flag: MarketFlagDetail;
  hypotheses: Hypothesis[];
  idea: ValidatedIdea | null;
  articles: NewsArticle[];
  assetSymbol: string;
  humanName: string;
  entryPrice: number;
}

function fp(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

/* ------------------------------------------------------------------ */
/* Mini sparkline for scenario price paths                             */
/* ------------------------------------------------------------------ */

function ScenarioPath({ path, won }: { path: number[]; won: boolean }) {
  if (path.length < 2) return null;
  const w = 80; const h = 28;
  const min = Math.min(...path); const max = Math.max(...path);
  const range = max - min || 1;
  const pts = path.map((v, i) => `${(i / (path.length - 1)) * w},${h - 2 - ((v - min) / range) * (h - 4)}`).join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <line x1={0} y1={h - 2 - ((-min) / range) * (h - 4)} x2={w} y2={h - 2 - ((-min) / range) * (h - 4)} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="2,2" />
      <polyline points={pts} fill="none" stroke={won ? "var(--green)" : "var(--red)"} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Scenario card                                                       */
/* ------------------------------------------------------------------ */

function ScenarioCard({ s, i }: { s: BacktestScenario; i: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg bg-[--surface-raised] p-3">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <div className="flex items-center gap-3">
          <ScenarioPath path={s.pricePathPercent} won={s.won} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[--text-primary]">{s.entryDate} → {s.exitDate}</span>
              <span className={`text-xs font-bold tabular-nums ${s.won ? "text-[--green]" : "text-[--red]"}`}>
                {s.returnPercent >= 0 ? "+" : ""}{s.returnPercent}%
              </span>
              <span className={`text-2xs ${s.exitReason === "target" ? "text-[--green]" : s.exitReason === "stop" ? "text-[--red]" : "text-[--text-muted]"}`}>
                {s.exitReason === "target" ? "Hit target" : s.exitReason === "stop" ? "Stopped out" : "Time limit"}
              </span>
            </div>
            <p className="text-2xs text-[--text-muted]">{s.similarity}% match — {s.matchReason}</p>
          </div>
          <span className="text-xs text-[--text-muted] shrink-0">{expanded ? "▴" : "▾"}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-2 pt-2 space-y-1.5 text-xs">
          <p className="text-[--text-secondary] leading-relaxed">{s.narrative}</p>
          <div className="flex gap-4 text-[--text-muted]">
            <span>Entry: {fp(s.entryPrice)}</span>
            <span>Exit: {fp(s.exitPrice)}</span>
            <span>{s.daysHeld} days held</span>
          </div>
          <p className="text-2xs text-[--text-muted]">
            <span className="font-semibold">Why tested:</span> This historical period had {s.similarity}% similar market conditions
            to today — {s.matchReason}
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function ExploreClient({ flag, hypotheses, idea, articles, assetSymbol, humanName, entryPrice }: Props) {
  const router = useRouter();
  const [showAllScenarios, setShowAllScenarios] = useState(false);
  const [paperTradeCreated, setPaperTradeCreated] = useState(false);

  const rec = idea?.recommendation;
  const bt = idea?.backtestSummary;
  const scenarios = idea?.backtestScenarios ?? [];
  const topHyp = hypotheses.sort((a, b) => b.confidenceScore - a.confidenceScore)[0];

  function handlePaperTrade() {
    if (!rec || !idea) return;

    const position: PaperPosition = {
      id: `paper-${assetSymbol}-${Date.now()}`,
      flagId: flag.id,
      asset: assetSymbol,
      assetName: humanName,
      direction: rec.direction === "short" ? "short" : "long",
      entryPrice: rec.entryPrice > 0 ? rec.entryPrice : entryPrice,
      stopLoss: rec.stopLoss,
      takeProfit: rec.takeProfit,
      tradeAmount: rec.suggestedAmount,
      leverage: rec.suggestedLeverage,
      openedAt: new Date().toISOString(),
      status: "open",
    };

    savePosition(position);
    setPaperTradeCreated(true);
  }

  return (
    <>
      {/* Header + price */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-[--text-primary]">{humanName}</h1>
          {rec && (
            <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded ${
              rec.direction === "long" ? "bg-[--green-bg] text-[--green]" : "bg-[--red-bg] text-[--red]"
            }`}>
              {rec.direction === "long" ? "Long" : "Short"}
            </span>
          )}
        </div>
        {entryPrice > 0 && <span className="text-lg font-bold tabular-nums text-[--text-primary]">{fp(entryPrice)}</span>}
      </div>

      {/* Confidence */}
      {rec && (
        <div className="rounded-lg bg-[--surface-raised] p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[--text-muted]">Confidence</span>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-bold tabular-nums ${rec.confidence >= 70 ? "text-[--green]" : rec.confidence >= 50 ? "text-[--amber]" : "text-[--text-muted]"}`}>
                {rec.confidence}%
              </span>
              <span className="text-xs text-[--text-muted]">{rec.confidenceLabel}</span>
            </div>
          </div>
          <div className="space-y-1 text-xs text-[--text-secondary]">
            {bt && bt.scenarioCount > 0 && <p>{bt.winRate}% win rate across {bt.scenarioCount} historical scenarios</p>}
            {bt && bt.profitFactor > 0 && <p>Profit factor: {bt.profitFactor}:1</p>}
            {rec.catalyst && <p className="text-[--text-muted]">Catalyst: {rec.catalyst}</p>}
          </div>
        </div>
      )}

      {/* Rationale */}
      <div className="rounded-lg bg-[--surface-raised] p-4 mb-4">
        <p className="text-xs font-semibold text-[--text-muted] mb-2">Rationale</p>
        <p className="text-sm text-[--text-secondary] leading-relaxed mb-2">{flag.summary}</p>
        {topHyp && (
          <div className="pl-3 border-l-2 border-[--accent]/30">
            <p className="text-xs font-medium text-[--text-primary]">{topHyp.title}</p>
            <p className="text-xs text-[--text-muted] mt-0.5">Invalidation: {topHyp.invalidation}</p>
          </div>
        )}
        {rec && rec.reasons.length > 0 && (
          <div className="mt-3 space-y-1">
            {rec.reasons.slice(0, 3).map((r, i) => (
              <p key={i} className="text-xs text-[--text-secondary]"><span className="text-[--text-muted] mr-1">{i + 1}.</span>{r}</p>
            ))}
          </div>
        )}
      </div>

      {/* Trade plan */}
      {rec && (
        <div className={`rounded-lg p-4 mb-4 ${rec.action === "enter_now" ? "bg-[--green-bg]" : rec.action === "wait" ? "bg-[--amber-bg]" : "bg-[--surface-raised]"}`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-bold ${rec.action === "enter_now" ? "text-[--green]" : rec.action === "wait" ? "text-[--amber]" : "text-[--text-muted]"}`}>
              {rec.action === "enter_now" ? "Enter now" : rec.action === "wait" ? "Wait" : "Skip"}
            </span>
          </div>

          {rec.entryPrice > 0 ? (
            <div className="grid grid-cols-4 gap-3 text-xs mb-3">
              <div><p className="text-[--text-muted]">Entry</p><p className="font-bold tabular-nums text-[--text-primary]">{fp(rec.entryPrice)}</p></div>
              <div><p className="text-[--text-muted]">Stop</p><p className="font-bold tabular-nums text-[--red]">{fp(rec.stopLoss)}</p></div>
              <div><p className="text-[--text-muted]">Target</p><p className="font-bold tabular-nums text-[--green]">{fp(rec.takeProfit)}</p></div>
              <div><p className="text-[--text-muted]">Hold</p><p className="font-bold text-[--text-primary]">{rec.holdDays}d</p></div>
            </div>
          ) : rec.entryText ? (
            <div className="text-xs space-y-0.5 mb-3">
              <p>Entry: <span className="font-medium text-[--text-primary]">{rec.entryText}</span></p>
              {rec.stopText && <p>Stop: <span className="font-medium text-[--red]">{rec.stopText}</span></p>}
              {rec.targetText && <p>Target: <span className="font-medium text-[--green]">{rec.targetText}</span></p>}
              {rec.holdText && <p>Hold: <span className="font-medium text-[--text-primary]">{rec.holdText}</span></p>}
            </div>
          ) : null}

          {rec.timing && <p className="text-xs text-[--text-muted] mb-1">Timing: <span className="text-[--text-secondary]">{rec.timing}</span></p>}
          {rec.whatToWatch && <p className="text-xs text-[--text-muted] mb-3">Watch: <span className="text-[--text-secondary]">{rec.whatToWatch}</span></p>}

          {/* CTAs */}
          <div className="flex gap-2">
            {!paperTradeCreated ? (
              <button
                onClick={handlePaperTrade}
                className="flex-1 px-3 py-2 text-xs font-semibold rounded bg-[--accent] text-white hover:opacity-90 transition-opacity"
              >
                Set up paper trade
              </button>
            ) : (
              <span className="flex-1 px-3 py-2 text-xs font-semibold rounded bg-[--green-bg] text-[--green] text-center">
                Paper trade created ✓
              </span>
            )}
            <Link
              href={`/flags/${flag.id}/trade-plan`}
              className="flex-1 px-3 py-2 text-xs font-semibold rounded bg-[--surface-overlay] text-[--text-secondary] text-center hover:text-[--text-primary] transition-colors"
            >
              Full trade plan
            </Link>
          </div>
        </div>
      )}

      {/* Backtest evidence + scenario drill-down */}
      {scenarios.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[--text-muted]">
              Historical evidence ({scenarios.length} scenarios tested)
            </p>
            {bt && (
              <span className="text-xs text-[--text-muted]">
                {bt.winRate}% won · {bt.profitFactor}:1 PF · {bt.avgDaysHeld}d avg
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            {(showAllScenarios ? scenarios : scenarios.slice(0, 4)).map((s, i) => (
              <ScenarioCard key={i} s={s} i={i} />
            ))}
          </div>

          {scenarios.length > 4 && (
            <button
              onClick={() => setShowAllScenarios(!showAllScenarios)}
              className="text-xs text-[--accent] mt-2"
            >
              {showAllScenarios ? "Show fewer" : `Show all ${scenarios.length} scenarios`}
            </button>
          )}
        </div>
      )}

      {/* All hypotheses/scenarios */}
      {hypotheses.length > 1 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-[--text-muted] mb-2">Scenarios</p>
          {hypotheses.map(h => (
            <div key={h.id} className="text-xs pb-2 mb-2 last:mb-0 last:pb-0">
              <span className={h.direction === "long" ? "text-[--green]" : h.direction === "short" ? "text-[--red]" : "text-[--text-muted]"}>
                {h.direction === "long" ? "↑" : h.direction === "short" ? "↓" : "→"}
              </span>
              <span className="font-semibold text-[--text-primary] ml-1">{h.title}</span>
              <span className="text-[--text-muted] ml-2 tabular-nums">{h.confidenceScore}%</span>
              <p className="text-[--text-secondary] mt-0.5">{h.summary}</p>
            </div>
          ))}
        </div>
      )}

      {/* Risks */}
      {rec && rec.risks.length > 0 && (
        <div className="rounded-lg bg-[--surface-raised] p-4 mb-4">
          <p className="text-xs font-semibold text-[--text-muted] mb-1">Risks</p>
          {rec.risks.slice(0, 3).map((r, i) => (
            <p key={i} className="text-xs text-[--text-muted] mb-0.5">{r}</p>
          ))}
        </div>
      )}
    </>
  );
}
