/**
 * Confidence Engine — Trade Wizard Intelligence Layer
 *
 * Multi-dimensional conviction scorer across 10 factors.
 * Each dimension scores 0-10, then weighted into a final 0-100 score.
 *
 * Dimensions:
 *  1. Regime alignment     — does the market regime support the trade direction?
 *  2. Change-point recency — was there a recent structural shift in our favour?
 *  3. Anomaly penalty      — deduct for extreme/unusual conditions
 *  4. Hypothesis convergence — do multiple hypotheses agree on direction?
 *  5. Test pass rate       — what fraction of validation tests passed?
 *  6. Sentiment alignment  — does market sentiment agree with the thesis?
 *  7. News velocity        — is coverage building or fading?
 *  8. Event proximity      — is a major catalyst nearby?
 *  9. Session quality      — are we in a high-liquidity trading session?
 * 10. Flag freshness       — how recently was this signal generated?
 */

import type { Direction } from "@/types";
import type { RegimeState, RegimeType } from "./intelligence/regime";
import type { ChangepointSignal } from "./intelligence/changepoint";
import type { AnomalyScore } from "./intelligence/anomaly";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConfidenceDimension {
  name: string;
  score: number;       // 0-10
  weight: number;      // relative weight in final score
  label: string;       // plain English summary of this dimension
  positive: boolean;   // is this dimension a positive or negative signal?
}

export interface ConfidenceBreakdown {
  finalScore: number;              // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  dimensions: ConfidenceDimension[];
  topPositive: string;             // strongest supporting factor
  topNegative: string | null;      // strongest risk factor
  summaryLine: string;             // one plain-English sentence
  shouldSurface: boolean;          // whether to show this to the user at all
  suppressionReason: string | null; // if suppressed, why
}

export interface ConfidenceInput {
  direction: Direction;
  convictionScore: number;         // existing 0-100 from flag engine
  regime: RegimeState;
  changepoint: ChangepointSignal;
  anomaly: AnomalyScore;
  hypothesisCount: number;
  hypothesisDirectionAgreement: number; // 0-1: fraction agreeing with direction
  testsPassed: number;
  testsTotal: number;
  sentimentScore: number;          // -100 to 100
  articleCountLast24h: number;
  articleCountPrev24h: number;     // previous period for velocity calc
  hoursToNextEvent: number | null; // null = no event known
  sessionQuality: number;          // 0-1: from session.ts (0=closed, 1=prime time)
  flagAgeHours: number;
}

// ---------------------------------------------------------------------------
// Dimension scorers
// ---------------------------------------------------------------------------

function regimeAlignmentScore(regime: RegimeState, direction: Direction): ConfidenceDimension {
  const regime_type = regime.regime as RegimeType;
  let score = 5; // neutral baseline
  let label = "Neutral regime";

  if (direction === "long") {
    if (regime_type === "trending_up") { score = 9; label = "Regime supports longs"; }
    else if (regime_type === "trending_down") { score = 1; label = "Regime works against longs"; }
    else if (regime_type === "volatile") { score = 3; label = "Volatile regime — risky for longs"; }
    else { score = 5; label = "Ranging market — neutral for longs"; }
  } else if (direction === "short") {
    if (regime_type === "trending_down") { score = 9; label = "Regime supports shorts"; }
    else if (regime_type === "trending_up") { score = 1; label = "Regime works against shorts"; }
    else if (regime_type === "volatile") { score = 3; label = "Volatile regime — risky for shorts"; }
    else { score = 5; label = "Ranging market — neutral for shorts"; }
  }

  return {
    name: "Regime alignment",
    score,
    weight: 15,
    label,
    positive: score >= 5,
  };
}

function changepointScore(cp: ChangepointSignal, direction: Direction): ConfidenceDimension {
  const score = cp.hasRecentBreak
    ? Math.round(5 + cp.breakRecencyScore * 4) // 5-9
    : 4;
  return {
    name: "Structural shift",
    score,
    weight: 10,
    label: cp.hasRecentBreak
      ? `Recent structural shift — ${cp.summary}`
      : "No recent structural break",
    positive: cp.hasRecentBreak,
  };
}

function anomalyPenaltyScore(anomaly: AnomalyScore): ConfidenceDimension {
  // High anomaly = low score (penalty)
  const score = Math.round(10 - anomaly.score * 9);
  return {
    name: "Market conditions",
    score,
    weight: 10,
    label: anomaly.level === "normal"
      ? "Normal market conditions"
      : anomaly.label,
    positive: anomaly.level === "normal",
  };
}

function hypothesisConvergenceScore(
  count: number,
  agreementFraction: number
): ConfidenceDimension {
  const convergenceScore = count === 0 ? 3 : Math.min(10, Math.round(agreementFraction * 8 + (count >= 3 ? 2 : 0)));
  return {
    name: "Hypothesis agreement",
    score: convergenceScore,
    weight: 15,
    label: count === 0
      ? "No hypotheses generated yet"
      : `${Math.round(agreementFraction * 100)}% of scenarios point the same way`,
    positive: convergenceScore >= 6,
  };
}

function testPassRateScore(passed: number, total: number): ConfidenceDimension {
  const rate = total > 0 ? passed / total : 0.5;
  const score = Math.round(rate * 10);
  return {
    name: "Validation tests",
    score,
    weight: 15,
    label: total === 0
      ? "No tests run yet"
      : `${passed} of ${total} validation checks passed`,
    positive: rate >= 0.5,
  };
}

function sentimentAlignmentScore(
  sentimentScore: number,
  direction: Direction
): ConfidenceDimension {
  // Positive sentiment supports longs, negative supports shorts
  const aligned = direction === "long" ? sentimentScore > 0 : sentimentScore < 0;
  const intensity = Math.abs(sentimentScore) / 100;
  const score = aligned
    ? Math.round(5 + intensity * 5)
    : Math.round(5 - intensity * 4);

  return {
    name: "Sentiment alignment",
    score: Math.max(0, Math.min(10, score)),
    weight: 10,
    label: Math.abs(sentimentScore) < 10
      ? "Sentiment is neutral"
      : aligned
        ? `Sentiment supports this direction (${sentimentScore > 0 ? "+" : ""}${sentimentScore})`
        : `Sentiment is working against this thesis`,
    positive: score >= 5,
  };
}

function newsVelocityScore(current24h: number, prev24h: number): ConfidenceDimension {
  const ratio = prev24h > 0 ? current24h / prev24h : 1;
  // Accelerating coverage = good signal (up to a point)
  const score = ratio >= 1.5 ? 8 : ratio >= 1.1 ? 6 : ratio >= 0.8 ? 5 : 3;
  return {
    name: "News momentum",
    score,
    weight: 10,
    label: ratio >= 1.5
      ? "Coverage is accelerating — story is gaining traction"
      : ratio >= 1.0
        ? "Steady news flow"
        : "Coverage is slowing — story may be fading",
    positive: score >= 5,
  };
}

function eventProximityScore(hoursToNextEvent: number | null): ConfidenceDimension {
  if (hoursToNextEvent === null) {
    return {
      name: "Event risk",
      score: 6,
      weight: 10,
      label: "No major events detected nearby",
      positive: true,
    };
  }
  // Very close events = higher risk (but also catalyst)
  const score = hoursToNextEvent < 1 ? 4 :
    hoursToNextEvent < 4 ? 5 :
    hoursToNextEvent < 12 ? 7 : 8;

  return {
    name: "Event risk",
    score,
    weight: 10,
    label: hoursToNextEvent < 4
      ? `Major event in ${Math.round(hoursToNextEvent)}h — high uncertainty window`
      : `Next event is ${Math.round(hoursToNextEvent)}h away — reasonable runway`,
    positive: score >= 6,
  };
}

function sessionQualityScore(sessionQuality: number): ConfidenceDimension {
  const score = Math.round(sessionQuality * 10);
  return {
    name: "Session quality",
    score,
    weight: 5,
    label: sessionQuality >= 0.8
      ? "Prime trading hours — high liquidity"
      : sessionQuality >= 0.5
        ? "Market open — reasonable conditions"
        : sessionQuality > 0
          ? "Low-activity session — wider spreads likely"
          : "Market is closed",
    positive: sessionQuality >= 0.5,
  };
}

function flagFreshnessScore(ageHours: number): ConfidenceDimension {
  const score = ageHours < 2 ? 10 :
    ageHours < 6 ? 9 :
    ageHours < 24 ? 7 :
    ageHours < 48 ? 5 :
    ageHours < 72 ? 3 : 1;

  return {
    name: "Signal freshness",
    score,
    weight: 5,
    label: ageHours < 6
      ? "Fresh signal — generated recently"
      : ageHours < 24
        ? "Signal generated today"
        : `Signal is ${Math.round(ageHours / 24)} day${ageHours >= 48 ? "s" : ""} old — may be stale`,
    positive: score >= 6,
  };
}

// ---------------------------------------------------------------------------
// Final grade + suppression
// ---------------------------------------------------------------------------

function toGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

function buildSummaryLine(score: number, grade: string, direction: Direction, topPositive: string): string {
  const dirLabel = direction === "long" ? "going up" : direction === "short" ? "going down" : "this";
  if (grade === "A") return `Strong conviction — the evidence strongly favours ${dirLabel}.`;
  if (grade === "B") return `Good setup — ${topPositive.toLowerCase()}. Worth a closer look.`;
  if (grade === "C") return `Mixed signals — promising but not fully confirmed yet.`;
  if (grade === "D") return `Weak setup — several factors are working against this trade.`;
  return `Low conviction — the evidence doesn't support trading this right now.`;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function computeConfidence(input: ConfidenceInput): ConfidenceBreakdown {
  const dimensions: ConfidenceDimension[] = [
    regimeAlignmentScore(input.regime, input.direction),
    changepointScore(input.changepoint, input.direction),
    anomalyPenaltyScore(input.anomaly),
    hypothesisConvergenceScore(input.hypothesisCount, input.hypothesisDirectionAgreement),
    testPassRateScore(input.testsPassed, input.testsTotal),
    sentimentAlignmentScore(input.sentimentScore, input.direction),
    newsVelocityScore(input.articleCountLast24h, input.articleCountPrev24h),
    eventProximityScore(input.hoursToNextEvent),
    sessionQualityScore(input.sessionQuality),
    flagFreshnessScore(input.flagAgeHours),
  ];

  // Weighted average (weights sum to 105 but we normalise)
  const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0);
  const rawScore = dimensions.reduce((s, d) => s + (d.score / 10) * d.weight, 0) / totalWeight;

  // Blend with existing conviction score (60% our calc, 40% existing)
  const blendedScore = rawScore * 0.6 * 100 + input.convictionScore * 0.4;
  const finalScore = Math.round(Math.max(0, Math.min(100, blendedScore)));

  const grade = toGrade(finalScore);

  const positives = dimensions.filter(d => d.positive).sort((a, b) => b.score - a.score);
  const negatives = dimensions.filter(d => !d.positive).sort((a, b) => a.score - b.score);

  const topPositive = positives[0]?.label ?? "No strong positive signals";
  const topNegative = negatives[0]?.label ?? null;

  const summaryLine = buildSummaryLine(finalScore, grade, input.direction, topPositive);

  // Suppression logic
  let shouldSurface = true;
  let suppressionReason: string | null = null;

  if (input.anomaly.level === "extreme") {
    shouldSurface = false;
    suppressionReason = "Suppressed: extreme market conditions detected.";
  } else if (finalScore < 20) {
    shouldSurface = false;
    suppressionReason = "Suppressed: insufficient evidence to surface this idea.";
  } else if (input.regime.regime === "volatile" && input.anomaly.level === "high") {
    shouldSurface = false;
    suppressionReason = "Suppressed: volatile + high anomaly is a dangerous combination.";
  }

  return {
    finalScore,
    grade,
    dimensions,
    topPositive,
    topNegative,
    summaryLine,
    shouldSurface,
    suppressionReason,
  };
}

/**
 * Quick confidence estimate when minimal data is available.
 * Falls back gracefully, used when building the briefing for all flags.
 */
export function quickConfidence(
  convictionScore: number,
  testsPassed: number,
  testsTotal: number,
  sentimentScore: number,
  flagAgeHours: number,
  direction: Direction = "long"
): ConfidenceBreakdown {
  // Minimal synthetic regime/cp/anomaly
  const syntheticRegime: RegimeState = {
    regime: "unknown",
    confidence: 0,
    trendSlope: 0,
    volatilityRatio: 1,
    momentumScore: 0.5,
    label: "Unknown",
    implication: "",
  };
  const syntheticCp: ChangepointSignal = {
    hasRecentBreak: false,
    breakRecencyScore: 0,
    changePoints: [],
    summary: "",
  };
  const syntheticAnomaly: AnomalyScore = {
    score: 0,
    level: "normal",
    priceAnomaly: 0,
    volumeAnomaly: 0,
    sentimentAnomaly: 0,
    label: "Normal",
    warning: null,
  };

  return computeConfidence({
    direction,
    convictionScore,
    regime: syntheticRegime,
    changepoint: syntheticCp,
    anomaly: syntheticAnomaly,
    hypothesisCount: testsTotal > 0 ? Math.ceil(testsTotal / 2) : 0,
    hypothesisDirectionAgreement: 0.6,
    testsPassed,
    testsTotal,
    sentimentScore,
    articleCountLast24h: 10,
    articleCountPrev24h: 8,
    hoursToNextEvent: null,
    sessionQuality: 0.7,
    flagAgeHours,
  });
}
