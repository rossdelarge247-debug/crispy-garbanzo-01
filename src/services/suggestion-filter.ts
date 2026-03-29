/**
 * Suggestion Filter — Trade Daddy Intelligence Layer
 *
 * Suppression and tradeability filter for market suggestions.
 *
 * Suppression logic:
 *  - Anomaly extreme → suppress entirely
 *  - Conviction < threshold (varies by user risk style) → suppress
 *  - Regime opposes direction + low test pass rate → suppress
 *  - Volatile + high anomaly combination → suppress
 *
 * Tradeability:
 *  - Market closed → not tradeable right now
 *  - Major event in < 1h → flag with warning
 *  - Low conviction grade → downgrade verdict
 */

import type { Direction } from "@/types";
import type { RegimeState } from "./intelligence/regime";
import type { AnomalyScore } from "./intelligence/anomaly";
import type { ConfidenceBreakdown } from "./confidence-engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RiskStyle = "cautious" | "balanced" | "aggressive";
export type Verdict = "explore" | "monitor" | "wait" | "suppressed";

export interface FilteredSuggestion {
  verdict: Verdict;
  verdictReason: string;
  tradeabilityWarning: string | null;
  isSupressed: boolean;
  suppressionReason: string | null;
}

// ---------------------------------------------------------------------------
// Thresholds by risk style
// ---------------------------------------------------------------------------

const CONVICTION_THRESHOLDS: Record<RiskStyle, number> = {
  cautious: 65,    // only high-quality setups
  balanced: 45,    // medium-quality and above
  aggressive: 30,  // lower bar — catch more opportunities
};

const VERDICT_THRESHOLDS: Record<RiskStyle, { explore: number; monitor: number }> = {
  cautious:   { explore: 75, monitor: 55 },
  balanced:   { explore: 65, monitor: 45 },
  aggressive: { explore: 50, monitor: 35 },
};

// ---------------------------------------------------------------------------
// Tradeability check
// ---------------------------------------------------------------------------

function checkTradeability(
  sessionQuality: number,
  hoursToNextEvent: number | null,
  anomaly: AnomalyScore
): string | null {
  if (sessionQuality === 0) {
    return "Market is closed right now. Set an alert for when it reopens.";
  }
  if (hoursToNextEvent !== null && hoursToNextEvent < 1) {
    return `Major event in under an hour — entering now carries high uncertainty. Consider waiting.`;
  }
  if (hoursToNextEvent !== null && hoursToNextEvent < 2 && anomaly.level !== "normal") {
    return `Event coming up in ${Math.round(hoursToNextEvent * 60)} minutes — and conditions are already unusual. Extra caution advised.`;
  }
  if (sessionQuality < 0.4) {
    return "Low-liquidity session — spreads may be wider than usual.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main filter function
// ---------------------------------------------------------------------------

export function filterSuggestion(
  convictionScore: number,
  confidence: ConfidenceBreakdown,
  regime: RegimeState,
  anomaly: AnomalyScore,
  direction: Direction,
  testPassRate: number,
  sessionQuality: number,
  hoursToNextEvent: number | null,
  riskStyle: RiskStyle = "balanced"
): FilteredSuggestion {
  // --- Suppression checks (hard stops) ---
  if (!confidence.shouldSurface) {
    return {
      verdict: "suppressed",
      verdictReason: confidence.suppressionReason ?? "Insufficient evidence",
      tradeabilityWarning: null,
      isSupressed: true,
      suppressionReason: confidence.suppressionReason,
    };
  }

  const threshold = CONVICTION_THRESHOLDS[riskStyle];
  if (confidence.finalScore < threshold) {
    return {
      verdict: "suppressed",
      verdictReason: `Score of ${confidence.finalScore} is below your minimum threshold of ${threshold}`,
      tradeabilityWarning: null,
      isSupressed: true,
      suppressionReason: `Below your risk threshold (${riskStyle} profile requires ${threshold}+)`,
    };
  }

  // Regime opposes direction + poor test pass rate = suppress
  const regimeOpposes =
    (direction === "long" && regime.regime === "trending_down") ||
    (direction === "short" && regime.regime === "trending_up");

  if (regimeOpposes && testPassRate < 0.3) {
    return {
      verdict: "suppressed",
      verdictReason: "Regime opposes direction and tests show low confidence",
      tradeabilityWarning: null,
      isSupressed: true,
      suppressionReason: "Regime and test results both work against this setup",
    };
  }

  // --- Tradeability check (soft warnings) ---
  const tradeabilityWarning = checkTradeability(sessionQuality, hoursToNextEvent, anomaly);

  // --- Verdict assignment ---
  const thresholds = VERDICT_THRESHOLDS[riskStyle];
  let verdict: Verdict;
  let verdictReason: string;

  if (confidence.finalScore >= thresholds.explore) {
    verdict = "explore";
    verdictReason = confidence.summaryLine;
  } else if (confidence.finalScore >= thresholds.monitor) {
    verdict = "monitor";
    verdictReason = "Promising but needs more confirmation before acting";
  } else {
    verdict = "wait";
    verdictReason = "Not enough evidence yet — keep an eye on it";
  }

  // Downgrade if anomaly is high
  if (anomaly.level === "high" && verdict === "explore") {
    verdict = "monitor";
    verdictReason = "Downgraded: unusual market conditions — monitor but don't rush in";
  }

  return {
    verdict,
    verdictReason,
    tradeabilityWarning,
    isSupressed: false,
    suppressionReason: null,
  };
}

// ---------------------------------------------------------------------------
// Batch filter for briefing
// ---------------------------------------------------------------------------

export interface SuggestionFilterInput {
  convictionScore: number;
  confidence: ConfidenceBreakdown;
  regime: RegimeState;
  anomaly: AnomalyScore;
  direction: Direction;
  testPassRate: number;
  sessionQuality: number;
  hoursToNextEvent: number | null;
}

export function filterSuggestions(
  suggestions: SuggestionFilterInput[],
  riskStyle: RiskStyle = "balanced"
): FilteredSuggestion[] {
  return suggestions.map(s =>
    filterSuggestion(
      s.convictionScore,
      s.confidence,
      s.regime,
      s.anomaly,
      s.direction,
      s.testPassRate,
      s.sessionQuality,
      s.hoursToNextEvent,
      riskStyle
    )
  );
}
