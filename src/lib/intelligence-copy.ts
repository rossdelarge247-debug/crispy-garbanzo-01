/**
 * Intelligence Translation Layer — Trade Wizard
 *
 * Every quant model output runs through this layer before reaching the UI.
 * No model jargon, no statistical terms, no intimidating numbers.
 * Everything in plain English a first-time trader can understand.
 */

import type { RegimeState, RegimeType } from "@/services/intelligence/regime";
import type { ChangepointSignal } from "@/services/intelligence/changepoint";
import type { AnomalyScore, AnomalyLevel } from "@/services/intelligence/anomaly";
import type { ConfidenceBreakdown } from "@/services/confidence-engine";
import type { Direction } from "@/types";

// ---------------------------------------------------------------------------
// Regime translation
// ---------------------------------------------------------------------------

export function translateRegime(regime: RegimeState): {
  badge: string;       // short pill text e.g. "Trending Up"
  color: string;       // tailwind color class
  explanation: string; // one sentence for the user
} {
  switch (regime.regime as RegimeType) {
    case "trending_up":
      return {
        badge: "Trending Up",
        color: "text-emerald-400 bg-emerald-400/10",
        explanation: regime.implication,
      };
    case "trending_down":
      return {
        badge: "Trending Down",
        color: "text-red-400 bg-red-400/10",
        explanation: regime.implication,
      };
    case "ranging":
      return {
        badge: "Ranging",
        color: "text-amber-400 bg-amber-400/10",
        explanation: regime.implication,
      };
    case "volatile":
      return {
        badge: regime.volatilityRatio > 3 ? "High Volatility" : "Elevated Volatility",
        color: "text-orange-400 bg-orange-400/10",
        explanation: regime.implication,
      };
    default:
      return {
        badge: "Assessing",
        color: "text-text-muted bg-surface-overlay",
        explanation: "Gathering data to assess current conditions.",
      };
  }
}

// ---------------------------------------------------------------------------
// Conviction / confidence translation
// ---------------------------------------------------------------------------

export function translateConfidence(breakdown: ConfidenceBreakdown): {
  label: string;       // "Strong Conviction", "Developing Setup", etc.
  color: string;       // tailwind color class for the score
  emoji: string;
  subtext: string;     // what the score means in one sentence
} {
  const { finalScore, grade } = breakdown;
  if (grade === "A") {
    return {
      label: "Strong conviction",
      color: "text-emerald-400",
      emoji: "✓",
      subtext: "Multiple signals align — this is worth taking seriously.",
    };
  }
  if (grade === "B") {
    return {
      label: "Good setup",
      color: "text-emerald-300",
      emoji: "↑",
      subtext: "More signals support this than oppose it.",
    };
  }
  if (grade === "C") {
    return {
      label: "Mixed signals",
      color: "text-amber-400",
      emoji: "~",
      subtext: "Some things point the right way, others don't. Proceed carefully.",
    };
  }
  if (grade === "D") {
    return {
      label: "Weak setup",
      color: "text-orange-400",
      emoji: "↓",
      subtext: "More signals work against this than support it.",
    };
  }
  return {
    label: "Not ready",
    color: "text-red-400",
    emoji: "✗",
    subtext: `Score: ${finalScore}. The evidence isn't there yet.`,
  };
}

// ---------------------------------------------------------------------------
// Anomaly translation
// ---------------------------------------------------------------------------

export function translateAnomaly(anomaly: AnomalyScore): {
  shouldWarn: boolean;
  warningBadge: string | null;  // e.g. "Unusual Activity"
  warningColor: string;
  warningText: string | null;
} {
  if (anomaly.level === "normal") {
    return {
      shouldWarn: false,
      warningBadge: null,
      warningColor: "",
      warningText: null,
    };
  }
  const colorMap: Record<AnomalyLevel, string> = {
    normal: "",
    elevated: "text-amber-400 bg-amber-400/10",
    high: "text-orange-400 bg-orange-400/10",
    extreme: "text-red-400 bg-red-400/10",
  };
  const badgeMap: Record<AnomalyLevel, string> = {
    normal: "",
    elevated: "Slightly unusual",
    high: "Unusual activity",
    extreme: "Extreme conditions",
  };
  return {
    shouldWarn: true,
    warningBadge: badgeMap[anomaly.level],
    warningColor: colorMap[anomaly.level],
    warningText: anomaly.warning,
  };
}

// ---------------------------------------------------------------------------
// Change-point translation
// ---------------------------------------------------------------------------

export function translateChangepoint(cp: ChangepointSignal): {
  hasSignal: boolean;
  badge: string | null;
  explanation: string;
} {
  if (!cp.hasRecentBreak) {
    return {
      hasSignal: false,
      badge: null,
      explanation: cp.summary || "Market structure has been consistent.",
    };
  }
  return {
    hasSignal: true,
    badge: "Fresh signal",
    explanation: cp.summary,
  };
}

// ---------------------------------------------------------------------------
// Direction translation
// ---------------------------------------------------------------------------

export function translateDirection(direction: Direction): {
  label: string;
  color: string;
  arrow: string;
} {
  switch (direction) {
    case "long":
      return { label: "Going up", color: "text-emerald-400", arrow: "↑" };
    case "short":
      return { label: "Going down", color: "text-red-400", arrow: "↓" };
    default:
      return { label: "Neutral", color: "text-text-muted", arrow: "→" };
  }
}

// ---------------------------------------------------------------------------
// "Does today matter?" translation — regime-aware upgrade/downgrade
// ---------------------------------------------------------------------------

export function adjustTodayAssessment(
  existingStatus: "yes" | "maybe" | "no",
  regime: RegimeState,
  anomaly: AnomalyScore
): {
  status: "yes" | "maybe" | "no";
  regimeNote: string | null;
} {
  // Downgrade if conditions are bad
  if (anomaly.level === "extreme") {
    return {
      status: "no",
      regimeNote: "Extreme market conditions detected — sitting today out is a valid choice.",
    };
  }
  if (anomaly.level === "high" && existingStatus === "yes") {
    return {
      status: "maybe",
      regimeNote: "Unusual market activity — trade with extra caution if you do.",
    };
  }
  if (regime.regime === "volatile" && existingStatus === "yes") {
    return {
      status: "maybe",
      regimeNote: "Markets are choppy right now — size down if you trade today.",
    };
  }
  // Upgrade if regime is strongly supporting
  if ((regime.regime === "trending_up" || regime.regime === "trending_down") && existingStatus === "maybe") {
    return {
      status: "yes",
      regimeNote: `${regime.label} — conditions are supportive.`,
    };
  }
  return {
    status: existingStatus,
    regimeNote: null,
  };
}

// ---------------------------------------------------------------------------
// Dimension label simplification
// ---------------------------------------------------------------------------

/** Map a dimension name to what beginners see */
export function simplifyDimensionName(name: string): string {
  const map: Record<string, string> = {
    "Regime alignment": "Market direction",
    "Structural shift": "Recent changes",
    "Market conditions": "Risk environment",
    "Hypothesis agreement": "Scenario consensus",
    "Validation tests": "Back-testing",
    "Sentiment alignment": "Market mood",
    "News momentum": "Coverage trend",
    "Event risk": "Upcoming events",
    "Session quality": "Trading hours",
    "Signal freshness": "How fresh",
  };
  return map[name] ?? name;
}

/** Convert a 0-10 score to a visual bar width class */
export function scoreToBarWidth(score: number): string {
  const pct = Math.round((score / 10) * 100);
  // Tailwind doesn't support arbitrary width via class name at runtime
  // Return inline style value instead
  return `${pct}%`;
}

/** Convert grade to a colour class */
export function gradeColor(grade: "A" | "B" | "C" | "D" | "F"): string {
  const map = {
    A: "text-emerald-400",
    B: "text-emerald-300",
    C: "text-amber-400",
    D: "text-orange-400",
    F: "text-red-400",
  };
  return map[grade];
}
