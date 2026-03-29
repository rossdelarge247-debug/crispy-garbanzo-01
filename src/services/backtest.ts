/**
 * Backtest Engine — Trade Daddy
 *
 * Signal-matched historical backtesting against real price data.
 *
 * How it works:
 * 1. Computes a "signal profile" for today — a fingerprint of current
 *    conditions (momentum, volatility, trend alignment, position, volume)
 * 2. Computes the same profile for every historical day in the dataset
 * 3. Finds the most similar historical conditions using weighted distance
 * 4. Replays the user's trade parameters on real subsequent prices
 * 5. The advisor analyses results and suggests parameter improvements
 *
 * Every scenario shown to the user actually happened.
 * Every match is based on measurable, explainable conditions.
 */

import type { Direction } from "@/types";
import { getAssetName } from "@/lib/asset-names";
import {
  computeProfile,
  computeCurrentProfile,
  findSimilarConditions,
  generateThesis,
  describeMatch,
  type SignalProfile,
  type SignalThesis,
  type SignalMatch,
} from "@/services/signal-profile";
import {
  analyseBacktest,
  type AdvisorAnalysis,
  type ParameterSuggestion,
  type FollowUpSuggestion,
} from "@/services/backtest-advisor";
import {
  synthesizeRecommendation,
  type TradeRecommendation,
} from "@/services/trade-recommendation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BacktestConfig {
  asset: string;
  direction: Direction;
  entryPrice: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  maxHoldDays: number;
  lookbackMonths: number;
  tradeAmount: number;
  leverage: number;
}

export interface HistoricalScenario {
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
  similarity: number;         // 0–100
  matchReason: string;        // why this matched
  narrative: string;
}

export interface BacktestSummary {
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

export interface MoneyProjection {
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

export interface BacktestResult {
  id: string;
  config: BacktestConfig;
  thesis: SignalThesis;
  currentProfile: SignalProfile;
  scenarios: HistoricalScenario[];
  summary: BacktestSummary;
  moneyProjection: MoneyProjection;
  advisor: AdvisorAnalysis;
  tradeRec: TradeRecommendation;   // the final synthesized recommendation
  recommendation: "strong" | "moderate" | "weak" | "against";
  recommendationText: string;
  dataQuality: "full" | "limited" | "insufficient";
  createdAt: string;
}

// Re-export types for the UI
export type { ParameterSuggestion, FollowUpSuggestion, AdvisorAnalysis, TradeRecommendation };

// ---------------------------------------------------------------------------
// Trade replay
// ---------------------------------------------------------------------------

function replayTrade(
  config: BacktestConfig,
  match: SignalMatch,
  prices: number[],
  dates: string[],
  scenarioIndex: number
): HistoricalScenario {
  const { direction, stopLossPercent, takeProfitPercent, maxHoldDays, tradeAmount, leverage } = config;
  const entry = match.profile;
  const entryPrice = entry.price;

  const stopPrice = direction === "long"
    ? entryPrice * (1 - stopLossPercent / 100)
    : entryPrice * (1 + stopLossPercent / 100);
  const targetPrice = direction === "long"
    ? entryPrice * (1 + takeProfitPercent / 100)
    : entryPrice * (1 - takeProfitPercent / 100);

  const pricePath: number[] = [entryPrice];
  const pricePathPercent: number[] = [0];

  let exitPrice = entryPrice;
  let exitReason: HistoricalScenario["exitReason"] = "time";
  let daysHeld = 0;
  let exitDate = entry.date;

  for (let d = 1; d <= maxHoldDays; d++) {
    const dayIndex = entry.dayIndex + d;
    if (dayIndex >= prices.length) break;

    const dayPrice = prices[dayIndex];
    daysHeld = d;
    exitDate = dates[dayIndex] ?? entry.date;
    pricePath.push(dayPrice);
    pricePathPercent.push(+((dayPrice - entryPrice) / entryPrice * 100).toFixed(2));

    if (direction === "long" && dayPrice <= stopPrice) { exitPrice = stopPrice; exitReason = "stop"; break; }
    if (direction === "short" && dayPrice >= stopPrice) { exitPrice = stopPrice; exitReason = "stop"; break; }
    if (direction === "long" && dayPrice >= targetPrice) { exitPrice = targetPrice; exitReason = "target"; break; }
    if (direction === "short" && dayPrice <= targetPrice) { exitPrice = targetPrice; exitReason = "target"; break; }

    exitPrice = dayPrice;
  }

  if (daysHeld === 0) daysHeld = 1;

  const returnPercent = direction === "long"
    ? ((exitPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - exitPrice) / entryPrice) * 100;

  const exposure = tradeAmount * leverage;
  const pnl = +(exposure * (returnPercent / 100)).toFixed(2);

  return {
    id: `scenario-${scenarioIndex}`,
    entryDate: entry.date,
    exitDate,
    entryPrice: +entryPrice.toFixed(4),
    exitPrice: +exitPrice.toFixed(4),
    exitReason,
    returnPercent: +returnPercent.toFixed(2),
    pnl,
    daysHeld,
    won: returnPercent > 0,
    pricePath,
    pricePathPercent,
    similarity: match.similarity,
    matchReason: "", // filled after
    narrative: "",   // filled after
  };
}

// ---------------------------------------------------------------------------
// Narrative generation
// ---------------------------------------------------------------------------

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function generateNarrative(scenario: HistoricalScenario, direction: string): string {
  const entry = formatDate(scenario.entryDate);
  const exit = formatDate(scenario.exitDate);
  const ep = formatPrice(scenario.entryPrice);
  const xp = formatPrice(scenario.exitPrice);
  const days = scenario.daysHeld;
  const dayWord = days === 1 ? "day" : "days";

  const path = scenario.pricePathPercent;
  const maxDrawdown = direction === "long" ? Math.min(...path) : -Math.max(...path);
  const maxRunup = direction === "long" ? Math.max(...path) : -Math.min(...path);

  let journey = "";
  if (scenario.exitReason === "target") {
    if (maxDrawdown < -0.5 && direction === "long") {
      journey = `Dipped ${Math.abs(maxDrawdown).toFixed(1)}% first — a test of nerve — before recovering to hit the target.`;
    } else if (days <= 2) {
      journey = `The move came swiftly. Target reached in just ${days} ${dayWord}. Precisely on time.`;
    } else {
      journey = `A steady climb over ${days} ${dayWord}. No drama, just the market finding its path to the target.`;
    }
  } else if (scenario.exitReason === "stop") {
    if (maxRunup > 0.5) {
      journey = `Looked promising at first — moved ${maxRunup.toFixed(1)}% in favour — before the wind changed. Stopped out.`;
    } else if (days <= 1) {
      journey = `Turned against the position almost immediately. The stop held, as it should.`;
    } else {
      journey = `A slow unravelling over ${days} ${dayWord}. The stop did its job.`;
    }
  } else {
    const finalReturn = scenario.returnPercent;
    if (finalReturn > 0.3) {
      journey = `Edged higher but never reached the target. Closed at the time limit — small gain, no conviction.`;
    } else if (finalReturn < -0.3) {
      journey = `Drifted lower without ever triggering the stop. Exited at the hold limit.`;
    } else {
      journey = `Sideways for ${days} ${dayWord}. The market had no opinion. Sometimes the wisest thing is to walk away.`;
    }
  }

  const returnStr = scenario.returnPercent >= 0
    ? `+${scenario.returnPercent}%`
    : `${scenario.returnPercent}%`;

  return `${entry}: Entered at ${ep}. ${journey} Exited ${exit} at ${xp} (${returnStr}).`;
}

// ---------------------------------------------------------------------------
// Summary + projection
// ---------------------------------------------------------------------------

function buildSummary(scenarios: HistoricalScenario[], config: BacktestConfig): BacktestSummary {
  if (scenarios.length === 0) {
    return { scenarioCount: 0, wins: 0, losses: 0, winRate: 0, avgReturn: 0, avgDaysHeld: 0, bestReturn: 0, worstReturn: 0, profitFactor: 0, expectancyPerTrade: 0 };
  }
  const wins = scenarios.filter(s => s.won);
  const losses = scenarios.filter(s => !s.won);
  const avgRet = scenarios.reduce((s, r) => s + r.returnPercent, 0) / scenarios.length;
  const exposure = config.tradeAmount * config.leverage;
  const grossProfit = wins.reduce((s, r) => s + Math.abs(r.returnPercent), 0);
  const grossLoss = losses.reduce((s, r) => s + Math.abs(r.returnPercent), 0);

  return {
    scenarioCount: scenarios.length,
    wins: wins.length,
    losses: losses.length,
    winRate: +(wins.length / scenarios.length * 100).toFixed(1),
    avgReturn: +avgRet.toFixed(2),
    avgDaysHeld: +(scenarios.reduce((s, r) => s + r.daysHeld, 0) / scenarios.length).toFixed(1),
    bestReturn: +Math.max(...scenarios.map(r => r.returnPercent)).toFixed(2),
    worstReturn: +Math.min(...scenarios.map(r => r.returnPercent)).toFixed(2),
    profitFactor: grossLoss > 0 ? +(grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? 99 : 0,
    expectancyPerTrade: +(exposure * (avgRet / 100)).toFixed(2),
  };
}

function buildMoneyProjection(config: BacktestConfig, summary: BacktestSummary, scenarios: HistoricalScenario[]): MoneyProjection {
  const { tradeAmount, leverage, direction, entryPrice, stopLossPercent, takeProfitPercent } = config;
  const exposure = tradeAmount * leverage;
  const wins = scenarios.filter(s => s.won);
  const losses = scenarios.filter(s => !s.won);
  const avgWinRet = wins.length > 0 ? wins.reduce((s, r) => s + r.returnPercent, 0) / wins.length : takeProfitPercent;
  const avgLossRet = losses.length > 0 ? losses.reduce((s, r) => s + Math.abs(r.returnPercent), 0) / losses.length : stopLossPercent;

  return {
    tradeAmount, leverage, exposure,
    typicalWin: +(exposure * (avgWinRet / 100)).toFixed(2),
    typicalLoss: +(exposure * (avgLossRet / 100)).toFixed(2),
    expectedPerTrade: summary.expectancyPerTrade,
    bestCase: +(exposure * (summary.bestReturn / 100)).toFixed(2),
    worstCase: +(exposure * (summary.worstReturn / 100)).toFixed(2),
    stopLossPrice: +(direction === "long" ? entryPrice * (1 - stopLossPercent / 100) : entryPrice * (1 + stopLossPercent / 100)).toFixed(4),
    takeProfitPrice: +(direction === "long" ? entryPrice * (1 + takeProfitPercent / 100) : entryPrice * (1 - takeProfitPercent / 100)).toFixed(4),
  };
}

// ---------------------------------------------------------------------------
// Recommendation
// ---------------------------------------------------------------------------

function buildRecommendation(summary: BacktestSummary): { recommendation: BacktestResult["recommendation"]; text: string } {
  if (summary.scenarioCount < 3) {
    return {
      recommendation: "weak",
      text: "There is not enough history for me to see clearly. I would not send you down a path I cannot read. Wait for more light.",
    };
  }
  if (summary.winRate >= 65 && summary.profitFactor >= 1.5 && summary.avgReturn > 0) {
    return {
      recommendation: "strong",
      text: "The road ahead is as clear as these things ever are. History, probability, and the current conditions all point the same way. If you are going to act, this is the moment. But even on a clear path — watch your step.",
    };
  }
  if (summary.winRate >= 50 && summary.profitFactor >= 1.0) {
    return {
      recommendation: "moderate",
      text: "There is an edge here, though not a commanding one. The wise trader walks this road with a lighter pack — smaller size, tighter risk. It is tradeable, but it demands respect.",
    };
  }
  if (summary.winRate >= 40) {
    return {
      recommendation: "weak",
      text: "I see little to encourage me here. The edge is faint, and the history is mixed. A wizard knows when to wait. There will be better moments — and I will tell you when they arrive.",
    };
  }
  return {
    recommendation: "against",
    text: "You shall not pass — not on this setup. The history is clear: this path has led others to losses more often than not. Protect what you have. Better opportunities will come, and I will be here when they do.",
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function runBacktest(
  config: BacktestConfig,
  prices: number[],
  volumes: number[],
  dates: string[]
): BacktestResult {
  const assetName = getAssetName(config.asset);

  // Ensure volumes array matches prices
  const vols = volumes.length === prices.length
    ? volumes
    : new Array(prices.length).fill(0);

  // Compute signal profile for every valid day
  const allProfiles: SignalProfile[] = [];
  for (let i = 30; i < prices.length; i++) {
    const p = computeProfile(prices, vols, dates, i);
    if (p) allProfiles.push(p);
  }

  // Compute current profile (latest day)
  const currentProfile = computeCurrentProfile(prices, vols, dates);

  // Data quality
  let dataQuality: BacktestResult["dataQuality"] = "full";
  if (prices.length < 60 || !currentProfile) dataQuality = "insufficient";

  // Generate thesis
  const thesis = currentProfile
    ? generateThesis(currentProfile, assetName, config.direction)
    : { headline: `${assetName} — insufficient data`, conditions: [], summary: "Not enough price history to compute signal conditions." };

  // Find similar conditions
  const matches = currentProfile
    ? findSimilarConditions(currentProfile, allProfiles, {
        maxMatches: 15,
        maxDistance: 3.5,
        minForwardDays: config.maxHoldDays,
        minGapDays: 10,
      })
    : [];

  if (matches.length < 3 && dataQuality !== "insufficient") dataQuality = "limited";

  // Replay trades
  const scenarios = matches.map((match, i) => {
    const sc = replayTrade(config, match, prices, dates, i);
    sc.matchReason = currentProfile
      ? describeMatch(currentProfile, match.profile, match.similarity, assetName)
      : "";
    sc.narrative = generateNarrative(sc, config.direction);
    return sc;
  });

  // Sort by date (oldest first)
  scenarios.sort((a, b) => a.entryDate.localeCompare(b.entryDate));

  // Summary + projection
  const summary = buildSummary(scenarios, config);
  const moneyProjection = buildMoneyProjection(config, summary, scenarios);
  const { recommendation, text: recommendationText } = buildRecommendation(summary);

  // Advisor analysis
  const advisor = analyseBacktest(
    scenarios.map(s => ({
      entryPrice: s.entryPrice,
      exitPrice: s.exitPrice,
      exitReason: s.exitReason,
      returnPercent: s.returnPercent,
      daysHeld: s.daysHeld,
      won: s.won,
      pricePath: s.pricePath,
      pricePathPercent: s.pricePathPercent,
    })),
    {
      direction: config.direction,
      stopLossPercent: config.stopLossPercent,
      takeProfitPercent: config.takeProfitPercent,
      maxHoldDays: config.maxHoldDays,
      tradeAmount: config.tradeAmount,
      leverage: config.leverage,
    }
  );

  // Synthesize the final trade recommendation
  const cp = currentProfile ?? {
    return7d: 0, return14d: 0, return30d: 0, realisedVol: 0,
    volatilityRatio: 1, trendAlignment: 0.5, distFromHigh30d: 0,
    distFromLow30d: 0, volumeRatio: 1, price: config.entryPrice,
    date: "", dayIndex: 0,
  };

  const tradeRec = synthesizeRecommendation({
    asset: config.asset,
    assetName,
    direction: config.direction,
    entryPrice: config.entryPrice,
    backtestWinRate: summary.winRate,
    backtestScenarioCount: summary.scenarioCount,
    backtestAvgReturn: summary.avgReturn,
    backtestAvgDaysHeld: summary.avgDaysHeld,
    backtestProfitFactor: summary.profitFactor,
    backtestBestReturn: summary.bestReturn,
    backtestWorstReturn: summary.worstReturn,
    stopLossPct: config.stopLossPercent,
    takeProfitPct: config.takeProfitPercent,
    maxHoldDays: config.maxHoldDays,
    tradeAmount: config.tradeAmount,
    leverage: config.leverage,
    return7d: cp.return7d,
    return30d: cp.return30d,
    volatilityRatio: cp.volatilityRatio,
    trendAlignment: cp.trendAlignment,
    distFromHigh30d: cp.distFromHigh30d,
    hasSuggestions: advisor.parameterSuggestions.length > 0,
    suggestedStop: advisor.parameterSuggestions.find(s => s.type === "stop_loss")?.suggested,
    suggestedTarget: advisor.parameterSuggestions.find(s => s.type === "take_profit")?.suggested,
    suggestedHold: advisor.parameterSuggestions.find(s => s.type === "hold_period")?.suggested,
  });

  return {
    id: `backtest-${config.asset}-${config.direction}-${Date.now()}`,
    config,
    thesis,
    currentProfile: cp,
    scenarios,
    summary,
    moneyProjection,
    advisor,
    tradeRec,
    recommendation,
    recommendationText,
    dataQuality,
    createdAt: new Date().toISOString(),
  };
}
