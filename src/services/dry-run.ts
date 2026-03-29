/**
 * Dry Run Simulator — Trade Wizard 2.0
 *
 * Simulates a trade idea multiple times, tracking win rate and P&L.
 * Shows users exactly how much they could make or lose with real numbers.
 *
 * Supports leverage, custom trade amounts, and stop/target levels.
 * Asset-class volatility profiles give each instrument realistic behaviour.
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
// Asset-class volatility profiles
// ---------------------------------------------------------------------------

interface AssetProfile {
  volatilityMultiplier: number;  // relative to base 0.5% per bar
  trendBias: number;             // 0.5 = neutral, 0.55 = slight upward drift
  meanReversionStrength: number; // 0-1, how quickly it snaps back
  gapProbability: number;        // chance of a large gap move per bar
  gapMagnitude: number;          // size of gap as fraction of normal move
}

const ASSET_PROFILES: Record<string, AssetProfile> = {
  // Crypto — high vol, gappy, slight upward drift historically
  "BTC-USD": { volatilityMultiplier: 3.5, trendBias: 0.53, meanReversionStrength: 0.15, gapProbability: 0.04, gapMagnitude: 3.0 },
  "ETH-USD": { volatilityMultiplier: 4.0, trendBias: 0.52, meanReversionStrength: 0.12, gapProbability: 0.05, gapMagnitude: 3.5 },
  "SOL-USD": { volatilityMultiplier: 5.0, trendBias: 0.52, meanReversionStrength: 0.10, gapProbability: 0.06, gapMagnitude: 4.0 },
  "DOGE-USD": { volatilityMultiplier: 6.0, trendBias: 0.51, meanReversionStrength: 0.08, gapProbability: 0.08, gapMagnitude: 5.0 },
  "XRP-USD":  { volatilityMultiplier: 4.5, trendBias: 0.51, meanReversionStrength: 0.12, gapProbability: 0.06, gapMagnitude: 4.0 },
  "ADA-USD":  { volatilityMultiplier: 4.2, trendBias: 0.51, meanReversionStrength: 0.12, gapProbability: 0.05, gapMagnitude: 3.5 },

  // Forex — low vol, mean-reverting, minimal gaps
  "EUR-USD": { volatilityMultiplier: 0.4, trendBias: 0.51, meanReversionStrength: 0.35, gapProbability: 0.005, gapMagnitude: 1.5 },
  "GBP-USD": { volatilityMultiplier: 0.6, trendBias: 0.51, meanReversionStrength: 0.30, gapProbability: 0.01, gapMagnitude: 1.8 },
  "USD-JPY":  { volatilityMultiplier: 0.5, trendBias: 0.51, meanReversionStrength: 0.30, gapProbability: 0.005, gapMagnitude: 1.5 },
  "AUD-USD": { volatilityMultiplier: 0.55, trendBias: 0.51, meanReversionStrength: 0.30, gapProbability: 0.005, gapMagnitude: 1.5 },
  "USD-CAD": { volatilityMultiplier: 0.50, trendBias: 0.51, meanReversionStrength: 0.30, gapProbability: 0.005, gapMagnitude: 1.5 },
  "USD-CHF": { volatilityMultiplier: 0.45, trendBias: 0.51, meanReversionStrength: 0.35, gapProbability: 0.005, gapMagnitude: 1.5 },

  // US stocks — moderate vol, overnight gaps, slight upward drift
  "AAPL": { volatilityMultiplier: 1.2, trendBias: 0.53, meanReversionStrength: 0.20, gapProbability: 0.03, gapMagnitude: 2.0 },
  "MSFT": { volatilityMultiplier: 1.1, trendBias: 0.53, meanReversionStrength: 0.22, gapProbability: 0.03, gapMagnitude: 2.0 },
  "NVDA": { volatilityMultiplier: 2.2, trendBias: 0.54, meanReversionStrength: 0.18, gapProbability: 0.04, gapMagnitude: 2.5 },
  "TSLA": { volatilityMultiplier: 2.8, trendBias: 0.52, meanReversionStrength: 0.15, gapProbability: 0.05, gapMagnitude: 3.0 },
  "GOOGL": { volatilityMultiplier: 1.3, trendBias: 0.53, meanReversionStrength: 0.20, gapProbability: 0.03, gapMagnitude: 2.0 },
  "AMZN": { volatilityMultiplier: 1.4, trendBias: 0.53, meanReversionStrength: 0.18, gapProbability: 0.03, gapMagnitude: 2.2 },
  "META": { volatilityMultiplier: 1.8, trendBias: 0.53, meanReversionStrength: 0.18, gapProbability: 0.04, gapMagnitude: 2.5 },
  "COIN": { volatilityMultiplier: 3.5, trendBias: 0.52, meanReversionStrength: 0.15, gapProbability: 0.05, gapMagnitude: 3.0 },

  // Commodities — trending, seasonal
  "BZ=F": { volatilityMultiplier: 1.5, trendBias: 0.51, meanReversionStrength: 0.25, gapProbability: 0.02, gapMagnitude: 2.0 },
  "CL=F": { volatilityMultiplier: 1.8, trendBias: 0.51, meanReversionStrength: 0.22, gapProbability: 0.025, gapMagnitude: 2.2 },
  "GC=F": { volatilityMultiplier: 0.9, trendBias: 0.52, meanReversionStrength: 0.28, gapProbability: 0.01, gapMagnitude: 1.8 },
  "SI=F": { volatilityMultiplier: 1.4, trendBias: 0.52, meanReversionStrength: 0.25, gapProbability: 0.015, gapMagnitude: 2.0 },
  "NG=F": { volatilityMultiplier: 3.0, trendBias: 0.50, meanReversionStrength: 0.20, gapProbability: 0.03, gapMagnitude: 2.5 },

  // Indices — moderate vol, slight upward drift
  "SPY": { volatilityMultiplier: 1.0, trendBias: 0.53, meanReversionStrength: 0.25, gapProbability: 0.02, gapMagnitude: 1.8 },
  "QQQ": { volatilityMultiplier: 1.2, trendBias: 0.53, meanReversionStrength: 0.22, gapProbability: 0.025, gapMagnitude: 2.0 },
  "DIA": { volatilityMultiplier: 0.9, trendBias: 0.53, meanReversionStrength: 0.25, gapProbability: 0.02, gapMagnitude: 1.8 },
};

const DEFAULT_PROFILE: AssetProfile = {
  volatilityMultiplier: 1.0,
  trendBias: 0.52,
  meanReversionStrength: 0.20,
  gapProbability: 0.02,
  gapMagnitude: 2.0,
};

function getAssetProfile(asset: string): AssetProfile {
  return ASSET_PROFILES[asset] ?? DEFAULT_PROFILE;
}

// ---------------------------------------------------------------------------
// Simulation engine
// ---------------------------------------------------------------------------

function simulateTrade(
  config: DryRunConfig,
  runNumber: number
): SimulationRun {
  const { direction, entryPrice, stopLossPercent, takeProfitPercent, maxHoldBars, tradeAmount, leverage } = config;
  const profile = getAssetProfile(config.asset);

  const stopPrice = direction === "long"
    ? entryPrice * (1 - stopLossPercent / 100)
    : entryPrice * (1 + stopLossPercent / 100);

  const targetPrice = direction === "long"
    ? entryPrice * (1 + takeProfitPercent / 100)
    : entryPrice * (1 - takeProfitPercent / 100);

  // Deterministic but varied RNG per run
  let seed = runNumber * 73856093 + config.asset.length * 19349663 + Math.floor(entryPrice);
  function nextRandom(): number {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }

  const baseVolatility = entryPrice * 0.005 * profile.volatilityMultiplier;
  const bias = profile.trendBias;

  let currentPrice = entryPrice;
  let barsHeld = 0;
  let exitReason: SimulationRun["exitReason"] = "time_exit";
  let exitPrice = entryPrice;

  for (let bar = 0; bar < maxHoldBars; bar++) {
    barsHeld++;

    // Base move with bias
    const r = nextRandom();
    const moveDir = r < bias ? 1 : -1;
    const moveSize = baseVolatility * (0.3 + nextRandom() * 1.4);

    // Occasional gap move (earnings, news shock)
    const gapRoll = nextRandom();
    const gapFactor = gapRoll < profile.gapProbability
      ? profile.gapMagnitude * (nextRandom() < 0.5 ? 1 : -1)
      : 1;

    // Mean reversion pull toward entry
    const reversion = (entryPrice - currentPrice) * profile.meanReversionStrength * nextRandom();

    const totalMove = moveDir * moveSize * gapFactor + reversion;

    if (direction === "long") currentPrice += totalMove;
    else currentPrice -= totalMove;

    // Check stop/target
    if (direction === "long" && currentPrice <= stopPrice) { exitReason = "stop_loss"; exitPrice = stopPrice; break; }
    if (direction === "short" && currentPrice >= stopPrice) { exitReason = "stop_loss"; exitPrice = stopPrice; break; }
    if (direction === "long" && currentPrice >= targetPrice) { exitReason = "take_profit"; exitPrice = targetPrice; break; }
    if (direction === "short" && currentPrice <= targetPrice) { exitReason = "take_profit"; exitPrice = targetPrice; break; }

    exitPrice = currentPrice;
  }

  const returnPercent = direction === "long"
    ? ((exitPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - exitPrice) / entryPrice) * 100;

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

// Default stop/target percentages by risk style and asset class
export function getDefaultStopLoss(asset: string, riskStyle: "cautious" | "balanced" | "aggressive" = "balanced"): number {
  const profile = getAssetProfile(asset);
  // More volatile assets warrant wider stops
  const baseStop = profile.volatilityMultiplier < 0.7 ? 1.0 :  // forex
    profile.volatilityMultiplier < 1.5 ? 2.0 :  // stocks/indices
    profile.volatilityMultiplier < 3.0 ? 3.0 :  // high-vol stocks
    5.0;  // crypto
  const multiplier = riskStyle === "cautious" ? 0.8 : riskStyle === "aggressive" ? 1.3 : 1.0;
  return +(baseStop * multiplier).toFixed(1);
}

export function getDefaultTakeProfit(asset: string, riskStyle: "cautious" | "balanced" | "aggressive" = "balanced"): number {
  const stop = getDefaultStopLoss(asset, riskStyle);
  // Target 1.5:1 to 2.5:1 R:R depending on risk style
  const rrMultiplier = riskStyle === "cautious" ? 1.5 : riskStyle === "aggressive" ? 2.5 : 2.0;
  return +(stop * rrMultiplier).toFixed(1);
}

function getRecommendation(summary: DryRunSummary, config: DryRunConfig): {
  recommendation: DryRunResult["recommendation"];
  text: string;
} {
  const assetName = getAssetName(config.asset);
  const profile = getAssetProfile(config.asset);
  const assetNote = profile.volatilityMultiplier > 3 ? " (high-vol asset — use small size)" : "";

  if (summary.winRate >= 65 && summary.profitFactor >= 1.5 && summary.avgReturn > 0.5) {
    return {
      recommendation: "go_live",
      text: `This ${assetName} setup won ${summary.winRate}% of simulations with a ${summary.profitFactor}:1 profit factor. The signs are clear — consider a real trade, starting small${assetNote}.`,
    };
  }
  if (summary.winRate >= 50 && summary.profitFactor >= 1.0) {
    return {
      recommendation: "keep_testing",
      text: `${assetName} won ${summary.winRate}% of the time. Decent, but the wizard wants to see stronger consistency. Keep it on the watchlist${assetNote}.`,
    };
  }
  if (summary.winRate >= 40) {
    return {
      recommendation: "not_ready",
      text: `Only ${summary.winRate}% win rate on ${assetName}. The edge isn't strong enough yet — patience. Wait for better conditions.`,
    };
  }
  return {
    recommendation: "avoid",
    text: `${assetName} only won ${summary.winRate}% of simulations. This path leads nowhere good — the risk isn't worth it.`,
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
    stopLossPercent: config.stopLossPercent || getDefaultStopLoss(config.asset),
    takeProfitPercent: config.takeProfitPercent || getDefaultTakeProfit(config.asset),
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
