/**
 * Backtest Engine — Trade Daddy
 *
 * Runs scenario-based backtests against real historical price data.
 *
 * How it works:
 * 1. Takes a full daily price history (from Polygon or provider)
 * 2. Computes rolling regime on each day using a trailing window
 * 3. Finds regime transition points that match the current setup
 * 4. Replays the user's trade parameters (stop/target/hold) on
 *    real subsequent prices from each matching entry point
 * 5. Returns structured scenarios with plain-English narratives
 *
 * This is a real backtest — not a Monte Carlo random walk.
 * Every scenario happened. Every price path is real.
 */

import type { Direction } from "@/types";
import { detectRegime, type RegimeType } from "@/services/intelligence/regime";
import { getAssetName } from "@/lib/asset-names";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BacktestConfig {
  asset: string;
  direction: Direction;
  entryPrice: number;           // current live/latest price (for money projection)
  stopLossPercent: number;
  takeProfitPercent: number;
  maxHoldDays: number;
  lookbackMonths: number;       // how far back to search
  regimeFilter: RegimeType;     // current regime to match
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
  pnl: number;                  // based on config tradeAmount + leverage
  daysHeld: number;
  won: boolean;
  pricePath: number[];          // daily closes from entry through exit
  pricePathPercent: number[];   // normalised: entry = 0%, each value is % change from entry
  regimeAtEntry: RegimeType;
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
  expectancyPerTrade: number;   // avg £ per trade
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
// Rolling regime detection
// ---------------------------------------------------------------------------

interface DayRegime {
  index: number;
  date: string;
  price: number;
  regime: RegimeType;
}

function computeRollingRegimes(
  prices: number[],
  dates: string[],
  windowSize: number = 30
): DayRegime[] {
  const regimes: DayRegime[] = [];
  for (let i = windowSize; i < prices.length; i++) {
    const window = prices.slice(i - windowSize, i + 1);
    const state = detectRegime(window, windowSize);
    regimes.push({
      index: i,
      date: dates[i] ?? "",
      price: prices[i],
      regime: state.regime,
    });
  }
  return regimes;
}

/**
 * Find regime transition points — the first day of each new regime period
 * that matches the target. These are natural "entry" points for backtesting
 * because they represent the moment conditions aligned.
 *
 * Also includes some mid-regime entries (sampled every ~15 days) to
 * capture scenarios where a trader enters during an established regime,
 * not only at the exact transition.
 */
function findRegimeEntries(
  regimes: DayRegime[],
  targetRegime: RegimeType,
  minForwardDays: number
): DayRegime[] {
  const entries: DayRegime[] = [];
  const maxIndex = regimes.length > 0 ? regimes[regimes.length - 1].index : 0;

  let lastEntryIndex = -Infinity;

  for (let i = 0; i < regimes.length; i++) {
    const curr = regimes[i];
    const prev = i > 0 ? regimes[i - 1] : null;

    if (curr.regime !== targetRegime) continue;

    // Need enough forward data to replay the trade
    if (maxIndex - curr.index < minForwardDays) continue;

    const isTransition = !prev || prev.regime !== targetRegime;
    const isMidRegimeSample = curr.index - lastEntryIndex >= 15;

    if (isTransition || isMidRegimeSample) {
      entries.push(curr);
      lastEntryIndex = curr.index;
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Trade replay on real prices
// ---------------------------------------------------------------------------

function replayTrade(
  config: BacktestConfig,
  entry: DayRegime,
  prices: number[],
  dates: string[],
  scenarioIndex: number
): HistoricalScenario {
  const { direction, stopLossPercent, takeProfitPercent, maxHoldDays, tradeAmount, leverage } = config;
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
    const dayIndex = entry.index + d;
    if (dayIndex >= prices.length) break;

    const dayPrice = prices[dayIndex];
    daysHeld = d;
    exitDate = dates[dayIndex] ?? entry.date;
    pricePath.push(dayPrice);
    pricePathPercent.push(+((dayPrice - entryPrice) / entryPrice * 100).toFixed(2));

    // Check stop
    if (direction === "long" && dayPrice <= stopPrice) {
      exitPrice = stopPrice;
      exitReason = "stop";
      break;
    }
    if (direction === "short" && dayPrice >= stopPrice) {
      exitPrice = stopPrice;
      exitReason = "stop";
      break;
    }

    // Check target
    if (direction === "long" && dayPrice >= targetPrice) {
      exitPrice = targetPrice;
      exitReason = "target";
      break;
    }
    if (direction === "short" && dayPrice <= targetPrice) {
      exitPrice = targetPrice;
      exitReason = "target";
      break;
    }

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
    regimeAtEntry: entry.regime,
    narrative: "", // filled below
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

function generateNarrative(scenario: HistoricalScenario, assetName: string, direction: string): string {
  const entry = formatDate(scenario.entryDate);
  const exit = formatDate(scenario.exitDate);
  const ep = formatPrice(scenario.entryPrice);
  const xp = formatPrice(scenario.exitPrice);
  const days = scenario.daysHeld;
  const dayWord = days === 1 ? "day" : "days";
  const dirWord = direction === "long" ? "long" : "short";

  // Describe the price journey
  const path = scenario.pricePathPercent;
  const maxDrawdown = direction === "long"
    ? Math.min(...path)
    : -Math.max(...path);
  const maxRunup = direction === "long"
    ? Math.max(...path)
    : -Math.min(...path);

  let journey = "";
  if (scenario.exitReason === "target") {
    if (maxDrawdown < -0.5 && direction === "long") {
      journey = `Dipped ${Math.abs(maxDrawdown).toFixed(1)}% before recovering and reaching the target.`;
    } else if (days <= 2) {
      journey = `Moved quickly in the right direction, reaching the target in just ${days} ${dayWord}.`;
    } else {
      journey = `Worked steadily over ${days} ${dayWord} to reach the profit target.`;
    }
  } else if (scenario.exitReason === "stop") {
    if (maxRunup > 0.5) {
      journey = `Initially moved ${maxRunup.toFixed(1)}% in favour before reversing and hitting the stop.`;
    } else if (days <= 1) {
      journey = `Moved against the position almost immediately, triggering the stop on day 1.`;
    } else {
      journey = `Drifted against the position over ${days} ${dayWord} before the stop was hit.`;
    }
  } else {
    // time exit
    const finalReturn = scenario.returnPercent;
    if (finalReturn > 0.3) {
      journey = `Ended slightly positive but didn't reach the target within the hold period.`;
    } else if (finalReturn < -0.3) {
      journey = `Drifted lower but never quite triggered the stop. Exited at the time limit.`;
    } else {
      journey = `Went sideways for ${days} ${dayWord}. Neither target nor stop were reached.`;
    }
  }

  const outcomeWord = scenario.won ? "Won" : "Lost";
  const returnStr = scenario.returnPercent >= 0
    ? `+${scenario.returnPercent}%`
    : `${scenario.returnPercent}%`;

  return `${entry}: Entered ${dirWord} at ${ep}. ${journey} Exited ${exit} at ${xp}. ${outcomeWord}: ${returnStr}.`;
}

// ---------------------------------------------------------------------------
// Summary + Money projection
// ---------------------------------------------------------------------------

function buildSummary(scenarios: HistoricalScenario[], config: BacktestConfig): BacktestSummary {
  if (scenarios.length === 0) {
    return {
      scenarioCount: 0, wins: 0, losses: 0, winRate: 0,
      avgReturn: 0, avgDaysHeld: 0, bestReturn: 0, worstReturn: 0,
      profitFactor: 0, expectancyPerTrade: 0,
    };
  }

  const wins = scenarios.filter(s => s.won);
  const losses = scenarios.filter(s => !s.won);
  const avgReturn = scenarios.reduce((s, r) => s + r.returnPercent, 0) / scenarios.length;
  const exposure = config.tradeAmount * config.leverage;
  const expectancy = +(exposure * (avgReturn / 100)).toFixed(2);

  const grossProfit = wins.reduce((s, r) => s + Math.abs(r.returnPercent), 0);
  const grossLoss = losses.reduce((s, r) => s + Math.abs(r.returnPercent), 0);

  return {
    scenarioCount: scenarios.length,
    wins: wins.length,
    losses: losses.length,
    winRate: +(wins.length / scenarios.length * 100).toFixed(1),
    avgReturn: +avgReturn.toFixed(2),
    avgDaysHeld: +(scenarios.reduce((s, r) => s + r.daysHeld, 0) / scenarios.length).toFixed(1),
    bestReturn: +Math.max(...scenarios.map(r => r.returnPercent)).toFixed(2),
    worstReturn: +Math.min(...scenarios.map(r => r.returnPercent)).toFixed(2),
    profitFactor: grossLoss > 0 ? +(grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? 99 : 0,
    expectancyPerTrade: expectancy,
  };
}

function buildMoneyProjection(config: BacktestConfig, summary: BacktestSummary, scenarios: HistoricalScenario[]): MoneyProjection {
  const { tradeAmount, leverage, direction, entryPrice, stopLossPercent, takeProfitPercent } = config;
  const exposure = tradeAmount * leverage;

  const wins = scenarios.filter(s => s.won);
  const losses = scenarios.filter(s => !s.won);
  const avgWinReturn = wins.length > 0 ? wins.reduce((s, r) => s + r.returnPercent, 0) / wins.length : takeProfitPercent;
  const avgLossReturn = losses.length > 0 ? losses.reduce((s, r) => s + Math.abs(r.returnPercent), 0) / losses.length : stopLossPercent;

  const stopLossPrice = direction === "long"
    ? entryPrice * (1 - stopLossPercent / 100)
    : entryPrice * (1 + stopLossPercent / 100);
  const takeProfitPrice = direction === "long"
    ? entryPrice * (1 + takeProfitPercent / 100)
    : entryPrice * (1 - takeProfitPercent / 100);

  return {
    tradeAmount,
    leverage,
    exposure,
    typicalWin: +(exposure * (avgWinReturn / 100)).toFixed(2),
    typicalLoss: +(exposure * (avgLossReturn / 100)).toFixed(2),
    expectedPerTrade: summary.expectancyPerTrade,
    bestCase: +(exposure * (summary.bestReturn / 100)).toFixed(2),
    worstCase: +(exposure * (summary.worstReturn / 100)).toFixed(2),
    stopLossPrice: +stopLossPrice.toFixed(4),
    takeProfitPrice: +takeProfitPrice.toFixed(4),
  };
}

// ---------------------------------------------------------------------------
// Quant note + recommendation
// ---------------------------------------------------------------------------

function regimeLabel(r: RegimeType): string {
  switch (r) {
    case "trending_up": return "trending-up";
    case "trending_down": return "trending-down";
    case "ranging": return "ranging";
    case "volatile": return "volatile";
    default: return "unclear";
  }
}

function directionWord(d: Direction): string {
  return d === "long" ? "long" : d === "short" ? "short" : "neutral";
}

function buildSetupDescription(config: BacktestConfig): string {
  const asset = getAssetName(config.asset);
  const dir = directionWord(config.direction);
  const regime = regimeLabel(config.regimeFilter);
  return `Going ${dir} on ${asset} during a ${regime} regime`;
}

function buildQuantNote(config: BacktestConfig, summary: BacktestSummary, scenarios: HistoricalScenario[]): string {
  const asset = getAssetName(config.asset);
  const n = summary.scenarioCount;
  const dir = directionWord(config.direction);
  const regime = regimeLabel(config.regimeFilter);

  if (n === 0) {
    return `There are no historical instances of ${asset} in a ${regime} regime over the lookback period. This setup has no precedent in the available data, which means the risk is unquantifiable. Consider waiting for more data or adjusting the lookback period.`;
  }

  if (n < 3) {
    return `Only ${n} historical ${n === 1 ? "instance" : "instances"} found. That's not enough to draw reliable conclusions. The results may look good or bad, but with such a small sample, it's essentially noise. If you proceed, keep the position size very small.`;
  }

  const parts: string[] = [];

  // Opening
  if (summary.winRate >= 70) {
    parts.push(`This is a strong setup. In ${n} similar historical scenarios, a ${dir} position on ${asset} during a ${regime} regime won ${summary.winRate}% of the time.`);
  } else if (summary.winRate >= 55) {
    parts.push(`A reasonable setup. ${asset} has traded through ${n} similar ${regime} periods, and a ${dir} position won ${summary.winRate}% of the time.`);
  } else if (summary.winRate >= 45) {
    parts.push(`This setup is marginal. Across ${n} historical scenarios, the win rate is only ${summary.winRate}%. The edge is thin.`);
  } else {
    parts.push(`History doesn't favour this setup. Across ${n} similar ${regime} periods on ${asset}, a ${dir} position only won ${summary.winRate}% of the time.`);
  }

  // Risk/reward insight
  if (summary.profitFactor >= 2.0) {
    parts.push(`The profit factor of ${summary.profitFactor}:1 is strong — winning trades are meaningfully larger than losing ones.`);
  } else if (summary.profitFactor >= 1.3) {
    parts.push(`The profit factor is ${summary.profitFactor}:1, which means winners slightly outweigh losers in magnitude.`);
  } else if (summary.profitFactor > 0 && summary.profitFactor < 1.0) {
    parts.push(`Concerning: the profit factor is below 1.0 (${summary.profitFactor}:1), meaning losses are larger than wins on average.`);
  }

  // Timing insight
  const avgDays = summary.avgDaysHeld;
  if (avgDays <= 2) {
    parts.push(`Trades resolve quickly — averaging just ${avgDays} days. Good for shorter-term setups.`);
  } else if (avgDays >= config.maxHoldDays * 0.8) {
    parts.push(`Most scenarios needed the full hold period (${avgDays} days avg), suggesting slow moves. Patience is required.`);
  }

  // Worst-case warning
  if (summary.worstReturn < -config.stopLossPercent * 0.8) {
    parts.push(`The stop loss was hit in ${scenarios.filter(s => s.exitReason === "stop").length} of ${n} scenarios — factor that into your sizing.`);
  }

  // Regime-specific caution
  if (config.regimeFilter === "volatile") {
    parts.push(`Volatile regimes are inherently unpredictable. Even if the numbers look decent, the risk of a sudden reversal is elevated.`);
  } else if (config.regimeFilter === "ranging") {
    parts.push(`Ranging markets tend to frustrate directional trades. Time exits are common — be prepared for the position to go nowhere.`);
  }

  return parts.join(" ");
}

function buildRecommendation(summary: BacktestSummary): {
  recommendation: BacktestResult["recommendation"];
  text: string;
} {
  if (summary.scenarioCount < 3) {
    return {
      recommendation: "weak",
      text: "Not enough historical data to form a reliable view. Proceed with extreme caution if at all.",
    };
  }

  if (summary.winRate >= 65 && summary.profitFactor >= 1.5 && summary.avgReturn > 0) {
    return {
      recommendation: "strong",
      text: "History is clearly on your side. The win rate and profit factor both look good. If you're going to trade this, now is the time — but always respect your stop.",
    };
  }

  if (summary.winRate >= 50 && summary.profitFactor >= 1.0) {
    return {
      recommendation: "moderate",
      text: "The setup has a slight edge historically. It's tradeable, but not a slam dunk. Consider a smaller position size and tight risk management.",
    };
  }

  if (summary.winRate >= 40) {
    return {
      recommendation: "weak",
      text: "The historical edge is thin. More scenarios lost than won, or the magnitude of losses outweighs wins. Daddy would sit this one out.",
    };
  }

  return {
    recommendation: "against",
    text: "History says this doesn't work. The data shows consistent losses in similar setups. Protect your capital — there'll be better opportunities.",
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function runBacktest(
  config: BacktestConfig,
  prices: number[],
  dates: string[]
): BacktestResult {
  const assetName = getAssetName(config.asset);

  // Compute rolling regimes
  const regimes = computeRollingRegimes(prices, dates, 30);

  // Find entry points matching the target regime
  const entries = findRegimeEntries(regimes, config.regimeFilter, config.maxHoldDays);

  // Data quality assessment
  let dataQuality: BacktestResult["dataQuality"] = "full";
  if (prices.length < 60) dataQuality = "insufficient";
  else if (entries.length < 3) dataQuality = "limited";

  // Replay each scenario
  const scenarios = entries.map((entry, i) =>
    replayTrade(config, entry, prices, dates, i)
  );

  // Generate narratives
  for (const s of scenarios) {
    s.narrative = generateNarrative(s, assetName, config.direction);
  }

  // Build outputs
  const summary = buildSummary(scenarios, config);
  const moneyProjection = buildMoneyProjection(config, summary, scenarios);
  const setupDescription = buildSetupDescription(config);
  const quantNote = buildQuantNote(config, summary, scenarios);
  const { recommendation, text } = buildRecommendation(summary);

  return {
    id: `backtest-${config.asset}-${config.direction}-${Date.now()}`,
    config,
    scenarios,
    summary,
    moneyProjection,
    setupDescription,
    quantNote,
    recommendation,
    recommendationText: text,
    dataQuality,
    createdAt: new Date().toISOString(),
  };
}
