/**
 * Data Feed Cache & Health Monitor
 *
 * Central caching layer for all external data feeds. Each feed has:
 * - A cache with configurable TTL
 * - Last-known-good data that persists when a feed fails
 * - Health tracking: last success, last error, status
 * - Automatic fallback to stale data when a feed is down
 *
 * The dashboard can query feed health to show users exactly what's
 * live, what's stale, and what's broken.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FeedStatus = "live" | "stale" | "error" | "unknown";

export interface FeedHealth {
  id: string;
  name: string;
  status: FeedStatus;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  dataAge: number;              // seconds since last successful fetch
  ttl: number;                  // expected refresh interval in seconds
  nextRefreshIn: number;        // seconds until data is considered stale
  hitCount: number;             // times served from cache
  missCount: number;            // times fetched from source
  source: string;               // "polygon" / "gdelt" / "reddit" etc
  rateLimit: string | null;     // human-readable rate limit info
}

export interface FeedCacheEntry<T> {
  data: T;
  fetchedAt: number;            // timestamp ms
  source: string;
  isStale: boolean;
}

interface FeedConfig {
  id: string;
  name: string;
  ttlSeconds: number;
  source: string;
  rateLimit: string | null;
}

interface FeedState<T> {
  config: FeedConfig;
  current: FeedCacheEntry<T> | null;
  lastGood: FeedCacheEntry<T> | null; // preserved when current fails
  lastSuccessAt: number | null;
  lastErrorAt: number | null;
  lastError: string | null;
  hitCount: number;
  missCount: number;
}

// ---------------------------------------------------------------------------
// Cache implementation
// ---------------------------------------------------------------------------

const feeds = new Map<string, FeedState<unknown>>();

function getFeedState<T>(config: FeedConfig): FeedState<T> {
  if (!feeds.has(config.id)) {
    feeds.set(config.id, {
      config,
      current: null,
      lastGood: null,
      lastSuccessAt: null,
      lastErrorAt: null,
      lastError: null,
      hitCount: 0,
      missCount: 0,
    });
  }
  return feeds.get(config.id) as FeedState<T>;
}

function isFresh<T>(state: FeedState<T>): boolean {
  if (!state.current) return false;
  const ageMs = Date.now() - state.current.fetchedAt;
  return ageMs < state.config.ttlSeconds * 1000;
}

/**
 * Get cached data for a feed. Returns cached data if fresh, stale data
 * if available, or null if nothing cached.
 */
export function getCached<T>(config: FeedConfig): FeedCacheEntry<T> | null {
  const state = getFeedState<T>(config);

  if (isFresh(state) && state.current) {
    state.hitCount++;
    return state.current;
  }

  // Return stale data (marked as stale)
  if (state.lastGood) {
    state.hitCount++;
    return { ...state.lastGood, isStale: true };
  }

  return null;
}

/**
 * Store successful fetch result.
 */
export function setCached<T>(config: FeedConfig, data: T): void {
  const state = getFeedState<T>(config);
  const entry: FeedCacheEntry<T> = {
    data,
    fetchedAt: Date.now(),
    source: config.source,
    isStale: false,
  };
  state.current = entry;
  state.lastGood = entry;
  state.lastSuccessAt = Date.now();
  state.lastError = null;
  state.missCount++;
}

/**
 * Record a fetch failure. Preserves last-known-good data.
 */
export function setFailed(config: FeedConfig, error: string): void {
  const state = getFeedState(config);
  state.current = null;
  state.lastErrorAt = Date.now();
  state.lastError = error;
  state.missCount++;
  // Trip source-level circuit breaker
  markSourceFailed(config.source);
}

// ---------------------------------------------------------------------------
// Feed definitions (used by providers)
// ---------------------------------------------------------------------------

export const FEED_CONFIGS = {
  polygon_quote: (symbol: string): FeedConfig => ({
    id: `polygon-quote-${symbol}`,
    name: `Price: ${symbol}`,
    ttlSeconds: 15,
    source: "polygon",
    rateLimit: "5 req/min (free tier)",
  }),
  polygon_historical: (symbol: string): FeedConfig => ({
    id: `polygon-hist-${symbol}`,
    name: `History: ${symbol}`,
    ttlSeconds: 300,
    source: "polygon",
    rateLimit: "5 req/min (free tier)",
  }),
  gdelt_news: (query: string): FeedConfig => ({
    id: `gdelt-${query.slice(0, 30)}`,
    name: `News: ${query.slice(0, 20)}`,
    ttlSeconds: 300,
    source: "gdelt",
    rateLimit: null,
  }),
  reddit: (symbol: string): FeedConfig => ({
    id: `reddit-${symbol}`,
    name: `Reddit: ${symbol}`,
    ttlSeconds: 600,
    source: "reddit",
    rateLimit: "Respectful usage",
  }),
  stocktwits: (symbol: string): FeedConfig => ({
    id: `stocktwits-${symbol}`,
    name: `StockTwits: ${symbol}`,
    ttlSeconds: 600,
    source: "stocktwits",
    rateLimit: null,
  }),
  fear_greed: (): FeedConfig => ({
    id: "fear-greed",
    name: "Fear & Greed Index",
    ttlSeconds: 1800,
    source: "alternative.me",
    rateLimit: "Updates daily",
  }),
  alpha_vantage: (symbol: string): FeedConfig => ({
    id: `av-sentiment-${symbol}`,
    name: `Sentiment: ${symbol}`,
    ttlSeconds: 1800,
    source: "alpha_vantage",
    rateLimit: "25 req/day",
  }),
  calendar: (): FeedConfig => ({
    id: "calendar",
    name: "Economic Calendar",
    ttlSeconds: 600,
    source: "forex_factory",
    rateLimit: "2 req/5min",
  }),
  claude_analysis: (themeId: string): FeedConfig => ({
    id: `claude-${themeId}`,
    name: `AI Analysis: ${themeId}`,
    ttlSeconds: 600,
    source: "anthropic",
    rateLimit: "API tier dependent",
  }),
} as const;

// ---------------------------------------------------------------------------
// Health reporting
// ---------------------------------------------------------------------------

/**
 * Get health status for all registered feeds.
 */
export function getAllFeedHealth(): FeedHealth[] {
  const results: FeedHealth[] = [];
  const now = Date.now();

  for (const [, state] of feeds) {
    const dataAge = state.lastSuccessAt
      ? Math.round((now - state.lastSuccessAt) / 1000)
      : -1;

    const nextRefreshIn = state.current
      ? Math.max(0, Math.round(state.config.ttlSeconds - (now - state.current.fetchedAt) / 1000))
      : 0;

    let status: FeedStatus = "unknown";
    if (state.current && isFresh(state as FeedState<unknown>)) {
      status = "live";
    } else if (state.lastGood && state.lastSuccessAt) {
      status = "stale";
    } else if (state.lastErrorAt) {
      status = "error";
    }

    results.push({
      id: state.config.id,
      name: state.config.name,
      status,
      lastSuccessAt: state.lastSuccessAt ? new Date(state.lastSuccessAt).toISOString() : null,
      lastErrorAt: state.lastErrorAt ? new Date(state.lastErrorAt).toISOString() : null,
      lastError: state.lastError,
      dataAge,
      ttl: state.config.ttlSeconds,
      nextRefreshIn,
      hitCount: state.hitCount,
      missCount: state.missCount,
      source: state.config.source,
      rateLimit: state.config.rateLimit,
    });
  }

  // Sort: errors first, then stale, then live
  const order: Record<FeedStatus, number> = { error: 0, stale: 1, unknown: 2, live: 3 };
  results.sort((a, b) => order[a.status] - order[b.status]);

  return results;
}

/**
 * Get a summary of feed health for the dashboard.
 */
export function getFeedSummary(): {
  total: number;
  live: number;
  stale: number;
  error: number;
  oldestDataAge: number;
  issues: string[];
} {
  const all = getAllFeedHealth();
  const live = all.filter(f => f.status === "live").length;
  const stale = all.filter(f => f.status === "stale").length;
  const error = all.filter(f => f.status === "error").length;
  const oldestDataAge = Math.max(...all.map(f => f.dataAge).filter(a => a >= 0), 0);

  const issues: string[] = [];
  for (const f of all) {
    if (f.status === "error") {
      issues.push(`${f.name}: ${f.lastError ?? "connection failed"}`);
    } else if (f.status === "stale" && f.dataAge > f.ttl * 3) {
      issues.push(`${f.name}: data is ${Math.round(f.dataAge / 60)}min old`);
    }
  }

  return { total: all.length, live, stale, error, oldestDataAge, issues };
}

/**
 * Check if a feed is currently in a failed state (circuit breaker).
 * If a feed failed recently, skip the fetch and return stale data.
 */
// Source-level circuit breaker — once a source fails, all feeds from that source pause
const sourceErrors = new Map<string, number>(); // source → last error timestamp
const SOURCE_COOLDOWN_MS = 120_000; // 2 minutes after a source fails

export function markSourceFailed(source: string): void {
  sourceErrors.set(source, Date.now());
}

export function isCircuitOpen(config: FeedConfig): boolean {
  // Check source-level breaker first
  const sourceErr = sourceErrors.get(config.source);
  if (sourceErr && Date.now() - sourceErr < SOURCE_COOLDOWN_MS) return true;

  // Check per-feed breaker
  const state = feeds.get(config.id);
  if (!state) return false;
  if (!state.lastErrorAt) return false;
  const cooldown = config.ttlSeconds * 2000;
  return Date.now() - state.lastErrorAt < cooldown;
}

/**
 * Wrapper: fetch with cache. Tries cache first, fetches if stale,
 * falls back to last-known-good on failure.
 */
export async function fetchWithCache<T>(
  config: FeedConfig,
  fetcher: () => Promise<T>,
  validator?: (data: T) => boolean
): Promise<{ data: T; fromCache: boolean; isStale: boolean } | null> {
  // Check cache first
  const cached = getCached<T>(config);
  if (cached && !cached.isStale) {
    return { data: cached.data, fromCache: true, isStale: false };
  }

  // Circuit breaker: if this feed failed recently, don't retry
  if (isCircuitOpen(config)) {
    if (cached) return { data: cached.data, fromCache: true, isStale: true };
    return null;
  }

  // Try to fetch fresh data
  try {
    const data = await fetcher();
    if (validator && !validator(data)) {
      throw new Error("Validation failed");
    }
    setCached(config, data);
    return { data, fromCache: false, isStale: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    setFailed(config, msg);

    // Fall back to stale data
    if (cached) {
      return { data: cached.data, fromCache: true, isStale: true };
    }

    return null;
  }
}
