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
      journey = `Drifted lower without ever triggering the stop. Neither here nor there — exited at the hold limit.`;
    } else {
      journey = `Sideways for ${days} ${dayWord}. The market had no opinion. Sometimes the wisest thing is to walk away.`;
    }
  }

  const returnStr = scenario.returnPercent >= 0
    ? `+${scenario.returnPercent}%`
    : `${scenario.returnPercent}%`;

  return `${entry}: Entered ${dirWord} at ${ep}. ${journey} Exited ${exit} at ${xp} (${returnStr}).`;
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
    return `I have searched the records and found no instance of ${asset} walking this path before — a ${regime} regime with no precedent in the available history. Where there is no map, one must tread carefully. I would not venture here without more light to see by.`;
  }

  if (n < 3) {
    return `Only ${n} ${n === 1 ? "instance" : "instances"} in the scrolls. That is not enough to read the pattern clearly. Even a wizard needs more than whispers to counsel a journey. If you must proceed, go lightly — very small size, no more.`;
  }

  const parts: string[] = [];

  // Opening
  if (summary.winRate >= 70) {
    parts.push(`I have seen this road before, and it is a good one. In ${n} similar passages through a ${regime} phase, a ${dir} position on ${asset} found its way ${summary.winRate}% of the time. The signs are clear.`);
  } else if (summary.winRate >= 55) {
    parts.push(`The path is walkable, though not without stones. ${asset} has passed through ${n} similar ${regime} periods, and a ${dir} position prevailed ${summary.winRate}% of the time. Reasonable — but stay alert.`);
  } else if (summary.winRate >= 45) {
    parts.push(`I must be honest with you. Across ${n} historical scenarios, only ${summary.winRate}% ended well. The edge is thin — like a bridge over a chasm. One does not cross it carelessly.`);
  } else {
    parts.push(`The history here is unkind. Across ${n} similar ${regime} periods on ${asset}, a ${dir} position only found its footing ${summary.winRate}% of the time. I have seen this road — it leads to trouble.`);
  }

  // Risk/reward insight
  if (summary.profitFactor >= 2.0) {
    parts.push(`When it works, it works well — the profit factor of ${summary.profitFactor}:1 means the victories are meaningfully larger than the defeats. That is what we want to see.`);
  } else if (summary.profitFactor >= 1.3) {
    parts.push(`The balance of wins to losses is ${summary.profitFactor}:1 — the victories slightly outweigh the setbacks. Not commanding, but the arithmetic favours you.`);
  } else if (summary.profitFactor > 0 && summary.profitFactor < 1.0) {
    parts.push(`A troubling sign: the losses are larger than the wins (${summary.profitFactor}:1 profit factor). Even if you win more often, the maths works against you.`);
  }

  // Timing insight
  const avgDays = summary.avgDaysHeld;
  if (avgDays <= 2) {
    parts.push(`These moves resolve swiftly — ${avgDays} days on average. A wizard is never late, nor early. This setup arrives precisely when it means to.`);
  } else if (avgDays >= config.maxHoldDays * 0.8) {
    parts.push(`Patience will be required. Most scenarios needed nearly the full ${avgDays}-day hold period to unfold. Do not mistake slowness for failure — but do not mistake it for progress either.`);
  }

  // Worst-case warning
  const stoppedCount = scenarios.filter(s => s.exitReason === "stop").length;
  if (stoppedCount > 0 && summary.worstReturn < -config.stopLossPercent * 0.8) {
    parts.push(`The stop was tested in ${stoppedCount} of ${n} scenarios. Your defences matter here — respect them.`);
  }

  // Regime-specific caution
  if (config.regimeFilter === "volatile") {
    parts.push(`A volatile regime is like a storm at sea. Even a fair wind can turn foul without warning. Do not let decent numbers lull you into overconfidence.`);
  } else if (config.regimeFilter === "ranging") {
    parts.push(`Ranging markets are patient traps for the impatient. Many positions will drift, going nowhere, consuming time. Sometimes the wisest move is to wait for the range to break.`);
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
      text: "There is not enough history for me to see clearly. I would not send you down a path I cannot read. Wait for more light.",
    };
  }

  if (summary.winRate >= 65 && summary.profitFactor >= 1.5 && summary.avgReturn > 0) {
    return {
      recommendation: "strong",
      text: "The road ahead is as clear as these things ever are. History, probability, and the current regime all point the same way. If you are going to act, this is the moment. But even on a clear path — watch your step.",
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
