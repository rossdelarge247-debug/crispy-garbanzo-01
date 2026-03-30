/**
 * Instrument Engine — the orchestrator for Mission Control.
 *
 * Takes a list of watched instruments and produces:
 * - Per-instrument regime, setups, and price data
 * - AI-generated market brief
 * - Calendar highlights
 *
 * Reuses: market-data, calendar, regime, signal-profile, setup-detector,
 *         opportunity-scanner (for AI brief)
 */

import type { MissionControlData, InstrumentSummary, WatchedInstrument } from "@/types/mission-control";
import { getMarketDataProvider } from "@/services/market-data";
import { getCalendarProvider } from "@/services/calendar";
import { getNewsProvider } from "@/services/news";
import { computeInstrumentRegime } from "@/services/instrument-regime";
import { detectSetups } from "@/services/setup-detector";
import { scanForOpportunities } from "@/services/opportunity-scanner";
import { fetchRSSNews } from "@/services/rss-news";
import { getAssetDisplayName } from "@/lib/asset-names";

// ---------------------------------------------------------------------------
// Cache (10 min TTL, per serverless instance)
// ---------------------------------------------------------------------------

let cache: { data: MissionControlData; fetchedAt: number; key: string } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

// ---------------------------------------------------------------------------
// Build one instrument's summary
// ---------------------------------------------------------------------------

async function buildInstrumentSummary(
  instrument: WatchedInstrument,
  allEvents: import("@/types").EconomicEvent[]
): Promise<InstrumentSummary | null> {
  try {
    const provider = getMarketDataProvider();
    const [historical, quote] = await Promise.all([
      provider.getHistorical(instrument.symbol, 100),
      provider.getQuote(instrument.symbol),
    ]);

    if (historical.length < 10) return null;

    const regime = computeInstrumentRegime(
      instrument.symbol,
      instrument.assetClass,
      historical,
      allEvents
    );

    const setups = detectSetups(instrument.symbol, regime, regime.signalProfile);

    // Today focus: top setup or regime summary
    const topSetup = setups[0];
    const todayFocus = topSetup
      ? topSetup.label
      : regime.regimeSummary;

    const prices = historical.map(d => d.price);

    return {
      symbol: instrument.symbol,
      name: instrument.name,
      assetClass: instrument.assetClass,
      regime,
      setups,
      todayFocus,
      currentPrice: quote.price,
      change24h: quote.change,
      changePercent24h: quote.changePercent,
      priceHistory7d: prices.slice(-7),
    };
  } catch (err) {
    console.warn(`[instrument-engine] Failed for ${instrument.symbol}:`, (err as Error)?.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function getMissionControlData(
  instruments: WatchedInstrument[]
): Promise<MissionControlData> {
  const cacheKey = instruments.map(i => i.symbol).sort().join(",");
  if (cache && cache.key === cacheKey && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return cache.data;
  }

  // Fetch calendar + news for AI brief in parallel with instrument data
  const calendarProvider = getCalendarProvider();
  const newsProvider = getNewsProvider();

  const [allEvents, newsArticles] = await Promise.all([
    calendarProvider.getUpcomingEvents(7).catch(() => []),
    // Multiple news sources for resilience: GDELT + RSS feeds
    Promise.all([
      newsProvider.getNews("markets economy trade", 10),
      newsProvider.getNews("oil crude energy", 5),
      newsProvider.getNews("bitcoin crypto", 5),
      newsProvider.getNews("dollar rate forex", 5),
      fetchRSSNews(15).catch(() => []),
    ]).then(batches => {
      const seen = new Set<string>();
      return batches.flat().filter(a => {
        const key = a.title?.toLowerCase().slice(0, 40) ?? a.id;
        if (seen.has(key)) return false; seen.add(key); return true;
      });
    }).catch(() => []),
  ]);

  // Build instrument summaries in parallel
  const summaries = await Promise.all(
    instruments.map(inst => buildInstrumentSummary(inst, allEvents))
  );
  const validSummaries = summaries.filter(Boolean) as InstrumentSummary[];

  // AI brief from opportunity scanner (reused)
  let aiBrief = { headline: "", detail: "" };
  try {
    const scan = await scanForOpportunities(allEvents, newsArticles);
    aiBrief = {
      headline: scan.marketSummary || `${validSummaries.length} instruments analysed`,
      detail: scan.opportunities.length > 0
        ? `${scan.opportunities.length} setups identified across your watchlist.`
        : "No high-conviction setups right now.",
    };
  } catch {
    aiBrief = {
      headline: `${validSummaries.length} instruments analysed`,
      detail: "Market brief unavailable.",
    };
  }

  // Calendar highlights
  const calendarHighlights = allEvents
    .filter(e => e.impact === "high" || e.impact === "medium")
    .slice(0, 6)
    .map(e => ({ title: e.title, date: e.date, impact: e.impact, country: e.country }));

  const data: MissionControlData = {
    instruments: validSummaries,
    aiBrief,
    calendarHighlights,
    dataSource: validSummaries.length > 0 ? "live" : "demo",
    updatedAt: new Date().toISOString(),
  };

  cache = { data, fetchedAt: Date.now(), key: cacheKey };
  return data;
}
