/**
 * Backtest Advisor — Trade Wizard Intelligence Layer
 *
 * After a backtest runs, the advisor analyses the results and suggests
 * concrete parameter tweaks to improve performance. It also suggests
 * follow-up tests the user might want to run.
 *
 * This is what makes it feel like having a quant on your side — the
 * system learns from each test and guides you toward better setups.
 */

import type { Direction } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScenarioForAnalysis {
  entryPrice: number;
  exitPrice: number;
  exitReason: "target" | "stop" | "time";
  returnPercent: number;
  daysHeld: number;
  won: boolean;
  pricePath: number[];       // daily closes from entry through exit
  pricePathPercent: number[]; // normalised: entry = 0%
}

interface BacktestConfigForAnalysis {
  direction: Direction;
  stopLossPercent: number;
  takeProfitPercent: number;
  maxHoldDays: number;
  tradeAmount: number;
  leverage: number;
}

export interface ParameterSuggestion {
  type: "stop_loss" | "take_profit" | "hold_period";
  current: number;
  suggested: number;
  unit: string;          // "%", "days"
  impact: string;        // "Improves win rate from 67% to 78%"
  rationale: string;     // explanation
}

export interface FollowUpSuggestion {
  description: string;
  rationale: string;
}

export interface AdvisorAnalysis {
  parameterSuggestions: ParameterSuggestion[];
  followUpSuggestions: FollowUpSuggestion[];
  insight: string;       // overall summary paragraph
}

// ---------------------------------------------------------------------------
// Parameter optimization helpers
// ---------------------------------------------------------------------------

/**
 * Replay a scenario with different stop/target/hold parameters.
 * Returns the outcome under the new parameters.
 */
function replayWithParams(
  scenario: ScenarioForAnalysis,
  direction: Direction,
  stopPct: number,
  targetPct: number,
  maxDays: number
): { won: boolean; returnPct: number; exitReason: string; daysHeld: number } {
  const entryPrice = scenario.pricePath[0];
  const stopPrice = direction === "long"
    ? entryPrice * (1 - stopPct / 100)
    : entryPrice * (1 + stopPct / 100);
  const targetPrice = direction === "long"
    ? entryPrice * (1 + targetPct / 100)
    : entryPrice * (1 - targetPct / 100);

  let exitPrice = entryPrice;
  let exitReason = "time";
  let daysHeld = 0;

  for (let d = 1; d < scenario.pricePath.length && d <= maxDays; d++) {
    const price = scenario.pricePath[d];
    daysHeld = d;

    if (direction === "long" && price <= stopPrice) { exitPrice = stopPrice; exitReason = "stop"; break; }
    if (direction === "short" && price >= stopPrice) { exitPrice = stopPrice; exitReason = "stop"; break; }
    if (direction === "long" && price >= targetPrice) { exitPrice = targetPrice; exitReason = "target"; break; }
    if (direction === "short" && price <= targetPrice) { exitPrice = targetPrice; exitReason = "target"; break; }

    exitPrice = price;
  }

  const returnPct = direction === "long"
    ? ((exitPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - exitPrice) / entryPrice) * 100;

  return { won: returnPct > 0, returnPct: +returnPct.toFixed(2), exitReason, daysHeld };
}

function winRate(results: { won: boolean }[]): number {
  if (results.length === 0) return 0;
  return +(results.filter(r => r.won).length / results.length * 100).toFixed(1);
}

function avgReturn(results: { returnPct: number }[]): number {
  if (results.length === 0) return 0;
  return +(results.reduce((s, r) => s + r.returnPct, 0) / results.length).toFixed(2);
}

// ---------------------------------------------------------------------------
// Core optimization
// ---------------------------------------------------------------------------

function optimizeStopLoss(
  scenarios: ScenarioForAnalysis[],
  config: BacktestConfigForAnalysis,
  currentWinRate: number
): ParameterSuggestion | null {
  if (scenarios.length < 3) return null;

  const stops = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 7, 10].filter(
    s => s !== config.stopLossPercent
  );

  let bestStop = config.stopLossPercent;
  let bestWR = currentWinRate;
  let bestAvg = avgReturn(scenarios.map(s => ({ returnPct: s.returnPercent })));

  for (const stop of stops) {
    const results = scenarios.map(s =>
      replayWithParams(s, config.direction, stop, config.takeProfitPercent, config.maxHoldDays)
    );
    const wr = winRate(results);
    const ar = avgReturn(results);

    // Prefer higher win rate, or same win rate with better avg return
    if (wr > bestWR + 3 || (wr >= bestWR && ar > bestAvg + 0.3)) {
      bestStop = stop;
      bestWR = wr;
      bestAvg = ar;
    }
  }

  if (bestStop === config.stopLossPercent) return null;
  if (bestWR - currentWinRate < 3 && bestAvg <= avgReturn(scenarios.map(s => ({ returnPct: s.returnPercent })))) return null;

  const direction = bestStop > config.stopLossPercent ? "Widening" : "Tightening";

  return {
    type: "stop_loss",
    current: config.stopLossPercent,
    suggested: bestStop,
    unit: "%",
    impact: `Improves win rate from ${currentWinRate}% to ${bestWR}%`,
    rationale: `${direction} the stop to ${bestStop}% ${bestStop > config.stopLossPercent
      ? "gives the trade more room to breathe — some losing scenarios would have recovered"
      : "cuts losses sooner, avoiding deeper drawdowns"}.`,
  };
}

function optimizeTakeProfit(
  scenarios: ScenarioForAnalysis[],
  config: BacktestConfigForAnalysis,
  currentWinRate: number
): ParameterSuggestion | null {
  if (scenarios.length < 3) return null;

  const targets = [1, 1.5, 2, 3, 4, 5, 7, 10, 15].filter(
    t => t !== config.takeProfitPercent
  );

  let bestTarget = config.takeProfitPercent;
  let bestWR = currentWinRate;
  let bestAvg = avgReturn(scenarios.map(s => ({ returnPct: s.returnPercent })));

  for (const target of targets) {
    const results = scenarios.map(s =>
      replayWithParams(s, config.direction, config.stopLossPercent, target, config.maxHoldDays)
    );
    const wr = winRate(results);
    const ar = avgReturn(results);

    if (wr > bestWR + 5 || (wr >= bestWR && ar > bestAvg + 0.5)) {
      bestTarget = target;
      bestWR = wr;
      bestAvg = ar;
    }
  }

  if (bestTarget === config.takeProfitPercent) return null;

  const direction = bestTarget < config.takeProfitPercent ? "Lowering" : "Raising";

  return {
    type: "take_profit",
    current: config.takeProfitPercent,
    suggested: bestTarget,
    unit: "%",
    impact: `Adjusts win rate to ${bestWR}%, avg return to ${bestAvg > 0 ? "+" : ""}${bestAvg}%`,
    rationale: `${direction} the target to ${bestTarget}% ${bestTarget < config.takeProfitPercent
      ? "captures gains more consistently — several winning scenarios nearly reached your current target but fell short"
      : "lets winners run further. Some scenarios had much more to give"}.`,
  };
}

function optimizeHoldPeriod(
  scenarios: ScenarioForAnalysis[],
  config: BacktestConfigForAnalysis,
  currentWinRate: number
): ParameterSuggestion | null {
  if (scenarios.length < 3) return null;

  const periods = [3, 5, 7, 10, 14, 20].filter(
    p => p !== config.maxHoldDays
  );

  let bestPeriod = config.maxHoldDays;
  let bestWR = currentWinRate;
  let bestAvg = avgReturn(scenarios.map(s => ({ returnPct: s.returnPercent })));

  for (const period of periods) {
    const results = scenarios.map(s =>
      replayWithParams(s, config.direction, config.stopLossPercent, config.takeProfitPercent, period)
    );
    const wr = winRate(results);
    const ar = avgReturn(results);

    if (ar > bestAvg + 0.3 || (wr > bestWR + 5 && ar >= bestAvg - 0.1)) {
      bestPeriod = period;
      bestWR = wr;
      bestAvg = ar;
    }
  }

  if (bestPeriod === config.maxHoldDays) return null;

  return {
    type: "hold_period",
    current: config.maxHoldDays,
    suggested: bestPeriod,
    unit: "days",
    impact: `Adjusts win rate to ${bestWR}%, avg return to ${bestAvg > 0 ? "+" : ""}${bestAvg}%`,
    rationale: bestPeriod < config.maxHoldDays
      ? `Most winners resolve within ${bestPeriod} days. Shortening the hold period reduces time exposed to risk.`
      : `Some scenarios needed more time to reach the target. A longer hold captures those late movers.`,
  };
}

// ---------------------------------------------------------------------------
// Follow-up suggestions
// ---------------------------------------------------------------------------

function generateFollowUps(
  scenarios: ScenarioForAnalysis[],
  config: BacktestConfigForAnalysis,
  paramSuggestions: ParameterSuggestion[]
): FollowUpSuggestion[] {
  const suggestions: FollowUpSuggestion[] = [];

  // Suggest opposite direction test if results are poor
  const wr = winRate(scenarios);
  if (wr < 45) {
    const oppDir = config.direction === "long" ? "short" : "long";
    suggestions.push({
      description: `Test the opposite direction (${oppDir})`,
      rationale: `The ${config.direction} setup has a low win rate. The same conditions might favour the other side.`,
    });
  }

  // Suggest tighter params if there are parameter suggestions
  if (paramSuggestions.length > 0) {
    suggestions.push({
      description: "Re-run with the suggested adjustments",
      rationale: "Apply the parameter tweaks above and test again to verify the improvement holds.",
    });
  }

  // Suggest different hold period exploration
  const timeExits = scenarios.filter(s => s.exitReason === "time").length;
  if (timeExits > scenarios.length * 0.3) {
    suggestions.push({
      description: "Try a longer hold period",
      rationale: `${timeExits} of ${scenarios.length} scenarios hit the time limit without reaching target or stop. The move might need more time.`,
    });
  }

  // Suggest reducing size if volatile
  const losses = scenarios.filter(s => !s.won);
  const avgLoss = losses.length > 0
    ? Math.abs(losses.reduce((s, r) => s + r.returnPercent, 0) / losses.length)
    : 0;
  if (avgLoss > config.stopLossPercent * 0.9 && losses.length >= 3) {
    suggestions.push({
      description: "Consider reducing position size",
      rationale: `Losing scenarios averaged -${avgLoss.toFixed(1)}%, close to the full stop loss. Smaller size reduces the pain of those hits.`,
    });
  }

  return suggestions.slice(0, 3); // max 3
}

// ---------------------------------------------------------------------------
// Insight generation
// ---------------------------------------------------------------------------

function generateInsight(
  scenarios: ScenarioForAnalysis[],
  config: BacktestConfigForAnalysis,
  paramSuggestions: ParameterSuggestion[]
): string {
  if (scenarios.length < 3) {
    return "Not enough scenarios to draw reliable conclusions. The wizard needs more history to advise you well.";
  }

  const wr = winRate(scenarios);
  const ar = avgReturn(scenarios.map(s => ({ returnPct: s.returnPercent })));
  const winners = scenarios.filter(s => s.won);
  const losers = scenarios.filter(s => !s.won);

  const parts: string[] = [];

  // Overall performance
  if (wr >= 65 && ar > 0) {
    parts.push(`The conditions you see today have historically been favourable. ${wr}% of similar setups ended well.`);
  } else if (wr >= 50) {
    parts.push(`A mixed picture. ${wr}% of similar setups ended well — an edge, but not a decisive one.`);
  } else {
    parts.push(`History does not strongly favour this setup. Only ${wr}% of similar conditions led to profitable outcomes.`);
  }

  // Timing pattern
  if (winners.length > 0) {
    const avgWinDays = +(winners.reduce((s, r) => s + r.daysHeld, 0) / winners.length).toFixed(1);
    if (avgWinDays <= 3) {
      parts.push(`When it works, it works quickly — winners resolved in ${avgWinDays} days on average.`);
    } else {
      parts.push(`Winners took ${avgWinDays} days on average to play out. Patience is part of this trade.`);
    }
  }

  // Stop analysis
  const stoppedOut = losers.filter(s => s.exitReason === "stop").length;
  if (stoppedOut > 0) {
    parts.push(`The stop was hit in ${stoppedOut} scenario${stoppedOut > 1 ? "s" : ""}. ${
      stoppedOut > scenarios.length * 0.3
        ? "That's a significant proportion — your stop level may be too tight for these conditions."
        : "A manageable loss rate if your sizing is right."
    }`);
  }

  // Improvement potential
  if (paramSuggestions.length > 0) {
    parts.push(`I see potential improvements. ${paramSuggestions.length === 1
      ? "One adjustment could strengthen this setup."
      : `${paramSuggestions.length} adjustments could improve your odds.`
    } See below.`);
  } else if (wr >= 60) {
    parts.push("Your parameters look well-suited to these conditions. I have no adjustments to suggest.");
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function analyseBacktest(
  scenarios: ScenarioForAnalysis[],
  config: BacktestConfigForAnalysis
): AdvisorAnalysis {
  const currentWR = winRate(scenarios);

  const parameterSuggestions: ParameterSuggestion[] = [];

  const stopSugg = optimizeStopLoss(scenarios, config, currentWR);
  if (stopSugg) parameterSuggestions.push(stopSugg);

  const tpSugg = optimizeTakeProfit(scenarios, config, currentWR);
  if (tpSugg) parameterSuggestions.push(tpSugg);

  const holdSugg = optimizeHoldPeriod(scenarios, config, currentWR);
  if (holdSugg) parameterSuggestions.push(holdSugg);

  const followUpSuggestions = generateFollowUps(scenarios, config, parameterSuggestions);
  const insight = generateInsight(scenarios, config, parameterSuggestions);

  return {
    parameterSuggestions,
    followUpSuggestions,
    insight,
  };
}
