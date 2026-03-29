"use client";

/**
 * ScenarioTestPanel — the quant advisor experience.
 *
 * Replaces random simulations with signal-matched historical backtesting.
 *
 * The experience:
 *  1. Shows a clear thesis: what conditions exist right now, in plain English
 *  2. Runs against real history: finds times when the same conditions appeared
 *  3. Shows each scenario with a narrative and match quality
 *  4. The advisor analyses results and suggests improvements
 *  5. Follow-up suggestions guide the user to better setups
 */

import { useState, useMemo } from "react";
import type { Direction } from "@/types";
import { getAssetName } from "@/lib/asset-names";

// ---------------------------------------------------------------------------
// Types (mirrors services/backtest.ts)
// ---------------------------------------------------------------------------

interface SignalThesis {
  headline: string;
  conditions: string[];
  summary: string;
}

interface HistoricalScenario {
  id: string;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  exitReason: "target" | "stop" | "time";
  returnPercent: number;
  pnl: number;
  daysHeld: number;
  won: boolean;
  pricePath: number[];
  pricePathPercent: number[];
  similarity: number;
  matchReason: string;
  narrative: string;
}

interface BacktestSummary {
  scenarioCount: number;
  wins: number;
  losses: number;
  winRate: number;
  avgReturn: number;
  avgDaysHeld: number;
  bestReturn: number;
  worstReturn: number;
  profitFactor: number;
  expectancyPerTrade: number;
}

interface MoneyProjection {
  tradeAmount: number;
  leverage: number;
  exposure: number;
  typicalWin: number;
  typicalLoss: number;
  expectedPerTrade: number;
  bestCase: number;
  worstCase: number;
  stopLossPrice: number;
  takeProfitPrice: number;
}

interface ParameterSuggestion {
  type: "stop_loss" | "take_profit" | "hold_period";
  current: number;
  suggested: number;
  unit: string;
  impact: string;
  rationale: string;
}

interface FollowUpSuggestion {
  description: string;
  rationale: string;
}

interface AdvisorAnalysis {
  parameterSuggestions: ParameterSuggestion[];
  followUpSuggestions: FollowUpSuggestion[];
  insight: string;
}

interface TradeRec {
  action: "enter_now" | "wait" | "skip";
  actionLabel: string;
  timing: string;
  timingRationale: string;
  direction: string;
  directionLabel: string;
  suggestedAmount: number;
  suggestedLeverage: number;
  suggestedExposure: number;
  sizeRationale: string;
  entryPrice: number;
  stopLoss: number;
  stopLossPct: number;
  takeProfit: number;
  takeProfitPct: number;
  holdDays: number;
  riskRewardRatio: number;
  confidence: number;
  confidenceLabel: string;
  confidenceColor: string;
  reasons: string[];
  risks: string[];
  summary: string;
}

interface BacktestResult {
  id: string;
  thesis: SignalThesis;
  scenarios: HistoricalScenario[];
  summary: BacktestSummary;
  moneyProjection: MoneyProjection;
  advisor: AdvisorAnalysis;
  tradeRec: TradeRec;
  recommendation: "strong" | "moderate" | "weak" | "against";
  recommendationText: string;
  dataQuality: "full" | "limited" | "insufficient";
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScenarioTestPanelProps {
  asset: string;
  assetName: string;
  direction: Direction;
  entryPrice: number;
  livePrice?: number | null;
  isLive?: boolean;
  // Intelligence context (optional, displayed for reference)
  regime?: string;
  regimeLabel?: string;
  confidenceGrade?: string;
  confidenceScore?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatGBP(value: number): string {
  return Math.abs(value).toFixed(2);
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function holdPeriodLabel(days: number): string {
  if (days === 1) return "1 day";
  return `${days} days`;
}

function recBadge(rec: string): { color: string; label: string } {
  switch (rec) {
    case "strong":
      return { color: "bg-[--green-bg] text-[--green] border-[--green]/20", label: "The road is clear" };
    case "moderate":
      return { color: "bg-[--amber-bg] text-[--amber] border-[--amber]/20", label: "Proceed with care" };
    case "weak":
      return { color: "bg-[--orange-bg] text-[--orange] border-[--orange]/20", label: "The path is uncertain" };
    case "against":
      return { color: "bg-[--red-bg] text-[--red] border-[--red]/20", label: "You shall not pass" };
    default:
      return { color: "bg-surface-overlay text-text-muted border-surface-border", label: rec };
  }
}

function exitReasonLabel(reason: string): string {
  switch (reason) {
    case "target": return "Hit target";
    case "stop": return "Stopped out";
    case "time": return "Hold limit";
    default: return reason;
  }
}

function exitReasonColor(reason: string): string {
  switch (reason) {
    case "target": return "text-[--green]";
    case "stop": return "text-[--red]";
    default: return "text-[--text-muted]";
  }
}

/** Tiny inline sparkline for a scenario's price path. */
function MiniPath({ path, won }: { path: number[]; won: boolean }) {
  if (path.length < 2) return null;
  const w = 120;
  const h = 32;
  const min = Math.min(...path);
  const max = Math.max(...path);
  const range = max - min || 1;
  const points = path.map((v, i) => {
    const x = (i / (path.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  const firstY = points.split(" ")[0].split(",")[1];
  const lastPt = points.split(" ").pop()?.split(",") ?? ["0", "0"];

  return (
    <svg width={w} height={h} className="shrink-0" viewBox={`0 0 ${w} ${h}`}>
      <line
        x1={0} y1={h - ((-min) / range) * (h - 4) - 2}
        x2={w} y2={h - ((-min) / range) * (h - 4) - 2}
        stroke="var(--border)" strokeWidth={0.5} strokeDasharray="2,2"
      />
      <polyline
        points={points} fill="none"
        stroke={won ? "var(--green)" : "var(--red)"}
        strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx={0} cy={Number(firstY)} r={2} fill="var(--accent)" />
      <circle cx={w} cy={Number(lastPt[1])} r={2} fill={won ? "var(--green)" : "var(--red)"} />
    </svg>
  );
}

function ParamSuggestionIcon({ type }: { type: string }) {
  switch (type) {
    case "stop_loss": return <span className="text-[--red]">&#9632;</span>;
    case "take_profit": return <span className="text-[--green]">&#9650;</span>;
    case "hold_period": return <span className="text-[--amber]">&#9200;</span>;
    default: return null;
  }
}

const LEVERAGE_OPTIONS = [5, 10, 20, 50] as const;
const HOLD_OPTIONS = [
  { value: 3, label: "3 days" },
  { value: 5, label: "5 days" },
  { value: 10, label: "10 days" },
  { value: 20, label: "20 days" },
] as const;
const LOOKBACK_OPTIONS = [
  { value: 6, label: "6 months" },
  { value: 12, label: "12 months" },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScenarioTestPanel({
  asset,
  assetName,
  direction,
  entryPrice,
  livePrice,
  isLive,
  confidenceGrade,
  confidenceScore,
}: ScenarioTestPanelProps) {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllScenarios, setShowAllScenarios] = useState(false);

  // Config
  const [tradeAmount, setTradeAmount] = useState(1000);
  const [leverage, setLeverage] = useState(10);
  const [stopLoss, setStopLoss] = useState(2);
  const [takeProfit, setTakeProfit] = useState(3);
  const [maxHoldDays, setMaxHoldDays] = useState(10);
  const [lookbackMonths, setLookbackMonths] = useState(12);

  const effectiveEntryPrice = livePrice ?? entryPrice;
  const exposure = tradeAmount * leverage;
  const maxRisk = exposure * (stopLoss / 100);

  const stopPrice = useMemo(() => {
    return direction === "long"
      ? effectiveEntryPrice * (1 - stopLoss / 100)
      : effectiveEntryPrice * (1 + stopLoss / 100);
  }, [effectiveEntryPrice, stopLoss, direction]);

  const targetPrice = useMemo(() => {
    return direction === "long"
      ? effectiveEntryPrice * (1 + takeProfit / 100)
      : effectiveEntryPrice * (1 - takeProfit / 100);
  }, [effectiveEntryPrice, takeProfit, direction]);

  /** Run the backtest with explicit params (avoids stale state from async updates) */
  async function runTestWithParams(overrides?: {
    stop?: number; target?: number; hold?: number;
  }) {
    const sl = overrides?.stop ?? stopLoss;
    const tp = overrides?.target ?? takeProfit;
    const hd = overrides?.hold ?? maxHoldDays;

    setLoading(true);
    setResult(null);
    setError(null);
    setShowAllScenarios(false);
    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset, direction,
          entryPrice: effectiveEntryPrice,
          stopLossPercent: sl,
          takeProfitPercent: tp,
          maxHoldDays: hd,
          lookbackMonths, tradeAmount, leverage,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || data.error || `${res.status}`);
      }
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backtest failed");
    }
    setLoading(false);
  }

  function runTest() { runTestWithParams(); }

  /** Apply a parameter suggestion and immediately re-run */
  function applySuggestion(s: ParameterSuggestion) {
    const overrides: { stop?: number; target?: number; hold?: number } = {};
    if (s.type === "stop_loss") { setStopLoss(s.suggested); overrides.stop = s.suggested; }
    if (s.type === "take_profit") { setTakeProfit(s.suggested); overrides.target = s.suggested; }
    if (s.type === "hold_period") { setMaxHoldDays(s.suggested); overrides.hold = s.suggested; }
    runTestWithParams(overrides);
  }

  function resetToConfig() {
    setResult(null);
    setError(null);
    setShowAllScenarios(false);
  }

  // ================================================================
  // LOADING
  // ================================================================
  if (loading) {
    return (
      <div className="bg-[--surface-raised] rounded-xl border border-[--border] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-5 border-2 border-[--accent] border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="text-sm font-semibold text-[--text-primary]">Searching the records</p>
            <p className="text-xs text-[--text-secondary]">
              Finding times when {getAssetName(asset)} showed these same conditions...
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2 bg-[--surface-overlay] rounded-full skeleton" style={{ width: "75%" }} />
          <div className="h-2 bg-[--surface-overlay] rounded-full skeleton" style={{ width: "50%" }} />
        </div>
      </div>
    );
  }

  // ================================================================
  // RESULTS
  // ================================================================
  if (result) {
    const { summary: s, scenarios, thesis, advisor, tradeRec: rec } = result;
    const badge = recBadge(result.recommendation);
    const displayScenarios = showAllScenarios ? scenarios : scenarios.slice(0, 3);
    const actionColor = rec.action === "enter_now" ? "border-[--green]/30 bg-[--green-bg]"
      : rec.action === "wait" ? "border-[--amber]/30 bg-[--amber-bg]"
      : "border-[--red]/30 bg-[--red-bg]";
    const actionTextColor = rec.action === "enter_now" ? "text-[--green]"
      : rec.action === "wait" ? "text-[--amber]" : "text-[--red]";

    return (
      <div className="space-y-4">
        {/* ============================================================
            1. RECOMMENDATION CARD — the answer, upfront
            ============================================================ */}
        <div className={`rounded-xl border-2 ${actionColor} p-5`}>
          {/* Action + confidence */}
          <div className="flex items-center justify-between mb-3">
            <span className={`text-lg font-bold ${actionTextColor}`}>
              {rec.actionLabel}
            </span>
            <div className="text-right">
              <span className={`text-2xl font-bold tabular-nums ${rec.confidenceColor}`}>
                {rec.confidence}
              </span>
              <span className="text-xs text-[--text-muted] ml-1">/100</span>
              <p className="text-2xs text-[--text-muted]">{rec.confidenceLabel} confidence</p>
            </div>
          </div>

          {/* Trade spec */}
          {rec.action !== "skip" && (
            <div className="bg-[--bg]/60 rounded-lg p-3 mb-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-2xs text-[--text-muted]">Direction</p>
                <p className={`text-sm font-bold ${rec.direction === "long" ? "text-[--green]" : "text-[--red]"}`}>
                  {rec.directionLabel}
                </p>
              </div>
              <div>
                <p className="text-2xs text-[--text-muted]">Entry</p>
                <p className="text-sm font-bold tabular-nums text-[--text-primary]">{formatPrice(rec.entryPrice)}</p>
              </div>
              <div>
                <p className="text-2xs text-[--text-muted]">Stop</p>
                <p className="text-sm font-bold tabular-nums text-[--red]">{formatPrice(rec.stopLoss)}</p>
              </div>
              <div>
                <p className="text-2xs text-[--text-muted]">Target</p>
                <p className="text-sm font-bold tabular-nums text-[--green]">{formatPrice(rec.takeProfit)}</p>
              </div>
            </div>
          )}

          {rec.action !== "skip" && (
            <div className="bg-[--bg]/60 rounded-lg p-3 mb-3 grid grid-cols-3 gap-3">
              <div>
                <p className="text-2xs text-[--text-muted]">Size</p>
                <p className="text-sm font-bold tabular-nums text-[--text-primary]">&pound;{rec.suggestedAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-2xs text-[--text-muted]">Leverage</p>
                <p className="text-sm font-bold tabular-nums text-[--text-primary]">{rec.suggestedLeverage}x</p>
              </div>
              <div>
                <p className="text-2xs text-[--text-muted]">Hold</p>
                <p className="text-sm font-bold tabular-nums text-[--text-primary]">Up to {rec.holdDays}d</p>
              </div>
            </div>
          )}

          {/* Timing */}
          <p className="text-xs font-semibold text-[--text-primary] mb-0.5">{rec.timing}</p>
          <p className="text-xs text-[--text-secondary] leading-relaxed mb-3">{rec.timingRationale}</p>

          {/* Size rationale */}
          {rec.action !== "skip" && (
            <p className="text-2xs text-[--text-muted] italic">{rec.sizeRationale}</p>
          )}
        </div>

        {/* ============================================================
            2. WHY — the reasons behind the recommendation
            ============================================================ */}
        <div className="bg-[--surface-raised] rounded-xl border border-[--border] p-5">
          <h4 className="text-xs font-semibold text-[--text-muted] uppercase tracking-wide mb-3">
            Why
          </h4>
          <div className="space-y-2 mb-4">
            {rec.reasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[--green] text-xs font-bold mt-0.5 shrink-0">{i + 1}</span>
                <p className="text-sm text-[--text-primary] leading-relaxed">{r}</p>
              </div>
            ))}
          </div>

          {rec.risks.length > 0 && (
            <>
              <h4 className="text-xs font-semibold text-[--text-muted] uppercase tracking-wide mb-2">
                Risks
              </h4>
              <div className="space-y-1.5">
                {rec.risks.map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[--red] text-xs mt-0.5 shrink-0">&#9888;</span>
                    <p className="text-xs text-[--text-secondary] leading-relaxed">{r}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ============================================================
            3. THE SIGNAL — what conditions exist right now
            ============================================================ */}
        <div className="bg-[--surface-raised] rounded-xl border border-[--border] p-5">
          <h4 className="text-xs font-semibold text-[--text-muted] uppercase tracking-wide mb-2">
            Current conditions
          </h4>
          <h3 className="text-sm font-bold text-[--text-primary] mb-2">
            {thesis.headline}
          </h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {thesis.conditions.map((c, i) => (
              <span key={i} className="text-2xs font-medium text-[--text-secondary] bg-[--surface-overlay] px-2 py-0.5 rounded-md">
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* ============================================================
            4. EVIDENCE — historical scenarios + stats
            ============================================================ */}
        <div className="bg-[--surface-raised] rounded-xl border border-[--border] p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-[--text-muted] uppercase tracking-wide">
              Historical evidence
            </h4>
            <span className="text-xs font-semibold text-[--text-muted]">
              {s.scenarioCount} matches
            </span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold tabular-nums text-[--text-primary]">{s.winRate}%</div>
              <div className="text-2xs text-[--text-muted]">Win rate</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold tabular-nums ${s.avgReturn >= 0 ? "text-[--green]" : "text-[--red]"}`}>
                {s.avgReturn >= 0 ? "+" : ""}{s.avgReturn}%
              </div>
              <div className="text-2xs text-[--text-muted]">Avg return</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold tabular-nums text-[--text-primary]">{s.profitFactor}:1</div>
              <div className="text-2xs text-[--text-muted]">Profit factor</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold tabular-nums text-[--text-primary]">{s.avgDaysHeld}d</div>
              <div className="text-2xs text-[--text-muted]">Avg hold</div>
            </div>
          </div>

          {/* Scenario cards */}
          {scenarios.length > 0 && (
            <div className="space-y-2">
              {displayScenarios.map((sc) => (
                <div key={sc.id} className="bg-[--surface-overlay] rounded-lg p-3 border border-[--border]/50">
                  <div className="flex items-center gap-3 mb-1.5">
                    <MiniPath path={sc.pricePathPercent} won={sc.won} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[--text-primary]">
                          {sc.entryDate} → {sc.exitDate}
                        </span>
                        <span className={`text-xs font-bold tabular-nums ${sc.won ? "text-[--green]" : "text-[--red]"}`}>
                          {sc.returnPercent >= 0 ? "+" : ""}{sc.returnPercent}%
                        </span>
                        <span className={`text-2xs font-medium ${exitReasonColor(sc.exitReason)}`}>
                          {exitReasonLabel(sc.exitReason)}
                        </span>
                      </div>
                      <p className="text-2xs text-[--text-muted]">{sc.matchReason}</p>
                    </div>
                  </div>
                  <p className="text-xs text-[--text-secondary] leading-relaxed">{sc.narrative}</p>
                </div>
              ))}
              {scenarios.length > 3 && (
                <button onClick={() => setShowAllScenarios(!showAllScenarios)}
                  className="text-xs font-medium text-[--accent] hover:underline">
                  {showAllScenarios ? "Show fewer" : `Show all ${scenarios.length} scenarios`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ============================================================
            5. IMPROVE — advisor suggestions + follow-ups
            ============================================================ */}
        {(advisor.parameterSuggestions.length > 0 || advisor.followUpSuggestions.length > 0) && (
          <div className="bg-[--surface-raised] rounded-xl border border-[--border] p-5 space-y-4">
            <div className="bg-[--accent-light] border border-[--accent]/15 rounded-lg p-4">
              <p className="text-xs font-semibold text-[--accent] mb-1.5">The wizard&apos;s counsel</p>
              <p className="text-sm text-[--text-primary] leading-relaxed">{advisor.insight}</p>
            </div>

            {advisor.parameterSuggestions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[--text-muted] uppercase tracking-wide mb-2">
                  Suggested improvements
                </h4>
                <div className="space-y-2">
                  {advisor.parameterSuggestions.map((ps, i) => (
                    <div key={i} className="bg-[--surface-overlay] rounded-lg p-3 border border-[--border]/50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <ParamSuggestionIcon type={ps.type} />
                            <span className="text-xs font-semibold text-[--text-primary]">
                              {ps.type === "stop_loss" ? "Stop loss" : ps.type === "take_profit" ? "Take profit" : "Hold period"}:
                              {" "}{ps.current}{ps.unit} → {ps.suggested}{ps.unit}
                            </span>
                          </div>
                          <p className="text-2xs text-[--green] font-medium mb-0.5">{ps.impact}</p>
                          <p className="text-2xs text-[--text-secondary] leading-relaxed">{ps.rationale}</p>
                        </div>
                        <button onClick={() => applySuggestion(ps)}
                          className="shrink-0 text-2xs font-semibold text-[--accent] bg-[--accent-light] px-2.5 py-1.5 rounded-md hover:opacity-80 transition-opacity">
                          Apply &amp; re-test
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {advisor.followUpSuggestions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[--text-muted] uppercase tracking-wide mb-2">
                  What to try next
                </h4>
                <div className="space-y-1.5">
                  {advisor.followUpSuggestions.map((f, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[--accent] text-xs mt-0.5">&#8250;</span>
                      <div>
                        <p className="text-xs font-medium text-[--text-primary]">{f.description}</p>
                        <p className="text-2xs text-[--text-muted]">{f.rationale}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Data quality + actions */}
        {result.dataQuality !== "full" && (
          <p className="text-2xs text-[--text-muted] text-center">
            {result.dataQuality === "limited"
              ? "Few matching conditions found. Results may not be statistically significant."
              : "Insufficient data for reliable analysis."}
          </p>
        )}

        <div className="flex gap-2">
          <button onClick={runTest}
            className="flex-1 px-3 py-2.5 text-sm font-medium bg-[--accent] text-white rounded-lg hover:opacity-90 transition-opacity">
            Run again
          </button>
          <button onClick={resetToConfig}
            className="flex-1 px-3 py-2.5 text-sm font-medium border border-[--border] text-[--text-secondary] rounded-lg hover:bg-[--surface-overlay] transition-colors">
            Adjust parameters
          </button>
        </div>
      </div>
    );
  }

  // ================================================================
  // CONFIG STATE (before running)
  // ================================================================
  return (
    <div className="bg-[--surface-raised] rounded-xl border border-[--border] p-5 space-y-5">
      {/* What we're testing */}
      <div>
        <h3 className="text-sm font-semibold text-[--text-primary] mb-1">
          Scenario test
        </h3>
        <p className="text-sm text-[--text-secondary] leading-relaxed">
          I will read the current conditions on {getAssetName(asset)} — momentum, volatility, trend alignment —
          and search the last {lookbackMonths} months for every time these same conditions appeared.
          Then I will show you exactly what happened.
        </p>
        {confidenceGrade && confidenceScore != null && (
          <p className="text-xs text-[--text-muted] mt-1">
            Current conviction: Grade {confidenceGrade} ({confidenceScore})
          </p>
        )}
      </div>

      {/* Setup summary */}
      <div className="bg-[--surface-overlay] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-[--text-muted]">Entry price</p>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tabular-nums text-[--text-primary]">
                {formatPrice(effectiveEntryPrice)}
              </span>
              {isLive && (
                <span className="flex items-center gap-1 text-2xs font-medium text-[--green]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[--green] animate-pulse" />
                  Live
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[--text-muted]">Direction</p>
            <span className={`text-sm font-bold ${direction === "long" ? "text-[--green]" : "text-[--red]"}`}>
              {direction === "long" ? "Long" : "Short"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-[--surface-raised] rounded-md py-2 px-3">
            <p className="text-2xs text-[--text-muted]">Stop loss</p>
            <p className="text-xs font-bold tabular-nums text-[--red]">
              {formatPrice(stopPrice)} <span className="font-normal text-[--text-muted]">(-{stopLoss}%)</span>
            </p>
          </div>
          <div className="bg-[--surface-raised] rounded-md py-2 px-3">
            <p className="text-2xs text-[--text-muted]">Target</p>
            <p className="text-xs font-bold tabular-nums text-[--green]">
              {formatPrice(targetPrice)} <span className="font-normal text-[--text-muted]">(+{takeProfit}%)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stop + target */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-[--text-muted] mb-1 block">Stop loss %</label>
          <input type="number" step="0.5" min="0.5" max="20" value={stopLoss}
            onChange={(e) => setStopLoss(Math.max(0.5, Number(e.target.value)))}
            className="w-full px-3 py-2 bg-[--surface-overlay] border border-[--border] rounded-lg text-sm tabular-nums text-[--text-primary] focus:outline-none focus:border-[--accent]" />
        </div>
        <div>
          <label className="text-xs text-[--text-muted] mb-1 block">Target %</label>
          <input type="number" step="0.5" min="0.5" max="30" value={takeProfit}
            onChange={(e) => setTakeProfit(Math.max(0.5, Number(e.target.value)))}
            className="w-full px-3 py-2 bg-[--surface-overlay] border border-[--border] rounded-lg text-sm tabular-nums text-[--text-primary] focus:outline-none focus:border-[--accent]" />
        </div>
      </div>

      {/* Hold period */}
      <div>
        <label className="text-xs text-[--text-muted] mb-1.5 block">Maximum hold period</label>
        <div className="flex gap-1.5">
          {HOLD_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setMaxHoldDays(o.value)}
              className={`flex-1 px-2 py-2 text-xs font-medium rounded-lg transition-colors ${
                maxHoldDays === o.value ? "bg-[--accent] text-white" : "bg-[--surface-overlay] text-[--text-secondary] border border-[--border]"
              }`}>{o.label}</button>
          ))}
        </div>
        <p className="text-2xs text-[--text-muted] mt-1">
          If neither target nor stop is hit within {holdPeriodLabel(maxHoldDays)}, the position closes at market price.
        </p>
      </div>

      {/* Lookback */}
      <div>
        <label className="text-xs text-[--text-muted] mb-1.5 block">How far back to search</label>
        <div className="flex gap-1.5">
          {LOOKBACK_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setLookbackMonths(o.value)}
              className={`flex-1 px-2 py-2 text-xs font-medium rounded-lg transition-colors ${
                lookbackMonths === o.value ? "bg-[--accent] text-white" : "bg-[--surface-overlay] text-[--text-secondary] border border-[--border]"
              }`}>{o.label}</button>
          ))}
        </div>
      </div>

      {/* Amount + leverage */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-[--text-muted] mb-1 block">Trade amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[--text-muted]">&pound;</span>
            <input type="number" value={tradeAmount}
              onChange={(e) => setTradeAmount(Math.max(1, Number(e.target.value)))}
              className="w-full pl-7 pr-3 py-2 bg-[--surface-overlay] border border-[--border] rounded-lg text-sm tabular-nums text-[--text-primary] focus:outline-none focus:border-[--accent]" />
          </div>
        </div>
        <div>
          <label className="text-xs text-[--text-muted] mb-1 block">Leverage</label>
          <div className="flex gap-1">
            {LEVERAGE_OPTIONS.map(l => (
              <button key={l} onClick={() => setLeverage(l)}
                className={`flex-1 px-2 py-2 text-xs font-medium rounded-lg transition-colors ${
                  leverage === l ? "bg-[--accent] text-white" : "bg-[--surface-overlay] text-[--text-secondary] border border-[--border]"
                }`}>{l}x</button>
            ))}
          </div>
        </div>
      </div>

      {/* Exposure summary */}
      <div className="bg-[--surface-overlay] rounded-lg p-3 flex items-center justify-between">
        <div>
          <p className="text-2xs text-[--text-muted]">Your exposure</p>
          <p className="text-sm font-bold tabular-nums text-[--text-primary]">&pound;{exposure.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-2xs text-[--text-muted]">Max risk</p>
          <p className="text-sm font-bold tabular-nums text-[--red]">&pound;{formatGBP(maxRisk)}</p>
        </div>
      </div>

      {error && (
        <div className="bg-[--red-bg] border border-[--red]/20 rounded-lg p-3">
          <p className="text-xs text-[--red]">{error}</p>
        </div>
      )}

      <button onClick={runTest}
        className="w-full px-4 py-3 bg-[--accent] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity">
        Run scenario test
      </button>
      <p className="text-2xs text-[--text-muted] text-center">
        Matches on real conditions — momentum, volatility, trend alignment.
        Every scenario shown actually happened.
      </p>
    </div>
  );
}
