/**
 * Anomaly Detection — Trade Daddy Intelligence Layer
 *
 * Detects outlier conditions in price/volume/sentiment using:
 * - Z-score outlier detection on returns
 * - IQR fence method on volume
 * - Composite anomaly score
 *
 * Equivalent to Isolation Forest outputs but in pure TypeScript.
 * High anomaly score = unusual market conditions = higher uncertainty.
 */

export type AnomalyLevel = "normal" | "elevated" | "high" | "extreme";

export interface AnomalyScore {
  score: number;           // 0-1 where 1 = highly anomalous
  level: AnomalyLevel;
  priceAnomaly: number;    // 0-1
  volumeAnomaly: number;   // 0-1
  sentimentAnomaly: number; // 0-1
  label: string;
  warning: string | null;  // null if normal, warning text if elevated+
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / arr.length);
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

/**
 * Z-score anomaly: how many standard deviations is the latest value?
 * Returns 0-1 score where 1 = extremely anomalous.
 */
function zScoreAnomaly(values: number[]): number {
  if (values.length < 5) return 0;
  const baseline = values.slice(0, -1);
  const latest = values[values.length - 1];
  const s = std(baseline);
  if (s === 0) return 0;
  const z = Math.abs((latest - mean(baseline)) / s);
  // z=2 → 0.5, z=3 → 0.75, z=4+ → 1.0
  return Math.min(1, z / 4);
}

/**
 * IQR fence anomaly: is the latest value beyond the IQR fences?
 * Returns 0-1 score.
 */
function iqrAnomaly(values: number[]): number {
  if (values.length < 8) return 0;
  const baseline = values.slice(0, -1);
  const latest = values[values.length - 1];
  const q1 = percentile(baseline, 25);
  const q3 = percentile(baseline, 75);
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  if (latest < lower || latest > upper) {
    // How far outside the fence?
    const fence = latest < lower ? lower - latest : latest - upper;
    return Math.min(1, fence / (iqr * 2 + 0.001));
  }
  return 0;
}

function anomalyLevel(score: number): AnomalyLevel {
  if (score >= 0.75) return "extreme";
  if (score >= 0.5) return "high";
  if (score >= 0.25) return "elevated";
  return "normal";
}

function buildWarning(level: AnomalyLevel, priceAnom: number, volAnom: number, sentAnom: number): string | null {
  if (level === "normal") return null;
  const parts: string[] = [];
  if (priceAnom >= 0.5) parts.push("unusual price moves");
  if (volAnom >= 0.5) parts.push("abnormal volume");
  if (sentAnom >= 0.5) parts.push("extreme sentiment reading");
  if (parts.length === 0) parts.push("unusual conditions");

  switch (level) {
    case "extreme":
      return `Extreme anomaly: ${parts.join(", ")} detected. A dangerous environment — the wizard counsels staying away from this one.`;
    case "high":
      return `High anomaly: ${parts.join(", ")}. Tread carefully — conditions are unusual.`;
    case "elevated":
      return `Slightly unusual: ${parts.join(", ")}. Use smaller size if you trade this.`;
  }
}

function buildLabel(level: AnomalyLevel): string {
  switch (level) {
    case "extreme": return "Extreme conditions";
    case "high": return "Unusual market activity";
    case "elevated": return "Slightly elevated risk";
    case "normal": return "Normal conditions";
  }
}

/**
 * Compute anomaly score from price, volume, and sentiment series.
 * All arrays should be same length, oldest first.
 *
 * @param prices Close prices
 * @param volumes Volume data (optional — pass empty array to skip)
 * @param sentimentScores Sentiment series -100 to 100 (optional)
 */
export function computeAnomalyScore(
  prices: number[],
  volumes: number[] = [],
  sentimentScores: number[] = []
): AnomalyScore {
  // Compute returns from prices
  const returns = prices.length >= 2
    ? prices.slice(1).map((p, i) => (p - prices[i]) / prices[i])
    : [];

  const priceAnomaly = returns.length >= 5
    ? Math.max(zScoreAnomaly(returns), iqrAnomaly(returns))
    : 0;

  const volumeAnomaly = volumes.length >= 8
    ? Math.max(zScoreAnomaly(volumes), iqrAnomaly(volumes))
    : 0;

  const sentimentAnomaly = sentimentScores.length >= 5
    ? zScoreAnomaly(sentimentScores)
    : 0;

  // Weighted composite: price 50%, volume 30%, sentiment 20%
  const score = +(
    priceAnomaly * 0.5 +
    volumeAnomaly * 0.3 +
    sentimentAnomaly * 0.2
  ).toFixed(2);

  const level = anomalyLevel(score);

  return {
    score,
    level,
    priceAnomaly: +priceAnomaly.toFixed(2),
    volumeAnomaly: +volumeAnomaly.toFixed(2),
    sentimentAnomaly: +sentimentAnomaly.toFixed(2),
    label: buildLabel(level),
    warning: buildWarning(level, priceAnomaly, volumeAnomaly, sentimentAnomaly),
  };
}

/**
 * Proxy estimate from flag-level data when no price series available.
 */
export function estimateAnomalyFromFlag(
  convictionScore: number,
  sentimentScore: number,
  articleCount: number
): AnomalyScore {
  // High article count + extreme sentiment = potential anomaly
  const sentimentExtremity = Math.abs(sentimentScore) / 100;
  const volumeProxy = Math.min(1, articleCount / 50); // 50+ articles = potentially viral
  const score = +(sentimentExtremity * 0.4 + volumeProxy * 0.3 + (convictionScore > 85 ? 0.3 : 0)).toFixed(2);
  const level = anomalyLevel(score);

  return {
    score,
    level,
    priceAnomaly: 0,
    volumeAnomaly: +volumeProxy.toFixed(2),
    sentimentAnomaly: +sentimentExtremity.toFixed(2),
    label: buildLabel(level),
    warning: buildWarning(level, 0, volumeProxy, sentimentExtremity),
  };
}
