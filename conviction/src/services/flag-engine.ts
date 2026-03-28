/**
 * Flag Engine — Central orchestrator for market flags and provider integration.
 *
 * Phase 1 (current):
 *   getFlags(), getFlagById(), getHypotheses(), getTests(), getTradePlan()
 *   all return pre-computed mock data. This lets the UI render immediately
 *   without waiting for external API calls or complex aggregation logic.
 *
 * Phase 2 (planned):
 *   These functions will generate flags dynamically by aggregating real-time
 *   data from the market data, news, sentiment, and calendar providers.
 *   The engine will score and rank signals, create hypotheses automatically,
 *   and feed validated trade plans into the execution provider.
 *
 * In the meantime, the new provider-backed functions (getMarketQuote,
 * getNewsForFlag, getSentimentForFlag, getUpcomingEvents) give the UI
 * access to live (or mock) provider data alongside the static flags.
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
import { getExecutionProvider } from "@/services/execution";

// Re-export the execution provider factory so consumers can access it
// through the flag engine without importing the execution module directly.
export { getExecutionProvider } from "@/services/execution";

// ---------------------------------------------------------------------------
// Phase 1 — Static mock data (unchanged)
// ---------------------------------------------------------------------------

export async function getFlags(): Promise<MarketFlag[]> {
  // In production: aggregate from market data, news, sentiment, calendar providers
  // For Phase 1: return mock data
  return mockFlags;
}

export async function getFlagById(id: string): Promise<MarketFlagDetail | null> {
  return mockFlagDetails.find(f => f.id === id) || null;
}

export async function getHypotheses(flagId: string): Promise<Hypothesis[]> {
  return mockHypotheses.filter(h => h.flagId === flagId);
}

export async function getTests(hypothesisId: string): Promise<TestScenario[]> {
  return mockTests.filter(t => t.hypothesisId === hypothesisId);
}

export async function getTestsForFlag(flagId: string): Promise<TestScenario[]> {
  return mockTests.filter(t => t.flagId === flagId);
}

export async function getTradePlan(flagId: string): Promise<TradePlan | null> {
  return mockTradePlans.find(p => p.flagId === flagId) || null;
}

// ---------------------------------------------------------------------------
// Provider-backed functions — live data from configured providers
// ---------------------------------------------------------------------------

/**
 * Fetch a real-time quote for a single symbol via the market data provider.
 */
export async function getMarketQuote(symbol: string): Promise<MarketDataPoint> {
  const provider = getMarketDataProvider();
  return provider.getQuote(symbol);
}

/**
 * Look up the affected assets for a flag and fetch recent news for each.
 * Returns a flat array of articles across all affected symbols.
 */
export async function getNewsForFlag(flagId: string): Promise<NewsArticle[]> {
  const flag = mockFlagDetails.find(f => f.id === flagId) ?? mockFlags.find(f => f.id === flagId);
  if (!flag) return [];

  const symbols = flag.affectedAssets.map(a => a.symbol);
  const newsProvider = getNewsProvider();

  const results = await Promise.all(
    symbols.map(symbol => newsProvider.getNewsBySymbol(symbol)),
  );

  // Flatten and deduplicate by article id
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

/**
 * Look up the affected assets for a flag and fetch sentiment for each.
 */
export async function getSentimentForFlag(flagId: string): Promise<SentimentData[]> {
  const flag = mockFlagDetails.find(f => f.id === flagId) ?? mockFlags.find(f => f.id === flagId);
  if (!flag) return [];

  const symbols = flag.affectedAssets.map(a => a.symbol);
  const sentimentProvider = getSentimentProvider();

  return sentimentProvider.getBulkSentiment(symbols);
}

/**
 * Fetch upcoming economic events within the given number of days.
 * Defaults to 14 days if not specified.
 */
export async function getUpcomingEvents(days?: number): Promise<EconomicEvent[]> {
  const calendarProv = getCalendarProvider();
  return calendarProv.getUpcomingEvents(days);
}
