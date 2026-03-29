"use client";

/**
 * ScenarioTestPanel — the quant advisor experience.
 *
 * Replaces the old DryRunPanel (random walk Monte Carlo) with a
 * regime-matched historical backtest against real market data.
 *
 * Feels like having a world-class quant walk you through:
 *  1. What we're testing and why
 *  2. Smart defaults with explanations
 *  3. Real historical scenarios with narratives
 *  4. A clear, honest assessment
 */

import { useState, useMemo } from "react";
import type { Direction } from "@/types";
import type { RegimeType } from "@/services/intelligence/regime";
import { getAssetName } from "@/lib/asset-names";

// ---------------------------------------------------------------------------
// Types (mirrors services/backtest.ts)
// ---------------------------------------------------------------------------

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
  regimeAtEntry: string;
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

interface BacktestResult {
  id: string;
  scenarios: HistoricalScenario[];
  summary: BacktestSummary;
  moneyProjection: MoneyProjection;
  setupDescription: string;
  quantNote: string;
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
  regime?: RegimeType;
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

function regimeDescription(regime: RegimeType, direction: Direction, asset: string): string {
  const name = getAssetName(asset);
  const dirWord = direction === "long" ? "long" : "short";
  switch (regime) {
    case "trending_up":
      return `${name} is trending upward. I have seen this pattern before. Let me show you every time this road was walked in the past year — and where it led.`;
    case "trending_down":
      return `${name} is in decline. Before you act, let me search the history for every time this same darkness settled — and what a ${dirWord} position would have found on the other side.`;
    case "ranging":
      return `${name} is moving sideways — the market is undecided. These are treacherous conditions for directional trades. Let me show you what happened in past ranging periods.`;
    case "volatile":
      return `${name} is in a volatile phase — the winds are strong. I will test this ${dirWord} position against every similar storm in the past year, so you can see what to expect.`;
    default:
      return `Let me search the records for every time ${name} was in similar conditions, and show you what a ${dirWord} position would have done.`;
  }
}

function holdPeriodLabel(days: number): string {
  if (days === 1) return "1 day";
  if (days <= 7) return `${days} days`;
  if (days === 7) return "1 week";
  if (days === 14) return "2 weeks";
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
    default: return "text-text-muted";
  }
}

/** Tiny inline sparkline for a scenario's price path (% from entry). */
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

  return (
    <svg width={w} height={h} className="shrink-0" viewBox={`0 0 ${w} ${h}`}>
      {/* zero line */}
      <line
        x1={0} y1={h - ((-min) / range) * (h - 4) - 2}
        x2={w} y2={h - ((-min) / range) * (h - 4) - 2}
        stroke="var(--border)" strokeWidth={0.5} strokeDasharray="2,2"
      />
      <polyline
        points={points}
        fill="none"
        stroke={won ? "var(--green)" : "var(--red)"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* entry dot */}
      <circle cx={0} cy={Number(points.split(" ")[0].split(",")[1])} r={2} fill="var(--accent)" />
      {/* exit dot */}
      <circle
        cx={w}
        cy={Number(points.split(" ").pop()?.split(",")[1] ?? 0)}
        r={2}
        fill={won ? "var(--green)" : "var(--red)"}
      />
    </svg>
  );
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
  regime = "unknown",
  regimeLabel: regimeLabelProp,
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
  const humanName = getAssetName(asset);

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

  async function runTest() {
    setLoading(true);
    setResult(null);
    setError(null);
    setShowAllScenarios(false);
    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset,
          direction,
          entryPrice: effectiveEntryPrice,
          stopLossPercent: stopLoss,
          takeProfitPercent: takeProfit,
          maxHoldDays,
          lookbackMonths,
          regimeFilter: regime,
          tradeAmount,
          leverage,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || data.error || `${res.status}`);
      }
      const data: BacktestResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backtest failed");
    }
    setLoading(false);
  }

  function resetToConfig() {
    setResult(null);
    setError(null);
    setShowAllScenarios(false);
  }

  // ================================================================
  // LOADING STATE
  // ================================================================
  if (loading) {
    return (
      <div className="bg-[--surface-raised] rounded-xl border border-[--border] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-5 border-2 border-[--accent] border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="text-sm font-semibold text-[--text-primary]">Running scenario test</p>
            <p className="text-xs text-[--text-secondary]">
              Finding similar historical setups for {humanName}...
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2 bg-[--surface-overlay] rounded-full skeleton" style={{ width: "75%" }} />
          <div className="h-2 bg-[--surface-overlay] rounded-full skeleton" style={{ width: "50%" }} />
          <div className="h-2 bg-[--surface-overlay] rounded-full skeleton" style={{ width: "60%" }} />
        </div>
      </div>
    );
  }

  // ================================================================
  // RESULTS STATE
  // ================================================================
  if (result) {
    const { summary: s, moneyProjection: mp, scenarios } = result;
    const badge = recBadge(result.recommendation);
    const displayScenarios = showAllScenarios ? scenarios : scenarios.slice(0, 3);

    return (
      <div className="bg-[--surface-raised] rounded-xl border border-[--border] overflow-hidden">
        {/* Recommendation banner */}
        <div className={`px-5 py-3 border-b ${badge.color}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{badge.label}</span>
            <span className="text-xs font-semibold">
              {s.scenarioCount} historical {s.scenarioCount === 1 ? "scenario" : "scenarios"}
            </span>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Hero stat */}
          <div className="text-center">
            <div className={`text-4xl font-bold tabular-nums ${
              s.winRate >= 60 ? "text-[--green]" : s.winRate >= 45 ? "text-[--amber]" : "text-[--red]"
            }`}>
              {s.wins} of {s.scenarioCount}
            </div>
            <p className="text-sm text-[--text-secondary] mt-1">
              similar setups were profitable
            </p>
          </div>

          {/* Stats grid */}
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

          {/* Money projection */}
          <div className="bg-[--surface-overlay] rounded-lg p-4">
            <p className="text-xs font-medium text-[--text-muted] mb-3">
              If you trade with &pound;{tradeAmount.toLocaleString()} at {leverage}x leverage
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xs text-[--text-muted]">Typical win</p>
                <p className="text-sm font-bold tabular-nums text-[--green]">+&pound;{formatGBP(mp.typicalWin)}</p>
              </div>
              <div>
                <p className="text-2xs text-[--text-muted]">Typical loss</p>
                <p className="text-sm font-bold tabular-nums text-[--red]">-&pound;{formatGBP(mp.typicalLoss)}</p>
              </div>
              <div>
                <p className="text-2xs text-[--text-muted]">Expected per trade</p>
                <p className={`text-sm font-bold tabular-nums ${mp.expectedPerTrade >= 0 ? "text-[--green]" : "text-[--red]"}`}>
                  {mp.expectedPerTrade >= 0 ? "+" : "-"}&pound;{formatGBP(Math.abs(mp.expectedPerTrade))}
                </p>
              </div>
              <div>
                <p className="text-2xs text-[--text-muted]">Worst case</p>
                <p className="text-sm font-bold tabular-nums text-[--red]">-&pound;{formatGBP(Math.abs(mp.worstCase))}</p>
              </div>
            </div>
          </div>

          {/* Historical scenarios */}
          {scenarios.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[--text-muted] uppercase tracking-wide mb-3">
                Historical scenarios
              </h4>
              <div className="space-y-2">
                {displayScenarios.map((sc) => (
                  <div
                    key={sc.id}
                    className="bg-[--surface-overlay] rounded-lg p-3 border border-[--border]/50"
                  >
                    <div className="flex items-center gap-3 mb-2">
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
                        <p className="text-2xs text-[--text-muted]">
                          {sc.daysHeld} {sc.daysHeld === 1 ? "day" : "days"} · Entry {formatPrice(sc.entryPrice)} → Exit {formatPrice(sc.exitPrice)}
                        </p>
                      </div>
                      <span className={`shrink-0 text-sm font-bold tabular-nums ${sc.pnl >= 0 ? "text-[--green]" : "text-[--red]"}`}>
                        {sc.pnl >= 0 ? "+" : "-"}&pound;{formatGBP(Math.abs(sc.pnl))}
                      </span>
                    </div>
                    <p className="text-xs text-[--text-secondary] leading-relaxed">
                      {sc.narrative}
                    </p>
                  </div>
                ))}
              </div>

              {scenarios.length > 3 && (
                <button
                  onClick={() => setShowAllScenarios(!showAllScenarios)}
                  className="mt-2 text-xs font-medium text-[--accent] hover:underline"
                >
                  {showAllScenarios
                    ? "Show fewer"
                    : `Show all ${scenarios.length} scenarios`}
                </button>
              )}
            </div>
          )}

          {/* Quant note */}
          <div className="bg-[--accent-light] border border-[--accent]/15 rounded-lg p-4">
            <p className="text-xs font-semibold text-[--accent] mb-1.5">The wizard&apos;s counsel</p>
            <p className="text-sm text-[--text-primary] leading-relaxed">
              {result.quantNote}
            </p>
          </div>

          {/* Recommendation */}
          <div className={`rounded-lg border p-4 ${badge.color}`}>
            <p className="text-sm leading-relaxed font-medium">{result.recommendationText}</p>
          </div>

          {/* Data quality note */}
          {result.dataQuality !== "full" && (
            <p className="text-2xs text-[--text-muted] text-center">
              {result.dataQuality === "limited"
                ? "Limited historical matches found. Results may not be statistically significant."
                : "Insufficient data for reliable analysis."}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={runTest}
              className="flex-1 px-3 py-2.5 text-sm font-medium bg-[--accent] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Run again
            </button>
            <button
              onClick={resetToConfig}
              className="flex-1 px-3 py-2.5 text-sm font-medium border border-[--border] text-[--text-secondary] rounded-lg hover:bg-[--surface-overlay] transition-colors"
            >
              Adjust parameters
            </button>
          </div>
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
          {regimeDescription(regime, direction, asset)}
        </p>
        {confidenceGrade && confidenceScore != null && (
          <p className="text-xs text-[--text-muted] mt-1">
            Current conviction: Grade {confidenceGrade} ({confidenceScore})
          </p>
        )}
      </div>

      {/* Setup summary card */}
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

      {/* Stop + target sliders */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-[--text-muted] mb-1 block">Stop loss %</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="20"
            value={stopLoss}
            onChange={(e) => setStopLoss(Math.max(0.5, Number(e.target.value)))}
            className="w-full px-3 py-2 bg-[--surface-overlay] border border-[--border] rounded-lg text-sm tabular-nums text-[--text-primary] focus:outline-none focus:border-[--accent]"
          />
        </div>
        <div>
          <label className="text-xs text-[--text-muted] mb-1 block">Target %</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="30"
            value={takeProfit}
            onChange={(e) => setTakeProfit(Math.max(0.5, Number(e.target.value)))}
            className="w-full px-3 py-2 bg-[--surface-overlay] border border-[--border] rounded-lg text-sm tabular-nums text-[--text-primary] focus:outline-none focus:border-[--accent]"
          />
        </div>
      </div>

      {/* Hold period */}
      <div>
        <label className="text-xs text-[--text-muted] mb-1.5 block">
          Maximum hold period
        </label>
        <div className="flex gap-1.5">
          {HOLD_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setMaxHoldDays(o.value)}
              className={`flex-1 px-2 py-2 text-xs font-medium rounded-lg transition-colors ${
                maxHoldDays === o.value
                  ? "bg-[--accent] text-white"
                  : "bg-[--surface-overlay] text-[--text-secondary] border border-[--border] hover:text-[--text-primary]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-2xs text-[--text-muted] mt-1">
          If neither target nor stop is hit within {holdPeriodLabel(maxHoldDays)}, the position closes at market price.
        </p>
      </div>

      {/* Lookback period */}
      <div>
        <label className="text-xs text-[--text-muted] mb-1.5 block">
          How far back to search
        </label>
        <div className="flex gap-1.5">
          {LOOKBACK_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setLookbackMonths(o.value)}
              className={`flex-1 px-2 py-2 text-xs font-medium rounded-lg transition-colors ${
                lookbackMonths === o.value
                  ? "bg-[--accent] text-white"
                  : "bg-[--surface-overlay] text-[--text-secondary] border border-[--border] hover:text-[--text-primary]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trade size + leverage */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-[--text-muted] mb-1 block">Trade amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[--text-muted]">&pound;</span>
            <input
              type="number"
              value={tradeAmount}
              onChange={(e) => setTradeAmount(Math.max(1, Number(e.target.value)))}
              className="w-full pl-7 pr-3 py-2 bg-[--surface-overlay] border border-[--border] rounded-lg text-sm tabular-nums text-[--text-primary] focus:outline-none focus:border-[--accent]"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-[--text-muted] mb-1 block">Leverage</label>
          <div className="flex gap-1">
            {LEVERAGE_OPTIONS.map(l => (
              <button
                key={l}
                onClick={() => setLeverage(l)}
                className={`flex-1 px-2 py-2 text-xs font-medium rounded-lg transition-colors ${
                  leverage === l
                    ? "bg-[--accent] text-white"
                    : "bg-[--surface-overlay] text-[--text-secondary] border border-[--border] hover:text-[--text-primary]"
                }`}
              >
                {l}x
              </button>
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

      {/* Error display */}
      {error && (
        <div className="bg-[--red-bg] border border-[--red]/20 rounded-lg p-3">
          <p className="text-xs text-[--red]">{error}</p>
        </div>
      )}

      {/* Run button */}
      <button
        onClick={runTest}
        className="w-full px-4 py-3 bg-[--accent] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
      >
        Run scenario test
      </button>
      <p className="text-2xs text-[--text-muted] text-center">
        Real price history from the last {lookbackMonths} months.
        No simulations. Every scenario shown actually happened.
      </p>
    </div>
  );
}
