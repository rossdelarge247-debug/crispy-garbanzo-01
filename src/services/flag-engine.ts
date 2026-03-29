/**
 * Flag Engine — Central orchestrator for market flags and provider integration.
 *
 * The engine first attempts to generate flags from live news data via the
 * live-flag-generator. If live data is unavailable or returns nothing,
 * it falls back to mock data for a working demo experience.
 *
 * Live flag generation:
 *   1. Fetches news from connected providers (GDELT, NewsAPI)
 *   2. Clusters articles into market themes (energy, crypto, FX, tech, risk)
 *   3. Scores themes by article volume, keyword diversity, recency
 *   4. Generates MarketFlag + Hypothesis objects for top-scoring themes
 *
 * All functions cache their results for 5 minutes to avoid excessive API calls.
 */

import type {
  MarketFlag,
  MarketFlagDetail,
  Hypothesis,
  TestScenario,
  TradePlan,
  MarketDataPoint,
  NewsArticle,
  SentimentData,
  EconomicEvent,
} from "@/types";

import { mockFlags, mockFlagDetails } from "@/data/mock-flags";
import { mockHypotheses } from "@/data/mock-hypotheses";
import { mockTests } from "@/data/mock-tests";
import { mockTradePlans } from "@/data/mock-trade-plans";

import { getMarketDataProvider } from "@/services/market-data";
import { getNewsProvider } from "@/services/news";
import { getSentimentProvider } from "@/services/sentiment";
import { getCalendarProvider } from "@/services/calendar";
import { generateLiveFlags } from "@/services/live-flag-generator";
import { generateTestsForHypothesis, generateTestsForFlag as generateLiveTestsForFlag } from "@/services/test-generator";

export { getExecutionProvider } from "@/services/execution";

// ---------------------------------------------------------------------------
// In-memory cache (per serverless instance, 5-minute TTL)
// ---------------------------------------------------------------------------

interface CachedData {
  flags: MarketFlagDetail[];
  hypotheses: Hypothesis[];
  fetchedAt: number;
  source: "live" | "mock";
}

let cache: CachedData | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isCacheValid(): boolean {
  return cache !== null && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

async function ensureData(): Promise<CachedData> {
  if (isCacheValid()) return cache!;

  try {
    const result = await generateLiveFlags();

    if (result.flags.length > 0) {
      cache = {
        flags: result.flags,
        hypotheses: result.hypotheses,
        fetchedAt: Date.now(),
        source: "live",
      };
      console.log(`[flag-engine] Generated ${result.flags.length} live flags from ${result.hypotheses.length} hypotheses`);
      return cache;
    }
  } catch (error) {
    console.warn("[flag-engine] Live flag generation failed, using mock data:", error);
  }

  // Fallback to mock data
  cache = {
    flags: mockFlagDetails,
    hypotheses: mockHypotheses,
    fetchedAt: Date.now(),
    source: "mock",
  };
  console.log("[flag-engine] Using mock data (live generation returned no flags)");
  return cache;
}

// ---------------------------------------------------------------------------
// Public API — used by all pages
// ---------------------------------------------------------------------------

export async function getFlags(): Promise<MarketFlag[]> {
  const data = await ensureData();
  return data.flags;
}

export async function getFlagById(id: string): Promise<MarketFlagDetail | null> {
  const data = await ensureData();
  return data.flags.find(f => f.id === id) || null;
}

export async function getHypotheses(flagId: string): Promise<Hypothesis[]> {
  const data = await ensureData();
  return data.hypotheses.filter(h => h.flagId === flagId);
}

export async function getTests(hypothesisId: string): Promise<TestScenario[]> {
  const data = await ensureData();
  if (data.source === "mock") {
    return mockTests.filter(t => t.hypothesisId === hypothesisId);
  }

  // Live mode: generate tests dynamically from available data
  const hypothesis = data.hypotheses.find(h => h.id === hypothesisId);
  if (!hypothesis) return [];

  const flag = data.flags.find(f => f.id === hypothesis.flagId);
  if (!flag) return [];

  try {
    return await generateTestsForHypothesis(hypothesis, flag);
  } catch (error) {
    console.warn("[flag-engine] Test generation failed:", error);
    return [];
  }
}

export async function getTestsForFlag(flagId: string): Promise<TestScenario[]> {
  const data = await ensureData();
  if (data.source === "mock") {
    return mockTests.filter(t => t.flagId === flagId);
  }

  // Live mode: generate tests for all hypotheses of this flag
  const flag = data.flags.find(f => f.id === flagId);
  if (!flag) return [];

  const hypotheses = data.hypotheses.filter(h => h.flagId === flagId);
  if (hypotheses.length === 0) return [];

  try {
    return await generateLiveTestsForFlag(hypotheses, flag);
  } catch (error) {
    console.warn("[flag-engine] Test generation for flag failed:", error);
    return [];
  }
}

export async function getTradePlan(flagId: string): Promise<TradePlan | null> {
  // Trade plans require execution engine (Phase 3) — return mock for now
  const data = await ensureData();
  if (data.source === "mock") {
    return mockTradePlans.find(p => p.flagId === flagId) || null;
  }
  return null;
}

/** Returns whether the engine is running on live or mock data */
export async function getDataSource(): Promise<"live" | "mock"> {
  const data = await ensureData();
  return data.source;
}

// ---------------------------------------------------------------------------
// Provider-backed functions — direct access to live provider data
// ---------------------------------------------------------------------------

export async function getMarketQuote(symbol: string): Promise<MarketDataPoint> {
  const provider = getMarketDataProvider();
  return provider.getQuote(symbol);
}

export async function getNewsForFlag(flagId: string): Promise<NewsArticle[]> {
  const data = await ensureData();
  const flag = data.flags.find(f => f.id === flagId);
  if (!flag) return [];

  const symbols = flag.affectedAssets.map(a => a.symbol);
  const newsProvider = getNewsProvider();

  const results = await Promise.all(
    symbols.map(symbol => newsProvider.getNewsBySymbol(symbol)),
  );

  const seen = new Set<string>();
  const articles: NewsArticle[] = [];
  for (const batch of results) {
    for (const article of batch) {
      if (!seen.has(article.id)) {
        seen.add(article.id);
        articles.push(article);
      }
    }
  }

  return articles;
}

export async function getSentimentForFlag(flagId: string): Promise<SentimentData[]> {
  const data = await ensureData();
  const flag = data.flags.find(f => f.id === flagId);
  if (!flag) return [];

  const symbols = flag.affectedAssets.map(a => a.symbol);
  const sentimentProvider = getSentimentProvider();

  return sentimentProvider.getBulkSentiment(symbols);
}

export async function getUpcomingEvents(days?: number): Promise<EconomicEvent[]> {
  const calendarProv = getCalendarProvider();
  return calendarProv.getUpcomingEvents(days);
}
