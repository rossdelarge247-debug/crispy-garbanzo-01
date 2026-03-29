/**
 * Trade Recommendation Synthesizer — Trade Wizard
 *
 * Takes all available intelligence and produces ONE clear, actionable
 * recommendation: when to trade, why, how much, and with what confidence.
 *
 * This is the final output — everything else feeds into this.
 *
 * Inputs:
 *  - Signal profile (current conditions)
 *  - Backtest results (historical outcomes)
 *  - Advisor analysis (parameter suggestions)
 *  - Entry price, direction, asset context
 *
 * Output:
 *  - A single recommendation card the user can act on
 */

import type { Direction } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TradeRecommendation {
  // Action
  action: "enter_now" | "wait" | "skip";
  actionLabel: string;          // "Enter now" / "Wait for pullback" / "Skip this one"

  // Timing
  timing: string;               // "Now — conditions are aligned" / "Wait for price to return to X"
  timingRationale: string;      // Why this timing

  // Direction + conviction
  direction: Direction;
  directionLabel: string;       // "Go long" / "Go short"

  // Size
  suggestedAmount: number;      // £ amount
  suggestedLeverage: number;
  suggestedExposure: number;
  sizeRationale: string;        // "Moderate confidence — standard size"

  // Levels
  entryPrice: number;
  stopLoss: number;             // price
  stopLossPct: number;
  takeProfit: number;           // price
  takeProfitPct: number;
  holdDays: number;
  riskRewardRatio: number;

  // Confidence
  confidence: number;           // 0–100
  confidenceLabel: string;      // "High" / "Moderate" / "Low"
  confidenceColor: string;      // CSS class/color

  // Reasoning (plain English, numbered)
  reasons: string[];

  // Risks
  risks: string[];

  // Overall summary (one paragraph)
  summary: string;
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

interface SynthesisInput {
  asset: string;
  assetName: string;
  direction: Direction;
  entryPrice: number;

  // From backtest
  backtestWinRate: number;
  backtestScenarioCount: number;
  backtestAvgReturn: number;
  backtestAvgDaysHeld: number;
  backtestProfitFactor: number;
  backtestBestReturn: number;
  backtestWorstReturn: number;

  // Current params
  stopLossPct: number;
  takeProfitPct: number;
  maxHoldDays: number;
  tradeAmount: number;
  leverage: number;

  // From signal profile
  return7d: number;
  return30d: number;
  volatilityRatio: number;
  trendAlignment: number;
  distFromHigh30d: number;

  // News + sentiment context
  newsArticleCount: number;
  newsSentiment: number;         // -1 to 1
  newsSentimentLabel: string;    // "bullish" / "bearish" / "neutral"
  topHeadline: string | null;
  socialSentimentScore: number;  // -100 to 100
  socialAgreement: number;       // 0-100

  // Advisor suggestions count
  hasSuggestions: boolean;
  suggestedStop?: number;
  suggestedTarget?: number;
  suggestedHold?: number;
}

// ---------------------------------------------------------------------------
// Synthesizer
// ---------------------------------------------------------------------------

function computeConfidence(input: SynthesisInput): { score: number; label: string; color: string } {
  let score = 50; // baseline

  // Win rate is the strongest signal
  if (input.backtestWinRate >= 70) score += 20;
  else if (input.backtestWinRate >= 60) score += 12;
  else if (input.backtestWinRate >= 50) score += 5;
  else if (input.backtestWinRate >= 40) score -= 5;
  else score -= 15;

  // Profit factor
  if (input.backtestProfitFactor >= 2.0) score += 10;
  else if (input.backtestProfitFactor >= 1.5) score += 5;
  else if (input.backtestProfitFactor < 1.0) score -= 10;

  // Scenario count (statistical significance)
  if (input.backtestScenarioCount >= 8) score += 5;
  else if (input.backtestScenarioCount >= 5) score += 2;
  else if (input.backtestScenarioCount < 3) score -= 15;

  // Trend alignment
  if (input.trendAlignment >= 0.9) score += 8;
  else if (input.trendAlignment >= 0.6) score += 3;
  else score -= 5;

  // Volatility (elevated vol = more risk)
  if (input.volatilityRatio > 2.0) score -= 10;
  else if (input.volatilityRatio > 1.5) score -= 5;

  // Position relative to high/low
  if (input.direction === "long" && input.distFromHigh30d > -3) score += 3;
  if (input.direction === "long" && input.distFromHigh30d < -10) score -= 5;

  // News volume (more articles = more conviction)
  if (input.newsArticleCount >= 8) score += 8;
  else if (input.newsArticleCount >= 4) score += 4;
  else if (input.newsArticleCount === 0) score -= 5;

  // News sentiment alignment with direction
  const newsAligned = (input.direction === "long" && input.newsSentiment > 0.1)
    || (input.direction === "short" && input.newsSentiment < -0.1);
  const newsConflicting = (input.direction === "long" && input.newsSentiment < -0.15)
    || (input.direction === "short" && input.newsSentiment > 0.15);
  if (newsAligned) score += 8;
  if (newsConflicting) score -= 8;

  // Social sentiment alignment
  const socialAligned = (input.direction === "long" && input.socialSentimentScore > 15)
    || (input.direction === "short" && input.socialSentimentScore < -15);
  if (socialAligned && input.socialAgreement > 60) score += 6;
  if (socialAligned) score += 3;

  // Clamp
  score = Math.max(5, Math.min(95, score));

  const label = score >= 75 ? "High" : score >= 55 ? "Moderate" : score >= 35 ? "Low" : "Very low";
  const color = score >= 75 ? "text-[--green]" : score >= 55 ? "text-[--amber]" : "text-[--red]";

  return { score, label, color };
}

function determineAction(input: SynthesisInput, confidence: number): {
  action: TradeRecommendation["action"];
  actionLabel: string;
  timing: string;
  timingRationale: string;
} {
  if (confidence >= 65 && input.backtestWinRate >= 55 && input.backtestScenarioCount >= 3) {
    return {
      action: "enter_now",
      actionLabel: "Enter now",
      timing: "Now — the conditions are aligned",
      timingRationale: `${input.backtestWinRate}% of similar setups were profitable across ${input.backtestScenarioCount} historical matches. The current signal is active.`,
    };
  }

  if (confidence >= 45 && input.backtestWinRate >= 45) {
    // Moderate — might suggest waiting for better entry
    if (input.direction === "long" && input.distFromHigh30d > -2) {
      return {
        action: "wait",
        actionLabel: "Wait for a better entry",
        timing: "Wait for a small pullback before entering",
        timingRationale: `The setup is reasonable (${input.backtestWinRate}% win rate) but the price is near its 30-day high. A small dip would give a better risk/reward entry.`,
      };
    }
    return {
      action: "enter_now",
      actionLabel: "Enter with caution",
      timing: "Now, but keep size small",
      timingRationale: `The edge is moderate (${input.backtestWinRate}% win rate). Tradeable, but not commanding enough for full size.`,
    };
  }

  return {
    action: "skip",
    actionLabel: "Skip this one",
    timing: "Not now — the setup isn't strong enough",
    timingRationale: input.backtestScenarioCount < 3
      ? "Too few historical matches to form a reliable view."
      : `Only ${input.backtestWinRate}% of similar setups were profitable. The wizard counsels patience.`,
  };
}

function determineSizing(
  input: SynthesisInput,
  confidence: number,
  action: TradeRecommendation["action"]
): { amount: number; leverage: number; rationale: string } {
  if (action === "skip") {
    return { amount: 0, leverage: 0, rationale: "No trade recommended." };
  }

  const baseAmount = input.tradeAmount;
  const baseLeverage = input.leverage;

  // Scale size by confidence
  let sizeFactor = 1.0;
  let leverageFactor = 1.0;
  let rationale = "";

  if (confidence >= 75) {
    sizeFactor = 1.0;
    leverageFactor = 1.0;
    rationale = "High confidence — full size.";
  } else if (confidence >= 60) {
    sizeFactor = 0.75;
    leverageFactor = 1.0;
    rationale = "Moderate confidence — reduce to 75% of standard size.";
  } else if (confidence >= 45) {
    sizeFactor = 0.5;
    leverageFactor = 0.5;
    rationale = "Lower confidence — half size with reduced leverage. Protect capital.";
  } else {
    sizeFactor = 0.25;
    leverageFactor = 0.5;
    rationale = "Low confidence — minimum size only. This is exploratory.";
  }

  // Cap leverage if volatility is high
  if (input.volatilityRatio > 1.8) {
    leverageFactor = Math.min(leverageFactor, 0.5);
    rationale += " Volatility is elevated — leverage reduced.";
  }

  return {
    amount: Math.round(baseAmount * sizeFactor),
    leverage: Math.max(1, Math.round(baseLeverage * leverageFactor)),
    rationale: rationale.trim(),
  };
}

function buildReasons(input: SynthesisInput, confidence: number): string[] {
  const reasons: string[] = [];
  const dir = input.direction === "long" ? "long" : "short";

  // Momentum
  if (Math.abs(input.return7d) > 2) {
    const word = input.return7d > 0 ? "up" : "down";
    reasons.push(`${input.assetName} is ${word} ${Math.abs(input.return7d).toFixed(1)}% in 7 days — ${
      (input.direction === "long" && input.return7d > 0) || (input.direction === "short" && input.return7d < 0)
        ? "momentum supports the " + dir + " thesis"
        : "momentum is against the " + dir + " direction"
    }.`);
  }

  // Trend alignment
  if (input.trendAlignment >= 0.9) {
    reasons.push("All timeframes are aligned in the same direction — the strongest form of trend confirmation.");
  } else if (input.trendAlignment < 0.5) {
    reasons.push("Timeframes are conflicting — short and long-term trends disagree, adding uncertainty.");
  }

  // Backtest evidence
  if (input.backtestScenarioCount >= 3) {
    reasons.push(`${input.backtestWinRate}% of ${input.backtestScenarioCount} similar historical setups were profitable, with a ${input.backtestProfitFactor}:1 profit factor.`);
  }

  // Timing
  if (input.backtestAvgDaysHeld > 0) {
    reasons.push(`Winning trades typically resolve in ${input.backtestAvgDaysHeld} days.`);
  }

  // News catalyst
  if (input.topHeadline && input.newsArticleCount >= 2) {
    const sentWord = input.newsSentimentLabel === "bullish" ? "positive" : input.newsSentimentLabel === "bearish" ? "negative" : "mixed";
    reasons.push(`${input.newsArticleCount} recent news articles with ${sentWord} tone. Lead story: "${input.topHeadline}"`);
  }

  // Social sentiment
  if (Math.abs(input.socialSentimentScore) > 15 && input.socialAgreement > 50) {
    const socialDir = input.socialSentimentScore > 0 ? "bullish" : "bearish";
    const aligns = (socialDir === "bullish" && input.direction === "long") || (socialDir === "bearish" && input.direction === "short");
    reasons.push(`Social sentiment is ${socialDir} (${input.socialAgreement}% source agreement)${aligns ? " — aligned with the trade direction" : " — be aware this conflicts with the trade direction"}.`);
  }

  // Risk/reward
  const rr = input.stopLossPct > 0 ? +(input.takeProfitPct / input.stopLossPct).toFixed(1) : 0;
  if (rr >= 2) {
    reasons.push(`Risk/reward ratio of ${rr}:1 — you stand to gain more than you risk.`);
  } else if (rr > 0 && rr < 1) {
    reasons.push(`Risk/reward ratio of ${rr}:1 — you're risking more than your potential gain. Consider a wider target.`);
  }

  return reasons;
}

function buildRisks(input: SynthesisInput): string[] {
  const risks: string[] = [];

  if (input.volatilityRatio > 1.8) {
    risks.push(`Volatility is ${input.volatilityRatio.toFixed(1)}x normal — sudden reversals are more likely.`);
  }

  if (input.backtestScenarioCount < 5) {
    risks.push(`Only ${input.backtestScenarioCount} historical matches — small sample size means less statistical reliability.`);
  }

  const stopHitRate = input.backtestWinRate < 100
    ? 100 - input.backtestWinRate
    : 0;
  if (stopHitRate > 30) {
    risks.push(`${stopHitRate.toFixed(0)}% of similar setups hit the stop loss. Size accordingly.`);
  }

  if (input.backtestWorstReturn < -input.stopLossPct * 0.9) {
    risks.push(`The worst historical scenario lost ${Math.abs(input.backtestWorstReturn).toFixed(1)}%. Your stop should protect you, but gaps can occur.`);
  }

  if (input.direction === "long" && input.return30d > 15) {
    risks.push("The asset has already rallied significantly. Late entries in extended moves carry higher reversal risk.");
  }

  // News/sentiment conflict
  const newsConflicts = (input.direction === "long" && input.newsSentiment < -0.15)
    || (input.direction === "short" && input.newsSentiment > 0.15);
  if (newsConflicts && input.newsArticleCount >= 2) {
    risks.push(`Recent news sentiment (${input.newsSentimentLabel}) conflicts with the ${input.direction} direction. The narrative may be shifting.`);
  }

  if (risks.length === 0) {
    risks.push("All trades carry risk. Never risk more than you can afford to lose.");
  }

  return risks.slice(0, 4);
}

function buildSummary(
  input: SynthesisInput,
  confidence: { score: number; label: string },
  action: TradeRecommendation["action"],
  sizing: { amount: number; leverage: number }
): string {
  const dir = input.direction === "long" ? "long" : "short";

  if (action === "skip") {
    return `The conditions for a ${dir} trade on ${input.assetName} are not strong enough. Only ${input.backtestWinRate}% of similar historical setups were profitable${
      input.backtestScenarioCount < 3 ? ", and there are too few matches to be confident" : ""
    }. The wise move is to wait. I will tell you when the conditions improve.`;
  }

  const sizeWord = confidence.score >= 75 ? "standard" : confidence.score >= 55 ? "reduced" : "minimum";
  const exposure = sizing.amount * sizing.leverage;

  return `Go ${dir} on ${input.assetName} at ${formatPrice(input.entryPrice, input.asset)}. ${confidence.label} confidence (${confidence.score}/100) based on ${input.backtestScenarioCount} historical matches with a ${input.backtestWinRate}% win rate. ${
    action === "wait" ? "Consider waiting for a small pullback before entering. " : ""
  }Use ${sizeWord} size: £${sizing.amount} at ${sizing.leverage}x (£${exposure.toLocaleString()} exposure). Stop at ${formatPrice(
    input.direction === "long" ? input.entryPrice * (1 - input.stopLossPct / 100) : input.entryPrice * (1 + input.stopLossPct / 100),
    input.asset
  )}, target ${formatPrice(
    input.direction === "long" ? input.entryPrice * (1 + input.takeProfitPct / 100) : input.entryPrice * (1 - input.takeProfitPct / 100),
    input.asset
  )}. Hold up to ${input.maxHoldDays} days.`;
}

function formatPrice(price: number, asset: string): string {
  if (price >= 1000) return "£" + price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (asset.includes("-USD") || asset.includes("=F")) return price.toFixed(2);
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function synthesizeRecommendation(input: SynthesisInput): TradeRecommendation {
  const confidence = computeConfidence(input);
  const { action, actionLabel, timing, timingRationale } = determineAction(input, confidence.score);
  const sizing = determineSizing(input, confidence.score, action);
  const reasons = buildReasons(input, confidence.score);
  const risks = buildRisks(input);

  const stopPrice = input.direction === "long"
    ? input.entryPrice * (1 - input.stopLossPct / 100)
    : input.entryPrice * (1 + input.stopLossPct / 100);
  const targetPrice = input.direction === "long"
    ? input.entryPrice * (1 + input.takeProfitPct / 100)
    : input.entryPrice * (1 - input.takeProfitPct / 100);
  const rr = input.stopLossPct > 0 ? +(input.takeProfitPct / input.stopLossPct).toFixed(1) : 0;

  // Use advisor's suggested params if available
  const finalStop = input.suggestedStop ?? input.stopLossPct;
  const finalTarget = input.suggestedTarget ?? input.takeProfitPct;
  const finalHold = input.suggestedHold ?? input.maxHoldDays;

  return {
    action,
    actionLabel,
    timing,
    timingRationale,
    direction: input.direction,
    directionLabel: input.direction === "long" ? "Go long" : "Go short",
    suggestedAmount: sizing.amount,
    suggestedLeverage: sizing.leverage,
    suggestedExposure: sizing.amount * sizing.leverage,
    sizeRationale: sizing.rationale,
    entryPrice: input.entryPrice,
    stopLoss: +stopPrice.toFixed(4),
    stopLossPct: finalStop,
    takeProfit: +targetPrice.toFixed(4),
    takeProfitPct: finalTarget,
    holdDays: finalHold,
    riskRewardRatio: rr,
    confidence: confidence.score,
    confidenceLabel: confidence.label,
    confidenceColor: confidence.color,
    reasons,
    risks,
    summary: buildSummary(input, confidence, action, sizing),
  };
}
