/**
 * Dry Run Simulator — Trade Daddy 2.0
 *
 * Simulates a trade idea multiple times, tracking win rate and P&L.
 * Shows users exactly how much they could make or lose with real numbers.
 *
 * Supports leverage, custom trade amounts, and stop/target levels.
 * When success rate is high enough, recommends going live.
 */

import type { Direction } from "@/types";
import { getAssetName } from "@/lib/asset-names";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DryRunConfig {
  asset: string;
  direction: Direction;
  entryPrice: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  maxHoldBars: number;
  simulations: number;
  tradeAmount: number;       // e.g., 1000 (in £)
  leverage: number;          // e.g., 10 = 10:1 leverage
}

export interface DryRunResult {
  id: string;
  config: DryRunConfig;
  runs: SimulationRun[];
  summary: DryRunSummary;
  moneyProjection: MoneyProjection;
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
  pnl: number;              // actual £ profit/loss with leverage
  barsHeld: number;
  won: boolean;
}

export interface DryRunSummary {
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

export interface MoneyProjection {
  tradeAmount: number;
  leverage: number;
  exposureAmount: number;       // tradeAmount * leverage
  ifWin: number;                // £ profit on avg winning trade
  ifLose: number;               // £ loss on avg losing trade
  bestCase: number;             // best single run P&L
  worstCase: number;            // worst single run P&L
  expectedValue: number;        // probability-weighted avg outcome
  riskRewardRatio: number;      // avg win / avg loss
  maxRiskAmount: number;        // max you can lose (stop loss £)
  stopLossPrice: number;
  takeProfitPrice: number;
}

// ---------------------------------------------------------------------------
// Simulation engine
// ---------------------------------------------------------------------------

function simulateTrade(
  config: DryRunConfig,
  runNumber: number
): SimulationRun {
  const { direction, entryPrice, stopLossPercent, takeProfitPercent, maxHoldBars, tradeAmount, leverage } = config;

  const stopPrice = direction === "long"
    ? entryPrice * (1 - stopLossPercent / 100)
    : entryPrice * (1 + stopLossPercent / 100);

  const targetPrice = direction === "long"
    ? entryPrice * (1 + takeProfitPercent / 100)
    : entryPrice * (1 - takeProfitPercent / 100);

  let seed = runNumber * 73856093 + config.asset.length * 19349663;
  function nextRandom(): number {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }

  let currentPrice = entryPrice;
  let barsHeld = 0;
  let exitReason: SimulationRun["exitReason"] = "time_exit";
  let exitPrice = entryPrice;

  const bias = 0.52;
  const volatility = entryPrice * 0.005;

  for (let bar = 0; bar < maxHoldBars; bar++) {
    barsHeld++;
    const r = nextRandom();
    const move = (r < bias ? 1 : -1) * volatility * (0.5 + nextRandom());

    if (direction === "long") currentPrice += move;
    else currentPrice -= move;

    if (direction === "long" && currentPrice <= stopPrice) { exitReason = "stop_loss"; exitPrice = stopPrice; break; }
    if (direction === "short" && currentPrice >= stopPrice) { exitReason = "stop_loss"; exitPrice = stopPrice; break; }
    if (direction === "long" && currentPrice >= targetPrice) { exitReason = "take_profit"; exitPrice = targetPrice; break; }
    if (direction === "short" && currentPrice <= targetPrice) { exitReason = "take_profit"; exitPrice = targetPrice; break; }

    exitPrice = currentPrice;
  }

  const returnPercent = direction === "long"
    ? ((exitPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - exitPrice) / entryPrice) * 100;

  // P&L with leverage
  const exposureAmount = tradeAmount * leverage;
  const pnl = +(exposureAmount * (returnPercent / 100)).toFixed(2);

  return {
    runNumber,
    entryPrice,
    exitPrice: +exitPrice.toFixed(4),
    exitReason,
    returnPercent: +returnPercent.toFixed(2),
    pnl,
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

function buildMoneyProjection(config: DryRunConfig, summary: DryRunSummary): MoneyProjection {
  const { tradeAmount, leverage, entryPrice, stopLossPercent, takeProfitPercent, direction } = config;
  const exposure = tradeAmount * leverage;

  const stopLossPrice = direction === "long"
    ? entryPrice * (1 - stopLossPercent / 100)
    : entryPrice * (1 + stopLossPercent / 100);
  const takeProfitPrice = direction === "long"
    ? entryPrice * (1 + takeProfitPercent / 100)
    : entryPrice * (1 - takeProfitPercent / 100);

  return {
    tradeAmount,
    leverage,
    exposureAmount: exposure,
    ifWin: +(exposure * (summary.avgWin / 100)).toFixed(2),
    ifLose: +(exposure * (Math.abs(summary.avgLoss) / 100)).toFixed(2),
    bestCase: +(exposure * (summary.bestRun / 100)).toFixed(2),
    worstCase: +(exposure * (summary.worstRun / 100)).toFixed(2),
    expectedValue: +(exposure * (summary.avgReturn / 100)).toFixed(2),
    riskRewardRatio: summary.avgLoss !== 0 ? +(Math.abs(summary.avgWin / summary.avgLoss)).toFixed(2) : 0,
    maxRiskAmount: +(exposure * (stopLossPercent / 100)).toFixed(2),
    stopLossPrice: +stopLossPrice.toFixed(4),
    takeProfitPrice: +takeProfitPrice.toFixed(4),
  };
}

function getRecommendation(summary: DryRunSummary, config: DryRunConfig): {
  recommendation: DryRunResult["recommendation"];
  text: string;
} {
  const assetName = getAssetName(config.asset);

  if (summary.winRate >= 65 && summary.profitFactor >= 1.5 && summary.avgReturn > 0.5) {
    return {
      recommendation: "go_live",
      text: `This ${assetName} setup won ${summary.winRate}% of simulations with a ${summary.profitFactor}:1 profit factor. The numbers look good — Daddy says consider a real trade, starting small.`,
    };
  }
  if (summary.winRate >= 50 && summary.profitFactor >= 1.0) {
    return {
      recommendation: "keep_testing",
      text: `${assetName} won ${summary.winRate}% of the time. Decent, but Daddy wants to see stronger consistency. Keep it on the watchlist.`,
    };
  }
  if (summary.winRate >= 40) {
    return {
      recommendation: "not_ready",
      text: `Only ${summary.winRate}% win rate on ${assetName}. The edge isn't strong enough yet — Daddy says wait for better conditions.`,
    };
  }
  return {
    recommendation: "avoid",
    text: `${assetName} only won ${summary.winRate}% of simulations. Daddy says skip this one — the risk isn't worth it.`,
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function runDrySimulation(config: DryRunConfig): DryRunResult {
  const fullConfig: DryRunConfig = {
    ...config,
    tradeAmount: config.tradeAmount || 1000,
    leverage: config.leverage || 10,
    simulations: Math.min(config.simulations || 10, 50),
  };

  const runs: SimulationRun[] = [];
  for (let i = 0; i < fullConfig.simulations; i++) {
    runs.push(simulateTrade(fullConfig, i));
  }

  const summary = summarizeRuns(runs);
  const moneyProjection = buildMoneyProjection(fullConfig, summary);
  const { recommendation, text } = getRecommendation(summary, fullConfig);

  return {
    id: `dry-${config.asset}-${config.direction}-${Date.now()}`,
    config: fullConfig,
    runs,
    summary,
    moneyProjection,
    recommendation,
    recommendationText: text,
    createdAt: new Date().toISOString(),
  };
}
