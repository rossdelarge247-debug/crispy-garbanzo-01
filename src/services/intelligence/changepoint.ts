/**
 * Change-Point Detection — Trade Daddy Intelligence Layer
 *
 * Detects structural shifts in a price series using CUSUM (Cumulative Sum)
 * and a sliding window variance ratio test.
 *
 * A change-point signals that the underlying market dynamic has shifted —
 * e.g., a trending market suddenly becomes choppy, or a quiet asset
 * suddenly breaks out.
 *
 * Equivalent to the 'ruptures' library approach but in pure TypeScript.
 */

export interface ChangePoint {
  index: number;         // bar index of the detected change
  magnitude: number;     // how large the structural shift was (0-1)
  type: "mean_shift" | "variance_shift" | "trend_break";
  ageBarss: number;       // how many bars ago was the change-point
  label: string;         // plain English
}

export interface ChangepointSignal {
  hasRecentBreak: boolean;
  breakRecencyScore: number;  // 1 = just happened, 0 = ancient history
  changePoints: ChangePoint[];
  summary: string;
}

/**
 * Simple mean and variance for an array slice.
 */
function stats(arr: number[]): { mean: number; std: number } {
  if (arr.length === 0) return { mean: 0, std: 0 };
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((acc, v) => acc + (v - mean) ** 2, 0) / arr.length;
  return { mean, std: Math.sqrt(variance) };
}

/**
 * CUSUM change-point detection on a return series.
 * Returns indices where cumulative sum exceeds threshold.
 */
function cusumChangePoints(returns: number[], threshold = 0.015): number[] {
  const { mean } = stats(returns);
  let cusum = 0;
  const points: number[] = [];
  let lastPoint = -20; // minimum gap between detections

  for (let i = 0; i < returns.length; i++) {
    cusum += returns[i] - mean;
    if (Math.abs(cusum) > threshold && i - lastPoint > 10) {
      points.push(i);
      lastPoint = i;
      cusum = 0; // reset after detection
    }
  }
  return points;
}

/**
 * Sliding window variance ratio test.
 * Detects when recent variance diverges significantly from baseline.
 */
function varianceBreaks(returns: number[], windowSize = 10): number[] {
  const breakPoints: number[] = [];
  if (returns.length < windowSize * 2) return breakPoints;

  for (let i = windowSize; i < returns.length - windowSize; i++) {
    const before = stats(returns.slice(i - windowSize, i));
    const after = stats(returns.slice(i, i + windowSize));
    const ratio = before.std > 0 ? after.std / before.std : 1;
    if (ratio > 2.5 || ratio < 0.4) {
      breakPoints.push(i);
      i += windowSize; // skip forward to avoid clustering
    }
  }
  return breakPoints;
}

/**
 * Detect change-points in a price series.
 *
 * @param prices Close prices, oldest first
 * @param recencyWindow How many recent bars to consider "recent" (default 15)
 */
export function detectChangePoints(prices: number[], recencyWindow = 15): ChangepointSignal {
  if (prices.length < 20) {
    return {
      hasRecentBreak: false,
      breakRecencyScore: 0,
      changePoints: [],
      summary: "Not enough data to detect structural shifts.",
    };
  }

  const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);

  const meanBreakIndices = cusumChangePoints(returns, 0.012);
  const varBreakIndices = varianceBreaks(returns, 8);

  const allPoints: ChangePoint[] = [];
  const lastIdx = returns.length - 1;

  for (const idx of meanBreakIndices) {
    const before = stats(returns.slice(Math.max(0, idx - 10), idx));
    const after = stats(returns.slice(idx, Math.min(returns.length, idx + 10)));
    const magnitude = Math.min(1, Math.abs(after.mean - before.mean) / (before.std || 0.001));
    allPoints.push({
      index: idx,
      magnitude: +magnitude.toFixed(2),
      type: "mean_shift",
      ageBarss: lastIdx - idx,
      label: after.mean > before.mean ? "Upward shift detected" : "Downward shift detected",
    });
  }

  for (const idx of varBreakIndices) {
    const before = stats(returns.slice(Math.max(0, idx - 8), idx));
    const after = stats(returns.slice(idx, Math.min(returns.length, idx + 8)));
    const ratio = before.std > 0 ? after.std / before.std : 1;
    allPoints.push({
      index: idx,
      magnitude: +Math.min(1, Math.abs(ratio - 1) / 2).toFixed(2),
      type: "variance_shift",
      ageBarss: lastIdx - idx,
      label: ratio > 1 ? "Volatility spike detected" : "Volatility compression detected",
    });
  }

  // Sort by recency
  allPoints.sort((a, b) => a.ageBarss - b.ageBarss);

  const recentBreaks = allPoints.filter(p => p.ageBarss <= recencyWindow);
  const hasRecentBreak = recentBreaks.length > 0;
  const breakRecencyScore = hasRecentBreak
    ? +Math.max(...recentBreaks.map(p => 1 - p.ageBarss / recencyWindow)).toFixed(2)
    : 0;

  const summary = buildSummary(hasRecentBreak, recentBreaks, allPoints);

  return {
    hasRecentBreak,
    breakRecencyScore,
    changePoints: allPoints.slice(0, 5), // surface top 5
    summary,
  };
}

function buildSummary(
  hasRecentBreak: boolean,
  recentBreaks: ChangePoint[],
  allPoints: ChangePoint[]
): string {
  if (!hasRecentBreak) {
    if (allPoints.length === 0) return "Price action has been consistent — no structural shifts detected.";
    return `Market structure has been stable recently. The last notable shift was ${allPoints[0]?.ageBarss ?? "many"} bars ago.`;
  }
  const latest = recentBreaks[0];
  if (latest.type === "variance_shift") {
    return `A volatility shift was detected ${latest.ageBarss} bars ago — the market's behaviour changed recently.`;
  }
  return `A directional shift was detected ${latest.ageBarss} bars ago — something changed in the underlying dynamic.`;
}

/**
 * Proxy estimate when no price series is available.
 * Uses flag age and conviction movement as proxies.
 */
export function estimateChangepointFromFlag(
  convictionScore: number,
  flagAgeHours: number
): ChangepointSignal {
  // Young flags with high conviction = likely a recent structural shift
  const isRecent = flagAgeHours < 6;
  const breakRecencyScore = isRecent ? Math.min(1, convictionScore / 80) : 0;

  return {
    hasRecentBreak: isRecent && convictionScore >= 60,
    breakRecencyScore: +breakRecencyScore.toFixed(2),
    changePoints: [],
    summary: isRecent && convictionScore >= 60
      ? "A fresh signal — conditions may have recently shifted."
      : "No recent structural breaks detected from available signals.",
  };
}
