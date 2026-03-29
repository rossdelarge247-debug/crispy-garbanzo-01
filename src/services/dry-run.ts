/**
 * Dry Run Simulator — Trade Daddy 2.0
 *
 * Simulates a trade idea multiple times using historical price patterns
 * and sentiment data. Tracks win rate, average return, and risk metrics.
 * When success rate exceeds a threshold, recommends going live.
 *
 * Phase 1: Uses mock price movement simulation (deterministic random)
 * Phase 2: Uses real historical data from market data provider
 */

import type { Direction } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DryRunConfig {
  asset: string;
  direction: Direction;
  entryPrice: number;
  stopLossPercent: number;   // e.g., 2.0 = 2% below entry for longs
  takeProfitPercent: number; // e.g., 3.0 = 3% above entry for longs
  maxHoldBars: number;       // max candles/periods before forced exit
  simulations: number;       // how many times to run (default 10)
}

export interface DryRunResult {
  id: string;
  config: DryRunConfig;
  runs: SimulationRun[];
  summary: DryRunSummary;
  recommendation: "go_live" | "keep_testing" | "not_ready" | "avoid";
  recommendationText: string;
  createdAt: string;
}

export interface SimulationRun {
  runNumber: number;
  entryPrice: number;
  exitPrice: number;
  exitReason: "take_profit" | "stop_loss" | "time_exit";
  returnPercent: number;
  barsHeld: number;
  won: boolean;
}

export interface DryRunSummary {
  totalRuns: number;
  wins: number;
  losses: number;
  winRate: number;           // 0-100
  avgReturn: number;         // percent
  avgWin: number;            // percent
  avgLoss: number;           // percent
  bestRun: number;           // percent
  worstRun: number;          // percent
  avgBarsHeld: number;
  profitFactor: number;      // gross profits / gross losses
}

// ---------------------------------------------------------------------------
// Simulation engine
// ---------------------------------------------------------------------------

function simulateTrade(
  config: DryRunConfig,
  runNumber: number
): SimulationRun {
  const { direction, entryPrice, stopLossPercent, takeProfitPercent, maxHoldBars } = config;

  const stopPrice = direction === "long"
    ? entryPrice * (1 - stopLossPercent / 100)
    : entryPrice * (1 + stopLossPercent / 100);

  const targetPrice = direction === "long"
    ? entryPrice * (1 + takeProfitPercent / 100)
    : entryPrice * (1 - takeProfitPercent / 100);

  // Simulate price walk with slight directional bias based on config
  // Seed with run number for reproducibility
  let seed = runNumber * 73856093 + config.asset.length * 19349663;
  function nextRandom(): number {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }

  let currentPrice = entryPrice;
  let barsHeld = 0;
  let exitReason: SimulationRun["exitReason"] = "time_exit";
  let exitPrice = entryPrice;

  // Slight bias — 52% chance of moving in the "right" direction (market has slight edge)
  const bias = 0.52;
  const volatility = entryPrice * 0.005; // 0.5% per bar

  for (let bar = 0; bar < maxHoldBars; bar++) {
    barsHeld++;

    // Random walk with bias
    const r = nextRandom();
    const move = (r < bias ? 1 : -1) * volatility * (0.5 + nextRandom());

    if (direction === "long") {
      currentPrice += move;
    } else {
      currentPrice -= move;
    }

    // Check stop loss
    if (direction === "long" && currentPrice <= stopPrice) {
      exitReason = "stop_loss";
      exitPrice = stopPrice;
      break;
    }
    if (direction === "short" && currentPrice >= stopPrice) {
      exitReason = "stop_loss";
      exitPrice = stopPrice;
      break;
    }

    // Check take profit
    if (direction === "long" && currentPrice >= targetPrice) {
      exitReason = "take_profit";
      exitPrice = targetPrice;
      break;
    }
    if (direction === "short" && currentPrice <= targetPrice) {
      exitReason = "take_profit";
      exitPrice = targetPrice;
      break;
    }

    exitPrice = currentPrice;
  }

  const returnPercent = direction === "long"
    ? ((exitPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - exitPrice) / entryPrice) * 100;

  return {
    runNumber,
    entryPrice,
    exitPrice: +exitPrice.toFixed(4),
    exitReason,
    returnPercent: +returnPercent.toFixed(2),
    barsHeld,
    won: returnPercent > 0,
  };
}

function summarizeRuns(runs: SimulationRun[]): DryRunSummary {
  const wins = runs.filter(r => r.won);
  const losses = runs.filter(r => !r.won);

  const avgReturn = runs.reduce((s, r) => s + r.returnPercent, 0) / runs.length;
  const avgWin = wins.length > 0 ? wins.reduce((s, r) => s + r.returnPercent, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, r) => s + r.returnPercent, 0) / losses.length : 0;
  const grossProfit = wins.reduce((s, r) => s + r.returnPercent, 0);
  const grossLoss = Math.abs(losses.reduce((s, r) => s + r.returnPercent, 0));

  return {
    totalRuns: runs.length,
    wins: wins.length,
    losses: losses.length,
    winRate: +(wins.length / runs.length * 100).toFixed(1),
    avgReturn: +avgReturn.toFixed(2),
    avgWin: +avgWin.toFixed(2),
    avgLoss: +avgLoss.toFixed(2),
    bestRun: +Math.max(...runs.map(r => r.returnPercent)).toFixed(2),
    worstRun: +Math.min(...runs.map(r => r.returnPercent)).toFixed(2),
    avgBarsHeld: +(runs.reduce((s, r) => s + r.barsHeld, 0) / runs.length).toFixed(1),
    profitFactor: grossLoss > 0 ? +(grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? 99 : 0,
  };
}

function getRecommendation(summary: DryRunSummary): {
  recommendation: DryRunResult["recommendation"];
  text: string;
} {
  if (summary.winRate >= 65 && summary.profitFactor >= 1.5 && summary.avgReturn > 0.5) {
    return {
      recommendation: "go_live",
      text: `This setup won ${summary.winRate}% of the time with a ${summary.profitFactor}x profit factor. Daddy says this one's ready for a real trade — start small.`,
    };
  }
  if (summary.winRate >= 50 && summary.profitFactor >= 1.0) {
    return {
      recommendation: "keep_testing",
      text: `Win rate is ${summary.winRate}% with a ${summary.profitFactor}x profit factor. Not bad, but Daddy wants to see more consistency. Run a few more sessions.`,
    };
  }
  if (summary.winRate >= 40) {
    return {
      recommendation: "not_ready",
      text: `Win rate is only ${summary.winRate}%. The edge isn't strong enough yet. Keep this on the watchlist and check back when conditions change.`,
    };
  }
  return {
    recommendation: "avoid",
    text: `This setup only won ${summary.winRate}% of the time. Daddy says skip this one — the risk isn't worth it right now.`,
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function runDrySimulation(config: DryRunConfig): DryRunResult {
  const runs: SimulationRun[] = [];
  const numSims = config.simulations || 10;

  for (let i = 0; i < numSims; i++) {
    runs.push(simulateTrade(config, i));
  }

  const summary = summarizeRuns(runs);
  const { recommendation, text } = getRecommendation(summary);

  return {
    id: `dry-${config.asset}-${config.direction}-${Date.now()}`,
    config,
    runs,
    summary,
    recommendation,
    recommendationText: text,
    createdAt: new Date().toISOString(),
  };
}
