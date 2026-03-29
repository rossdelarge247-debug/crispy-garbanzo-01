/**
 * Regime Detection — Trade Daddy Intelligence Layer
 *
 * Detects the current market regime using rolling statistical measures:
 * - Trend slope (linear regression over recent bars)
 * - Volatility ratio (recent vol vs baseline vol)
 * - Momentum consistency (directional agreement across lookbacks)
 *
 * Outputs a plain-English regime label users can understand.
 * No statsmodels/HMM dependency — equivalent logic in pure TypeScript.
 */

export type RegimeType = "trending_up" | "trending_down" | "ranging" | "volatile" | "unknown";

export interface RegimeState {
  regime: RegimeType;
  confidence: number;      // 0-1 how confident we are in this regime classification
  trendSlope: number;      // positive = up, negative = down (-1 to 1 normalised)
  volatilityRatio: number; // recent vol / baseline vol. >1.5 = elevated, >2.5 = extreme
  momentumScore: number;   // 0-1, agreement across short/med/long lookbacks
  label: string;           // plain English
  implication: string;     // what this means for trading
}

/**
 * Estimate linear trend slope from a price series.
 * Returns a value in [-1, 1] normalised by the price range.
 */
function trendSlope(prices: number[]): number {
  const n = prices.length;
  if (n < 2) return 0;
  const sumX = (n * (n - 1)) / 2;
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const sumY = prices.reduce((a, b) => a + b, 0);
  const sumXY = prices.reduce((acc, p, i) => acc + i * p, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  // Normalise by mean price so it's a fractional move per bar
  const mean = sumY / n;
  return mean !== 0 ? slope / mean : 0;
}

/**
 * Rolling standard deviation of returns.
 */
function rollingVol(prices: number[], window: number): number {
  if (prices.length < 2) return 0;
  const slice = prices.slice(-window);
  const returns = slice.slice(1).map((p, i) => (p - slice[i]) / slice[i]);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

/**
 * Momentum consistency: fraction of sub-lookbacks that agree in direction.
 */
function momentumConsistency(prices: number[], direction: "up" | "down"): number {
  const lookbacks = [5, 10, 20, 40].filter(lb => prices.length > lb);
  if (lookbacks.length === 0) return 0.5;
  const agreements = lookbacks.filter(lb => {
    const change = prices[prices.length - 1] - prices[prices.length - 1 - lb];
    return direction === "up" ? change > 0 : change < 0;
  });
  return agreements.length / lookbacks.length;
}

/**
 * Detect market regime from a price series.
 * Expects at least 20 data points for reasonable accuracy.
 *
 * @param prices Array of close prices, oldest first
 * @param baselineWindow How many bars to use as vol baseline (default 60)
 */
export function detectRegime(prices: number[], baselineWindow = 60): RegimeState {
  if (prices.length < 5) {
    return {
      regime: "unknown",
      confidence: 0,
      trendSlope: 0,
      volatilityRatio: 1,
      momentumScore: 0.5,
      label: "Insufficient data",
      implication: "Not enough price history to assess market conditions.",
    };
  }

  const slope = trendSlope(prices.slice(-20));
  const recentVol = rollingVol(prices, Math.min(10, prices.length));
  const baselineVol = rollingVol(prices, Math.min(baselineWindow, prices.length));
  const volRatio = baselineVol > 0 ? recentVol / baselineVol : 1;

  // Determine direction bias for momentum check
  const direction = slope >= 0 ? "up" : "down";
  const momentum = momentumConsistency(prices, direction);

  // Classify regime
  let regime: RegimeType;
  let confidence: number;

  if (volRatio > 2.0) {
    regime = "volatile";
    confidence = Math.min(1, (volRatio - 2.0) / 2 + 0.6);
  } else if (Math.abs(slope) > 0.003 && momentum >= 0.6) {
    regime = slope > 0 ? "trending_up" : "trending_down";
    confidence = Math.min(1, momentum * 0.8 + Math.min(Math.abs(slope) / 0.01, 0.2));
  } else {
    regime = "ranging";
    confidence = Math.min(1, (1 - Math.abs(slope) / 0.003) * 0.7 + 0.3);
  }

  const { label, implication } = regimeCopy(regime, volRatio);

  return {
    regime,
    confidence: +confidence.toFixed(2),
    trendSlope: +slope.toFixed(4),
    volatilityRatio: +volRatio.toFixed(2),
    momentumScore: +momentum.toFixed(2),
    label,
    implication,
  };
}

function regimeCopy(regime: RegimeType, volRatio: number): { label: string; implication: string } {
  switch (regime) {
    case "trending_up":
      return {
        label: "Trending up",
        implication: "The market is in a clear upward move. Long setups have a tailwind right now.",
      };
    case "trending_down":
      return {
        label: "Trending down",
        implication: "The market is in a clear downward move. Short setups have more support.",
      };
    case "ranging":
      return {
        label: "Ranging / Consolidating",
        implication: "The market is moving sideways. Breakout setups are riskier — wait for a clear direction.",
      };
    case "volatile":
      return {
        label: volRatio > 3.5 ? "Highly volatile — extreme caution" : "Elevated volatility",
        implication:
          volRatio > 3.5
            ? "Markets are moving erratically. This is a dangerous time to enter — spreads are wide and moves can reverse suddenly."
            : "Volatility is above normal. Wider stop losses needed, or consider sitting this one out.",
      };
    default:
      return {
        label: "Unclear conditions",
        implication: "Not enough data to assess regime.",
      };
  }
}

/**
 * Synthesise a regime from flag-level signals when no price series is available.
 * Uses conviction score, sentiment, and flag age as proxies.
 */
export function estimateRegimeFromFlag(
  convictionScore: number,
  sentimentScore: number,
  flagAgeHours: number
): RegimeState {
  // Proxy: high conviction + positive sentiment = trending, stale = ranging
  const staleness = Math.min(flagAgeHours / 72, 1); // 3 days = fully stale
  const volProxy = staleness > 0.7 ? 1.8 : 1.0;
  const slopeProxy = (sentimentScore / 100) * (convictionScore / 100) * 0.005;

  const regime: RegimeType =
    volProxy > 1.5 ? "volatile" :
    convictionScore >= 65 ? (sentimentScore > 10 ? "trending_up" : "trending_down") :
    "ranging";

  const { label, implication } = regimeCopy(regime, volProxy);

  return {
    regime,
    confidence: +(convictionScore / 100 * 0.8).toFixed(2),
    trendSlope: +slopeProxy.toFixed(4),
    volatilityRatio: +volProxy.toFixed(2),
    momentumScore: +(convictionScore / 100).toFixed(2),
    label,
    implication,
  };
}
