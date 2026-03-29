"use client";

import { useState } from "react";
import type { Direction } from "@/types";
import { getAssetName } from "@/lib/asset-names";
import LoadingState from "@/components/LoadingState";

/* ------------------------------------------------------------------ */
/*  Types (mirrors services/dry-run.ts)                                */
/* ------------------------------------------------------------------ */

interface SimulationRun {
  runNumber: number;
  entryPrice: number;
  exitPrice: number;
  exitReason: "take_profit" | "stop_loss" | "time_exit";
  returnPercent: number;
  pnl: number;
  barsHeld: number;
  won: boolean;
}

interface DryRunSummary {
  totalRuns: number;
  wins: number;
  losses: number;
  winRate: number;
  avgReturn: number;
  avgWin: number;
  avgLoss: number;
  bestRun: number;
  worstRun: number;
  avgBarsHeld: number;
  profitFactor: number;
}

interface MoneyProjection {
  tradeAmount: number;
  leverage: number;
  exposureAmount: number;
  ifWin: number;
  ifLose: number;
  bestCase: number;
  worstCase: number;
  expectedValue: number;
  riskRewardRatio: number;
  maxRiskAmount: number;
  stopLossPrice: number;
  takeProfitPrice: number;
}

interface DryRunResult {
  id: string;
  config: {
    asset: string;
    direction: Direction;
    entryPrice: number;
    stopLossPercent: number;
    takeProfitPercent: number;
    maxHoldBars: number;
    simulations: number;
    tradeAmount: number;
    leverage: number;
  };
  runs: SimulationRun[];
  summary: DryRunSummary;
  moneyProjection: MoneyProjection;
  recommendation: "go_live" | "keep_testing" | "not_ready" | "avoid";
  recommendationText: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface DryRunPanelProps {
  asset: string;
  assetName: string;
  direction: Direction;
  entryPrice: number;
  livePrice?: number | null;  // overrides entryPrice if provided
  isLive?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function recColor(rec: string) {
  switch (rec) {
    case "go_live": return "bg-conviction-high/15 text-conviction-high border-conviction-high/25";
    case "keep_testing": return "bg-conviction-medium/15 text-conviction-medium border-conviction-medium/25";
    case "not_ready": return "bg-surface-overlay text-text-muted border-surface-border";
    case "avoid": return "bg-conviction-danger/15 text-conviction-danger border-conviction-danger/25";
    default: return "bg-surface-overlay text-text-muted border-surface-border";
  }
}

function recLabel(rec: string) {
  switch (rec) {
    case "go_live": return "Ready to go live";
    case "keep_testing": return "Keep testing";
    case "not_ready": return "Not ready yet";
    case "avoid": return "Skip this one";
    default: return rec;
  }
}

function formatGBP(value: number): string {
  const abs = Math.abs(value);
  return abs.toFixed(2);
}

const LEVERAGE_OPTIONS = [5, 10, 20, 50] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DryRunPanel({ asset, assetName, direction, entryPrice, livePrice, isLive }: DryRunPanelProps) {
  const [result, setResult] = useState<DryRunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAllRuns, setShowAllRuns] = useState(false);

  // Configurable inputs
  const [tradeAmount, setTradeAmount] = useState(1000);
  const [leverage, setLeverage] = useState(10);
  const [stopLoss, setStopLoss] = useState(2);
  const [takeProfit, setTakeProfit] = useState(3);
  const [simCount, setSimCount] = useState(10);

  // Use live price if available, else fall back to historical last bar
  const effectiveEntryPrice = livePrice ?? entryPrice;

  // Derived
  const exposure = tradeAmount * leverage;
  const maxRisk = exposure * (stopLoss / 100);
  const humanName = getAssetName(asset);

  async function runSimulation() {
    setLoading(true);
    setResult(null);
    setShowAllRuns(false);
    try {
      const res = await fetch("/api/dry-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset,
          direction,
          entryPrice: effectiveEntryPrice,
          stopLossPercent: stopLoss,
          takeProfitPercent: takeProfit,
          maxHoldBars: 20,
          simulations: simCount,
          tradeAmount,
          leverage,
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data: DryRunResult = await res.json();
      setResult(data);

      // Store in localStorage for dashboard
      try {
        const stored = JSON.parse(localStorage.getItem("trade-daddy-dry-runs") || "[]");
        stored.unshift(data);
        localStorage.setItem("trade-daddy-dry-runs", JSON.stringify(stored.slice(0, 20)));
      } catch {
        // silently fail
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }

  function resetToConfig() {
    setResult(null);
    setShowAllRuns(false);
  }

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="bg-surface-raised rounded-xl border border-surface-border p-6">
        <LoadingState
          title={`Running ${simCount} simulations...`}
          subtitle={`Testing ${direction === "long" ? "long" : "short"} on ${humanName} with ${stopLoss}% stop, ${takeProfit}% target`}
        />
      </div>
    );
  }

  /* ---- Config state (no result yet) ---- */
  if (!result) {
    return (
      <div className="bg-surface-raised rounded-xl border border-surface-border p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-0.5">Test this trade</h3>
            <p className="text-xs text-text-secondary">
              {simCount} simulations · {direction === "long" ? "long" : "short"} position on {humanName}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs text-text-muted">Entry price</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm font-semibold font-mono tabular-nums text-text-primary">
                {effectiveEntryPrice >= 100
                  ? effectiveEntryPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })
                  : effectiveEntryPrice.toFixed(4)}
              </span>
              {isLive && (
                <span className="flex items-center gap-1 text-2xs font-medium text-conviction-high">
                  <span className="w-1 h-1 rounded-full bg-conviction-high animate-pulse-dot" />
                  Live
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Trade amount */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-text-muted mb-1 block">Trade amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">&pound;</span>
              <input
                type="number"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(Math.max(1, Number(e.target.value)))}
                className="w-full pl-7 pr-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm font-mono text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">Simulations</label>
            <div className="flex gap-1">
              {[10, 20, 50].map(n => (
                <button
                  key={n}
                  onClick={() => setSimCount(n)}
                  className={`flex-1 px-2 py-2 text-xs font-medium rounded-lg transition-colors ${
                    simCount === n ? "bg-accent text-white" : "bg-surface-overlay text-text-secondary hover:text-text-primary border border-surface-border"
                  }`}
                >
                  {n}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Leverage */}
        <div className="mb-4">
          <label className="text-xs text-text-muted mb-1 block">Leverage</label>
          <div className="flex gap-1">
            {LEVERAGE_OPTIONS.map(l => (
              <button
                key={l}
                onClick={() => setLeverage(l)}
                className={`flex-1 px-2 py-2 text-xs font-medium rounded-lg transition-colors ${
                  leverage === l ? "bg-accent text-white" : "bg-surface-overlay text-text-secondary hover:text-text-primary border border-surface-border"
                }`}
              >
                {l}x
              </button>
            ))}
          </div>
        </div>

        {/* Stop loss + take profit */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-text-muted mb-1 block">Stop loss %</label>
            <input
              type="number"
              step="0.5"
              min="0.1"
              value={stopLoss}
              onChange={(e) => setStopLoss(Math.max(0.1, Number(e.target.value)))}
              className="w-full px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm font-mono text-text-primary focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">Take profit %</label>
            <input
              type="number"
              step="0.5"
              min="0.1"
              value={takeProfit}
              onChange={(e) => setTakeProfit(Math.max(0.1, Number(e.target.value)))}
              className="w-full px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm font-mono text-text-primary focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Calculated exposure */}
        <div className="bg-surface-overlay rounded-lg p-3 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-text-muted">Your exposure</p>
            <p className="text-sm font-mono font-bold text-text-primary">&pound;{exposure.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">Max risk</p>
            <p className="text-sm font-mono font-bold text-conviction-danger">&pound;{formatGBP(maxRisk)}</p>
          </div>
        </div>

        {/* Run button */}
        <button
          onClick={runSimulation}
          className="w-full px-4 py-3 bg-accent text-white text-sm font-semibold rounded-lg hover:shadow-card transition-all"
        >
          Run simulation
        </button>
        <p className="text-xs text-text-muted mt-2 text-center">
          No real money. Just math.
        </p>
      </div>
    );
  }

  /* ---- Results state ---- */
  const { summary: s, moneyProjection: mp } = result;
  const winRateColor = s.winRate >= 60 ? "text-conviction-high" : s.winRate >= 45 ? "text-conviction-medium" : "text-conviction-danger";

  return (
    <div className="bg-surface-raised rounded-xl border border-surface-border overflow-hidden">
      {/* Recommendation banner */}
      <div className={`px-4 py-3 border-b ${recColor(result.recommendation)}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{recLabel(result.recommendation)}</span>
          <span className="text-xs font-mono font-semibold">{s.winRate}% win rate</span>
        </div>
      </div>

      <div className="p-5">
        {/* Header */}
        <h3 className="text-sm font-semibold text-text-primary mb-1">Simulation complete</h3>
        <p className="text-xs text-text-muted mb-4">{s.totalRuns} runs on {humanName}</p>

        {/* Big win rate */}
        <div className="text-center mb-5">
          <div className={`text-4xl font-mono font-bold ${winRateColor}`}>{s.winRate}%</div>
          <div className="text-xs text-text-muted mt-1">win rate</div>
        </div>

        {/* Money results grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-surface-overlay rounded-lg p-3">
            <p className="text-xs text-text-muted mb-0.5">If you win</p>
            <p className="text-sm font-mono font-bold text-conviction-high">+&pound;{formatGBP(mp.ifWin)}</p>
          </div>
          <div className="bg-surface-overlay rounded-lg p-3">
            <p className="text-xs text-text-muted mb-0.5">If you lose</p>
            <p className="text-sm font-mono font-bold text-conviction-danger">-&pound;{formatGBP(mp.ifLose)}</p>
          </div>
          <div className="bg-surface-overlay rounded-lg p-3">
            <p className="text-xs text-text-muted mb-0.5">Best case</p>
            <p className="text-sm font-mono font-bold text-conviction-high">+&pound;{formatGBP(mp.bestCase)}</p>
          </div>
          <div className="bg-surface-overlay rounded-lg p-3">
            <p className="text-xs text-text-muted mb-0.5">Worst case</p>
            <p className="text-sm font-mono font-bold text-conviction-danger">-&pound;{formatGBP(Math.abs(mp.worstCase))}</p>
          </div>
          <div className="bg-surface-overlay rounded-lg p-3">
            <p className="text-xs text-text-muted mb-0.5">Expected value</p>
            <p className={`text-sm font-mono font-bold ${mp.expectedValue >= 0 ? "text-conviction-high" : "text-conviction-danger"}`}>
              {mp.expectedValue >= 0 ? "+" : "-"}&pound;{formatGBP(Math.abs(mp.expectedValue))} per trade
            </p>
          </div>
          <div className="bg-surface-overlay rounded-lg p-3">
            <p className="text-xs text-text-muted mb-0.5">Risk/reward</p>
            <p className="text-sm font-mono font-bold text-text-primary">{mp.riskRewardRatio}:1</p>
          </div>
        </div>

        {/* Individual runs as colored bars */}
        <div className="mb-4">
          <p className="text-xs text-text-muted mb-2">Individual runs</p>
          <div className="flex gap-1">
            {result.runs.map((run) => (
              <div
                key={run.runNumber}
                className={`flex-1 h-8 rounded-sm flex items-center justify-center ${
                  run.won ? "bg-conviction-high/20" : "bg-conviction-danger/20"
                }`}
                title={`Run ${run.runNumber + 1}: ${run.pnl >= 0 ? "+" : ""}${run.pnl.toFixed(2)} (${run.exitReason.replace("_", " ")})`}
              >
                <span className={`text-xs font-mono ${run.won ? "text-conviction-high" : "text-conviction-danger"}`}>
                  {run.won ? "W" : "L"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Daddy's verdict */}
        <div className={`rounded-lg border p-3 mb-4 ${recColor(result.recommendation)}`}>
          <p className="text-xs font-semibold mb-1">Daddy says:</p>
          <p className="text-sm leading-relaxed">{result.recommendationText}</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={runSimulation}
            className="flex-1 px-3 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:shadow-card transition-all"
          >
            Run again
          </button>
          <button
            onClick={resetToConfig}
            className="flex-1 px-3 py-2 text-sm font-medium border border-surface-border text-text-secondary rounded-lg hover:bg-surface-overlay transition-all"
          >
            Adjust settings
          </button>
        </div>

        {/* Expandable detailed runs table */}
        <div>
          <button
            onClick={() => setShowAllRuns(!showAllRuns)}
            className="text-xs font-medium text-accent hover:text-accent-glow transition-colors"
          >
            {showAllRuns ? "Hide" : "Show"} all {s.totalRuns} simulation runs
          </button>

          {showAllRuns && (
            <div className="mt-3 rounded-lg border border-surface-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-overlay text-text-muted">
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Exit</th>
                    <th className="px-3 py-2 text-right font-medium">Return</th>
                    <th className="px-3 py-2 text-right font-medium">P&amp;L</th>
                    <th className="px-3 py-2 text-right font-medium">Bars</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {result.runs.map((run) => (
                    <tr key={run.runNumber} className="hover:bg-surface-overlay/50">
                      <td className="px-3 py-2 font-mono text-text-muted">{run.runNumber + 1}</td>
                      <td className="px-3 py-2">
                        <span className={`font-medium ${
                          run.exitReason === "take_profit" ? "text-conviction-high" :
                          run.exitReason === "stop_loss" ? "text-conviction-danger" :
                          "text-text-muted"
                        }`}>
                          {run.exitReason === "take_profit" ? "Target hit" : run.exitReason === "stop_loss" ? "Stopped out" : "Time exit"}
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-right font-mono ${run.returnPercent >= 0 ? "text-conviction-high" : "text-conviction-danger"}`}>
                        {run.returnPercent > 0 ? "+" : ""}{run.returnPercent}%
                      </td>
                      <td className={`px-3 py-2 text-right font-mono ${run.pnl >= 0 ? "text-conviction-high" : "text-conviction-danger"}`}>
                        {run.pnl >= 0 ? "+" : ""}&pound;{run.pnl.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-text-muted">{run.barsHeld}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
