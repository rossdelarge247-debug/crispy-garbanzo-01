/**
 * Flag Engine — Central orchestrator
 *
 * The engine generates trade ideas, automatically backtests each one,
 * and only surfaces ideas that pass a strict quality bar.
 *
 * Flow:
 *   1. Fetch news → cluster into themes → generate flags + hypotheses
 *   2. For each flag: fetch historical prices → run backtest → synthesize recommendation
 *   3. Apply quality bar: only ideas with >60% win rate, >5 scenarios, PF >1.3 survive
 *   4. Cache the result. Dashboard reads from cache.
 *
 * Most days, zero ideas pass. That's the point.
 */

import type {
  MarketFlagDetail,
  Hypothesis,
  ValidatedIdea,
  TestScenario,
  TradePlan,
  MarketDataPoint,
  NewsArticle,
  SentimentData,
  EconomicEvent,
} from "@/types";

import { mockFlagDetails } from "@/data/mock-flags";
import { mockHypotheses } from "@/data/mock-hypotheses";
import { mockTests } from "@/data/mock-tests";
import { mockTradePlans } from "@/data/mock-trade-plans";

import { getMarketDataProvider } from "@/services/market-data";
import { getNewsProvider } from "@/services/news";
import { getSentimentProvider } from "@/services/sentiment";
import { getCalendarProvider } from "@/services/calendar";
import { generateLiveFlags } from "@/services/live-flag-generator";
import { runBacktest, type BacktestResult } from "@/services/backtest";
import { getDefaultStopLoss, getDefaultTakeProfit } from "@/services/dry-run";

export { getExecutionProvider } from "@/services/execution";

// ---------------------------------------------------------------------------
// Quality bar — intentionally strict
// ---------------------------------------------------------------------------

const QUALITY_BAR = {
  minWinRate: 60,
  minScenarios: 5,
  minProfitFactor: 1.3,
};

function meetsQualityBar(result: BacktestResult): boolean {
  return (
    result.summary.winRate >= QUALITY_BAR.minWinRate &&
    result.summary.scenarioCount >= QUALITY_BAR.minScenarios &&
    result.summary.profitFactor >= QUALITY_BAR.minProfitFactor
  );
}

function computeQualityScore(result: BacktestResult): number {
  // Composite: weighted blend of win rate, profit factor, scenario count
  const wr = Math.min(result.summary.winRate / 100, 1);       // 0-1
  const pf = Math.min(result.summary.profitFactor / 3, 1);    // 0-1 (cap at 3)
  const sc = Math.min(result.summary.scenarioCount / 15, 1);  // 0-1 (cap at 15)
  return Math.round((wr * 0.5 + pf * 0.3 + sc * 0.2) * 100);
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

interface CachedData {
  ideas: ValidatedIdea[];
  allFlags: MarketFlagDetail[];
  allHypotheses: Hypothesis[];
  fetchedAt: number;
  source: "live" | "mock";
}

let cache: CachedData | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes (heavier computation = longer cache)

function isCacheValid(): boolean {
  return cache !== null && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

// ---------------------------------------------------------------------------
// Auto-backtest a single flag
// ---------------------------------------------------------------------------

async function backtestFlag(
  flag: MarketFlagDetail,
  hypothesis: Hypothesis
): Promise<{ result: BacktestResult; newsHeadlines: string[] } | null> {
  const primaryAsset = flag.affectedAssets.find(a => a.impact === "primary") ?? flag.affectedAssets[0];
  if (!primaryAsset) return null;

  const symbol = primaryAsset.symbol;
  const direction = hypothesis.direction === "neutral" ? "long" : hypothesis.direction;

  try {
    const provider = getMarketDataProvider();
    const [historical, newsArticles] = await Promise.all([
      provider.getHistorical(symbol, 400), // ~13 months
      getNewsProvider().getNewsBySymbol(symbol, 5).catch(() => []),
    ]);

    const prices = historical.map(d => d.price);
    const volumes = historical.map(d => d.volume ?? 0);
    const dates = historical.map(d => d.timestamp.split("T")[0]);

    if (prices.length < 30) return null;

    const entryPrice = prices[prices.length - 1];
    const stopLoss = getDefaultStopLoss(symbol);
    const takeProfit = getDefaultTakeProfit(symbol);

    const newsSentimentAvg = newsArticles.length > 0
      ? newsArticles.reduce((s, a) => s + a.sentiment, 0) / newsArticles.length
      : 0;

    const result = runBacktest(
      {
        asset: symbol,
        direction,
        entryPrice,
        stopLossPercent: stopLoss,
        takeProfitPercent: takeProfit,
        maxHoldDays: Math.min(flag.timeHorizonDays, 20),
        lookbackMonths: 12,
        tradeAmount: 1000,
        leverage: 1, // conservative for auto-testing
      },
      prices,
      volumes,
      dates,
      {
        articleCount: newsArticles.length,
        avgSentiment: newsSentimentAvg,
        sentimentLabel: newsSentimentAvg > 0.15 ? "bullish" : newsSentimentAvg < -0.15 ? "bearish" : "neutral",
        topHeadline: newsArticles[0]?.title ?? null,
        socialScore: 0,
        socialAgreement: 0,
      }
    );

    const headlines = newsArticles.map(a => a.title).filter(Boolean).slice(0, 4);
    return { result, newsHeadlines: headlines };
  } catch (error) {
    console.warn(`[flag-engine] Backtest failed for ${symbol}:`, error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main data pipeline
// ---------------------------------------------------------------------------

async function ensureData(): Promise<CachedData> {
  if (isCacheValid()) return cache!;

  try {
    const liveResult = await generateLiveFlags();

    if (liveResult.flags.length > 0) {
      console.log(`[flag-engine] Generated ${liveResult.flags.length} flags. Running backtests...`);

      // For each flag, take the top hypothesis and auto-backtest
      const backtestPromises = liveResult.flags.map(async (flag) => {
        const flagHypotheses = liveResult.hypotheses
          .filter(h => h.flagId === flag.id)
          .sort((a, b) => b.confidenceScore - a.confidenceScore);

        const topHyp = flagHypotheses[0];
        if (!topHyp) return null;

        const bt = await backtestFlag(flag, topHyp);
        if (!bt) return null;

        return { flag, hypothesis: topHyp, ...bt };
      });

      const backtestResults = await Promise.all(backtestPromises);

      // Filter by quality bar
      const ideas: ValidatedIdea[] = backtestResults
        .filter((r): r is NonNullable<typeof r> => r !== null && meetsQualityBar(r.result))
        .map(r => ({
          flag: r.flag,
          hypothesis: r.hypothesis,
          backtestSummary: {
            winRate: r.result.summary.winRate,
            scenarioCount: r.result.summary.scenarioCount,
            profitFactor: r.result.summary.profitFactor,
            avgReturn: r.result.summary.avgReturn,
            avgDaysHeld: r.result.summary.avgDaysHeld,
          },
          recommendation: {
            action: r.result.tradeRec.action,
            confidence: r.result.tradeRec.confidence,
            confidenceLabel: r.result.tradeRec.confidenceLabel,
            direction: r.result.tradeRec.direction,
            entryPrice: r.result.tradeRec.entryPrice,
            stopLoss: r.result.tradeRec.stopLoss,
            takeProfit: r.result.tradeRec.takeProfit,
            holdDays: r.result.tradeRec.holdDays,
            suggestedAmount: r.result.tradeRec.suggestedAmount,
            suggestedLeverage: r.result.tradeRec.suggestedLeverage,
            reasons: r.result.tradeRec.reasons,
            risks: r.result.tradeRec.risks,
            summary: r.result.tradeRec.summary,
          },
          qualityScore: computeQualityScore(r.result),
          newsHeadlines: r.newsHeadlines,
          dataSource: "live" as const,
        }))
        .sort((a, b) => b.qualityScore - a.qualityScore);

      const passed = ideas.length;
      const total = liveResult.flags.length;
      console.log(`[flag-engine] ${passed}/${total} flags passed quality bar (win rate ≥${QUALITY_BAR.minWinRate}%, scenarios ≥${QUALITY_BAR.minScenarios}, PF ≥${QUALITY_BAR.minProfitFactor})`);

      cache = {
        ideas,
        allFlags: liveResult.flags,
        allHypotheses: liveResult.hypotheses,
        fetchedAt: Date.now(),
        source: "live",
      };
      return cache;
    }
  } catch (error) {
    console.warn("[flag-engine] Live pipeline failed:", error);
  }

  // Fallback to mock (no validated ideas — mock data shouldn't pretend to be real)
  cache = {
    ideas: [],
    allFlags: mockFlagDetails,
    allHypotheses: mockHypotheses,
    fetchedAt: Date.now(),
    source: "mock",
  };
  console.log("[flag-engine] Using mock data (no validated ideas)");
  return cache;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Get validated ideas that passed the quality bar. Usually 0-2. */
export async function getValidatedIdeas(): Promise<ValidatedIdea[]> {
  const data = await ensureData();
  return data.ideas;
}

/** Get a single validated idea by flag ID. */
export async function getValidatedIdeaById(flagId: string): Promise<ValidatedIdea | null> {
  const data = await ensureData();
  return data.ideas.find(i => i.flag.id === flagId) ?? null;
}

/** Get all flags (validated or not) for backward compat. */
export async function getFlags(): Promise<MarketFlagDetail[]> {
  const data = await ensureData();
  return data.allFlags;
}

export async function getFlagById(id: string): Promise<MarketFlagDetail | null> {
  const data = await ensureData();
  return data.allFlags.find(f => f.id === id) || null;
}

export async function getHypotheses(flagId: string): Promise<Hypothesis[]> {
  const data = await ensureData();
  return data.allHypotheses.filter(h => h.flagId === flagId);
}

export async function getTestsForFlag(flagId: string): Promise<TestScenario[]> {
  const data = await ensureData();
  if (data.source === "mock") {
    return mockTests.filter(t => t.flagId === flagId);
  }
  return []; // Live: tests are replaced by backtest scenarios
}

export async function getTests(hypothesisId: string): Promise<TestScenario[]> {
  const data = await ensureData();
  if (data.source === "mock") {
    return mockTests.filter(t => t.hypothesisId === hypothesisId);
  }
  return [];
}

export async function getTradePlan(flagId: string): Promise<TradePlan | null> {
  const data = await ensureData();
  if (data.source === "mock") {
    return mockTradePlans.find(p => p.flagId === flagId) || null;
  }
  return null;
}

export async function getDataSource(): Promise<"live" | "mock"> {
  const data = await ensureData();
  return data.source;
}

// ---------------------------------------------------------------------------
// Provider-backed functions (unchanged)
// ---------------------------------------------------------------------------

export async function getMarketQuote(symbol: string): Promise<MarketDataPoint> {
  return getMarketDataProvider().getQuote(symbol);
}

export async function getNewsForFlag(flagId: string): Promise<NewsArticle[]> {
  const data = await ensureData();
  const flag = data.allFlags.find(f => f.id === flagId);
  if (!flag) return [];
  const newsProvider = getNewsProvider();
  const results = await Promise.all(
    flag.affectedAssets.map(a => newsProvider.getNewsBySymbol(a.symbol))
  );
  const seen = new Set<string>();
  const articles: NewsArticle[] = [];
  for (const batch of results) {
    for (const article of batch) {
      if (!seen.has(article.id)) { seen.add(article.id); articles.push(article); }
    }
  }
  return articles;
}

export async function getSentimentForFlag(flagId: string): Promise<SentimentData[]> {
  const data = await ensureData();
  const flag = data.allFlags.find(f => f.id === flagId);
  if (!flag) return [];
  return getSentimentProvider().getBulkSentiment(flag.affectedAssets.map(a => a.symbol));
}

export async function getUpcomingEvents(days?: number): Promise<EconomicEvent[]> {
  return getCalendarProvider().getUpcomingEvents(days);
}
