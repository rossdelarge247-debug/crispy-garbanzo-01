"use client";

import { useState } from "react";
import type { Direction } from "@/types";
import LoadingState from "@/components/LoadingState";

interface DryRunPanelProps {
  asset: string;
  assetName: string;
  direction: Direction;
  entryPrice: number;
}

interface SimRun {
  runNumber: number;
  exitReason: "take_profit" | "stop_loss" | "time_exit";
  returnPercent: number;
  barsHeld: number;
  won: boolean;
}

interface DryRunResult {
  id: string;
  runs: SimRun[];
  summary: {
    totalRuns: number;
    wins: number;
    losses: number;
    winRate: number;
    avgReturn: number;
    avgWin: number;
    avgLoss: number;
    bestRun: number;
    worstRun: number;
    profitFactor: number;
  };
  recommendation: "go_live" | "keep_testing" | "not_ready" | "avoid";
  recommendationText: string;
}

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

export default function DryRunPanel({ asset, assetName, direction, entryPrice }: DryRunPanelProps) {
  const [result, setResult] = useState<DryRunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [simCount, setSimCount] = useState(10);

  async function runSimulation() {
    setLoading(true);
    try {
      const res = await fetch("/api/dry-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset,
          direction,
          entryPrice,
          stopLossPercent: 2,
          takeProfitPercent: 3,
          maxHoldBars: 20,
          simulations: simCount,
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setResult(await res.json());
    } catch {
      // silently fail
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="bg-surface-raised rounded-xl border border-surface-border p-6">
        <LoadingState title={`Running ${simCount} simulations...`} subtitle={`Testing ${direction} ${asset} with 2% stop, 3% target`} />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-surface-raised rounded-xl border border-surface-border p-5">
        <p className="text-sm text-text-secondary mb-3">
          Run a dry simulation to see how this trade idea would have performed.
          Daddy will test it {simCount} times and track the win rate.
        </p>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-text-muted">Simulations:</span>
          {[10, 20, 50].map(n => (
            <button
              key={n}
              onClick={() => setSimCount(n)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                simCount === n ? "bg-accent text-white" : "bg-surface-overlay text-text-secondary hover:text-text-primary"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={runSimulation}
          className="w-full px-4 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:shadow-card transition-all"
        >
          Run dry simulation — {direction} {asset} at {entryPrice.toLocaleString()}
        </button>
        <p className="text-xs text-text-muted mt-2 text-center">
          No real money. Just math. Takes a few seconds.
        </p>
      </div>
    );
  }

  const { summary: s } = result;

  return (
    <div className="bg-surface-raised rounded-xl border border-surface-border overflow-hidden">
      {/* Recommendation banner */}
      <div className={`px-4 py-2.5 border-b ${recColor(result.recommendation)}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{recLabel(result.recommendation)}</span>
          <span className="text-xs font-mono">{s.winRate}% win rate</span>
        </div>
      </div>

      {/* Results */}
      <div className="p-4">
        <p className="text-sm text-text-secondary mb-4">{result.recommendationText}</p>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center">
            <div className="text-lg font-mono font-bold text-text-primary">{s.wins}/{s.totalRuns}</div>
            <div className="text-xs text-text-muted">Won</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-mono font-bold ${s.avgReturn >= 0 ? "text-conviction-high" : "text-conviction-danger"}`}>
              {s.avgReturn > 0 ? "+" : ""}{s.avgReturn}%
            </div>
            <div className="text-xs text-text-muted">Avg return</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-mono font-bold text-conviction-high">+{s.avgWin}%</div>
            <div className="text-xs text-text-muted">Avg win</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-mono font-bold text-conviction-danger">{s.avgLoss}%</div>
            <div className="text-xs text-text-muted">Avg loss</div>
          </div>
        </div>

        {/* Individual runs */}
        <div className="flex gap-1 mb-4">
          {result.runs.map((run) => (
            <div
              key={run.runNumber}
              className={`flex-1 h-6 rounded-sm flex items-center justify-center text-xs font-mono ${
                run.won ? "bg-conviction-high/20 text-conviction-high" : "bg-conviction-danger/20 text-conviction-danger"
              }`}
              title={`Run ${run.runNumber + 1}: ${run.returnPercent > 0 ? "+" : ""}${run.returnPercent}% (${run.exitReason})`}
            >
              {run.won ? "✓" : "✗"}
            </div>
          ))}
        </div>

        {/* Extra stats */}
        <div className="flex items-center justify-between text-xs text-text-muted border-t border-surface-border pt-3">
          <span>Best: +{s.bestRun}%</span>
          <span>Worst: {s.worstRun}%</span>
          <span>Profit factor: {s.profitFactor}x</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={runSimulation}
          className="flex-1 px-3 py-2 text-xs font-medium border border-surface-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-all"
        >
          Run again ({simCount}x)
        </button>
        {result.recommendation === "go_live" && (
          <button className="flex-1 px-3 py-2 text-xs font-medium bg-accent text-white rounded-lg hover:shadow-card transition-all">
            Start paper trade
          </button>
        )}
      </div>
    </div>
  );
}
