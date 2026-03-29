/**
 * Signal Profile — Trade Wizard Intelligence Layer
 *
 * Computes a measurable "fingerprint" of market conditions from price data.
 * Used to find historical periods where similar conditions existed.
 *
 * The signal profile answers: "What is actually happening right now?"
 * in concrete, measurable terms — not abstractions like "trending_up".
 *
 * Dimensions:
 *  - Momentum (7d, 14d, 30d returns)
 *  - Volatility (recent vs baseline)
 *  - Trend alignment (are short/medium/long timeframes agreeing?)
 *  - Position (where is price relative to recent highs/lows?)
 *  - Volume behaviour (is participation increasing?)
 *
 * Matching uses weighted Euclidean distance on normalised dimensions.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SignalProfile {
  // Momentum
  return7d: number;         // 7-day return %
  return14d: number;        // 14-day return %
  return30d: number;        // 30-day return %

  // Volatility
  realisedVol: number;      // 10-day realised vol (annualised %)
  volatilityRatio: number;  // recent vol / 30-day baseline vol

  // Trend
  trendAlignment: number;   // 0–1, fraction of timeframes agreeing on direction

  // Position
  distFromHigh30d: number;  // % below 30-day high (0 = at high, negative = above)
  distFromLow30d: number;   // % above 30-day low (0 = at low)

  // Volume
  volumeRatio: number;      // 5-day avg volume / 20-day avg volume (1.0 = normal)

  // Meta
  price: number;
  date: string;
  dayIndex: number;
}

export interface SignalThesis {
  headline: string;       // one line: "Bitcoin is rallying with strong momentum"
  conditions: string[];   // bullet points of specific measurable conditions
  summary: string;        // paragraph combining everything
}

export interface SignalMatch {
  profile: SignalProfile;
  distance: number;       // lower = more similar (0 = identical)
  similarity: number;     // 0–100, higher = more similar
}

// ---------------------------------------------------------------------------
// Profile computation
// ---------------------------------------------------------------------------

function pctReturn(prices: number[], lookback: number): number {
  if (prices.length <= lookback) return 0;
  const current = prices[prices.length - 1];
  const past = prices[prices.length - 1 - lookback];
  return past !== 0 ? ((current - past) / past) * 100 : 0;
}

function realisedVolatility(prices: number[], window: number): number {
  const slice = prices.slice(-window - 1);
  if (slice.length < 2) return 0;
  const returns = [];
  for (let i = 1; i < slice.length; i++) {
    returns.push(slice[i - 1] !== 0 ? (slice[i] - slice[i - 1]) / slice[i - 1] : 0);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100; // annualised %
}

function trendAlignment(prices: number[]): number {
  const lookbacks = [7, 14, 30].filter(lb => prices.length > lb);
  if (lookbacks.length === 0) return 0.5;

  const directions = lookbacks.map(lb => {
    const ret = pctReturn(prices, lb);
    return ret > 0 ? 1 : ret < 0 ? -1 : 0;
  });

  // Check if all agree
  const allUp = directions.every(d => d > 0);
  const allDown = directions.every(d => d < 0);
  if (allUp || allDown) return 1.0;

  // Partial agreement
  const mode = directions.filter(d => d > 0).length >= directions.filter(d => d < 0).length ? 1 : -1;
  const agrees = directions.filter(d => d === mode).length;
  return agrees / directions.length;
}

function highLow30d(prices: number[]): { high: number; low: number } {
  const slice = prices.slice(-30);
  return {
    high: Math.max(...slice),
    low: Math.min(...slice),
  };
}

function avgVolume(volumes: number[], window: number): number {
  const slice = volumes.slice(-window);
  if (slice.length === 0) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/**
 * Compute signal profile for a specific point in a price series.
 * `index` is the day we're computing for; prices[0..index] are available.
 */
export function computeProfile(
  prices: number[],
  volumes: number[],
  dates: string[],
  index: number
): SignalProfile | null {
  if (index < 30) return null; // need at least 30 days of history

  const slice = prices.slice(0, index + 1);
  const volSlice = volumes.slice(0, index + 1);
  const price = prices[index];

  const ret7d = pctReturn(slice, 7);
  const ret14d = pctReturn(slice, 14);
  const ret30d = pctReturn(slice, 30);

  const recentVol = realisedVolatility(slice, 10);
  const baselineVol = realisedVolatility(slice, 30);
  const volRatio = baselineVol > 0 ? recentVol / baselineVol : 1;

  const alignment = trendAlignment(slice);

  const { high, low } = highLow30d(slice);
  const distFromHigh = high !== 0 ? ((price - high) / high) * 100 : 0;
  const distFromLow = low !== 0 ? ((price - low) / low) * 100 : 0;

  const recentAvgVol = avgVolume(volSlice, 5);
  const baselineAvgVol = avgVolume(volSlice, 20);
  const volRatioVol = baselineAvgVol > 0 ? recentAvgVol / baselineAvgVol : 1;

  return {
    return7d: +ret7d.toFixed(2),
    return14d: +ret14d.toFixed(2),
    return30d: +ret30d.toFixed(2),
    realisedVol: +recentVol.toFixed(1),
    volatilityRatio: +volRatio.toFixed(2),
    trendAlignment: +alignment.toFixed(2),
    distFromHigh30d: +distFromHigh.toFixed(2),
    distFromLow30d: +distFromLow.toFixed(2),
    volumeRatio: +volRatioVol.toFixed(2),
    price,
    date: dates[index] ?? "",
    dayIndex: index,
  };
}

/**
 * Compute signal profile for the most recent day in the series.
 */
export function computeCurrentProfile(
  prices: number[],
  volumes: number[],
  dates: string[]
): SignalProfile | null {
  return computeProfile(prices, volumes, dates, prices.length - 1);
}

// ---------------------------------------------------------------------------
// Matching — find historical days with similar conditions
// ---------------------------------------------------------------------------

// Normalisation ranges (empirical, covers most assets)
const NORM_RANGES: Record<string, { min: number; max: number }> = {
  return7d:       { min: -15, max: 15 },
  return14d:      { min: -20, max: 20 },
  return30d:      { min: -30, max: 30 },
  volatilityRatio:{ min: 0.3, max: 3.0 },
  trendAlignment: { min: 0, max: 1 },
  distFromHigh30d:{ min: -20, max: 0 },
  distFromLow30d: { min: 0, max: 30 },
  volumeRatio:    { min: 0.3, max: 3.0 },
};

// Weights — what matters most for matching
const WEIGHTS: Record<string, number> = {
  return7d:        2.0,   // recent momentum matters most
  return14d:       1.5,
  return30d:       1.0,
  volatilityRatio: 1.5,   // vol environment matters
  trendAlignment:  2.0,   // alignment is a strong signal
  distFromHigh30d: 1.0,
  distFromLow30d:  1.0,
  volumeRatio:     0.5,   // volume is noisy, lower weight
};

function normalise(value: number, dim: string): number {
  const range = NORM_RANGES[dim];
  if (!range) return 0;
  const clamped = Math.max(range.min, Math.min(range.max, value));
  return (clamped - range.min) / (range.max - range.min);
}

function profileDistance(a: SignalProfile, b: SignalProfile): number {
  let sumSq = 0;
  const dims = Object.keys(WEIGHTS) as (keyof SignalProfile)[];
  for (const dim of dims) {
    const aVal = a[dim] as number;
    const bVal = b[dim] as number;
    const aNorm = normalise(aVal, dim);
    const bNorm = normalise(bVal, dim);
    const w = WEIGHTS[dim] ?? 1;
    sumSq += w * (aNorm - bNorm) ** 2;
  }
  return Math.sqrt(sumSq);
}

/**
 * Find the N most similar historical days to a target profile.
 * Requires at least `minForwardDays` of subsequent data for backtesting.
 * De-duplicates by requiring `minGapDays` between matches.
 */
export function findSimilarConditions(
  target: SignalProfile,
  allProfiles: SignalProfile[],
  options: {
    maxMatches?: number;
    maxDistance?: number;
    minForwardDays: number;
    minGapDays?: number;
  }
): SignalMatch[] {
  const {
    maxMatches = 15,
    maxDistance = 3.0,
    minForwardDays,
    minGapDays = 10,
  } = options;

  const maxDayIndex = allProfiles.length > 0
    ? Math.max(...allProfiles.map(p => p.dayIndex))
    : 0;

  // Score all candidates
  const scored = allProfiles
    .filter(p => {
      // Exclude profiles too close to the end (need forward data)
      if (maxDayIndex - p.dayIndex < minForwardDays) return false;
      // Exclude the target day itself (if it's in the history)
      if (p.dayIndex === target.dayIndex) return false;
      return true;
    })
    .map(p => ({
      profile: p,
      distance: profileDistance(target, p),
      similarity: 0,
    }))
    .filter(m => m.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);

  // De-duplicate: enforce minimum gap between matches
  const selected: SignalMatch[] = [];
  for (const m of scored) {
    if (selected.length >= maxMatches) break;
    const tooClose = selected.some(
      s => Math.abs(s.profile.dayIndex - m.profile.dayIndex) < minGapDays
    );
    if (tooClose) continue;
    selected.push(m);
  }

  // Convert distance to similarity (0–100)
  const maxDist = Math.max(...selected.map(m => m.distance), 1);
  for (const m of selected) {
    m.similarity = Math.round(Math.max(0, (1 - m.distance / (maxDist * 1.5)) * 100));
  }

  return selected;
}

// ---------------------------------------------------------------------------
// Thesis generation — plain English description of current conditions
// ---------------------------------------------------------------------------

function momentumWord(ret: number): string {
  if (ret > 10) return "surging";
  if (ret > 5) return "rallying strongly";
  if (ret > 2) return "climbing";
  if (ret > 0.5) return "edging higher";
  if (ret > -0.5) return "flat";
  if (ret > -2) return "drifting lower";
  if (ret > -5) return "declining";
  if (ret > -10) return "falling sharply";
  return "in freefall";
}

function volWord(ratio: number): string {
  if (ratio > 2.5) return "extremely volatile";
  if (ratio > 1.8) return "highly volatile";
  if (ratio > 1.3) return "moderately elevated volatility";
  if (ratio > 0.7) return "normal volatility";
  return "unusually calm";
}

function positionWord(distFromHigh: number, distFromLow: number): string {
  if (Math.abs(distFromHigh) < 1) return "trading near its 30-day high";
  if (distFromLow < 3) return "near its 30-day low";
  if (Math.abs(distFromHigh) < 5) return "within 5% of its recent high";
  return `${Math.abs(distFromHigh).toFixed(0)}% below its 30-day high`;
}

function alignmentWord(alignment: number, return30d: number): string {
  if (alignment >= 0.9) {
    return return30d > 0
      ? "all timeframes aligned upward"
      : "all timeframes aligned downward";
  }
  if (alignment >= 0.6) return "mostly consistent across timeframes";
  return "mixed signals across timeframes";
}

function volumeWord(ratio: number): string {
  if (ratio > 1.5) return "Volume is well above average — strong participation.";
  if (ratio > 1.15) return "Volume is slightly above normal.";
  if (ratio > 0.85) return "Volume is average.";
  return "Volume is below normal — thin participation.";
}

export function generateThesis(
  profile: SignalProfile,
  assetName: string,
  direction: string
): SignalThesis {
  const mom7 = momentumWord(profile.return7d);
  const mom30 = momentumWord(profile.return30d);
  const vol = volWord(profile.volatilityRatio);
  const pos = positionWord(profile.distFromHigh30d, profile.distFromLow30d);
  const align = alignmentWord(profile.trendAlignment, profile.return30d);
  const volNote = volumeWord(profile.volumeRatio);

  // Headline
  let headline: string;
  if (Math.abs(profile.return7d) > 5) {
    headline = `${assetName} is ${mom7} — ${profile.return7d > 0 ? "up" : "down"} ${Math.abs(profile.return7d).toFixed(1)}% in 7 days`;
  } else if (Math.abs(profile.return30d) > 5) {
    headline = `${assetName} is ${mom30} over 30 days with ${vol}`;
  } else {
    headline = `${assetName} is ${mom7} in a ${vol} environment`;
  }

  // Conditions
  const conditions: string[] = [];
  conditions.push(`7-day return: ${profile.return7d > 0 ? "+" : ""}${profile.return7d}%`);
  conditions.push(`30-day return: ${profile.return30d > 0 ? "+" : ""}${profile.return30d}%`);
  conditions.push(`Volatility: ${profile.volatilityRatio.toFixed(1)}x normal (${vol})`);
  conditions.push(`Trend: ${align}`);
  conditions.push(`Position: ${pos}`);
  if (profile.volumeRatio > 0) {
    conditions.push(`Volume: ${profile.volumeRatio.toFixed(1)}x average`);
  }

  // Summary
  const dirWord = direction === "long" ? "long" : "short";
  const summary = `${assetName} is ${mom7}, ${profile.return7d > 0 ? "up" : "down"} ${Math.abs(profile.return7d).toFixed(1)}% over 7 days and ${profile.return30d > 0 ? "up" : "down"} ${Math.abs(profile.return30d).toFixed(1)}% over 30 days. ${align.charAt(0).toUpperCase() + align.slice(1)}. The market is ${pos} with ${vol}. ${volNote} I will search the history for every time these same conditions appeared, and show you what a ${dirWord} position would have done.`;

  return { headline, conditions, summary };
}

/**
 * Generate a plain-English description of WHY a historical scenario matched.
 */
export function describeMatch(
  current: SignalProfile,
  match: SignalProfile,
  similarity: number,
  assetName: string
): string {
  const parts: string[] = [];

  // Momentum similarity
  const momDiff7 = Math.abs(current.return7d - match.return7d);
  if (momDiff7 < 2) {
    parts.push(`similar 7-day momentum (${match.return7d > 0 ? "+" : ""}${match.return7d}%)`);
  }

  // Vol similarity
  const volDiff = Math.abs(current.volatilityRatio - match.volatilityRatio);
  if (volDiff < 0.4) {
    parts.push(`comparable volatility (${match.volatilityRatio.toFixed(1)}x)`);
  }

  // Alignment
  if (Math.abs(current.trendAlignment - match.trendAlignment) < 0.2) {
    parts.push(match.trendAlignment >= 0.8 ? "aligned trend" : "mixed trend");
  }

  if (parts.length === 0) parts.push("broadly similar conditions");

  return `${similarity}% match — ${parts.join(", ")}.`;
}
