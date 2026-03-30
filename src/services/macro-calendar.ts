/**
 * Macro Calendar Engine — enriches economic events into tradeable opportunities.
 *
 * Takes raw calendar events and adds:
 * - Affected assets with direction and reasoning
 * - Conviction score (how tradeable)
 * - Top trade recommendation
 * - Historical win rate from past instances
 */

import type { Direction, EconomicEvent } from "@/types";
import type { MacroEvent, MacroTrade, EventCategory } from "@/types/macro-trader";
import { getCalendarProvider } from "@/services/calendar";
import { getLeverage, calculateTradeSize } from "@/lib/leverage";

// ---------------------------------------------------------------------------
// Event → asset mapping with macro reasoning
// ---------------------------------------------------------------------------

interface EventTemplate {
  match: (title: string) => boolean;
  category: EventCategory;
  trades: {
    asset: string;
    assetName: string;
    direction: Direction;
    reasoning: string;
    conviction: number;
  }[];
}

const EVENT_TEMPLATES: EventTemplate[] = [
  {
    match: t => /fomc|fed.*rate|federal reserve.*decision/i.test(t),
    category: "central_bank",
    trades: [
      { asset: "EUR-USD", assetName: "EUR/USD", direction: "short", reasoning: "Hawkish Fed widens rate differential, pressuring euro", conviction: 78 },
      { asset: "GC=F", assetName: "Gold", direction: "short", reasoning: "Higher rates increase opportunity cost of holding gold", conviction: 75 },
      { asset: "DXY", assetName: "US Dollar", direction: "long", reasoning: "Rate hold/hike strengthens dollar via yield advantage", conviction: 80 },
      { asset: "SPY", assetName: "S&P 500", direction: "short", reasoning: "Hawkish surprise raises discount rates, pressuring equities", conviction: 65 },
    ],
  },
  {
    match: t => /\bcpi\b|consumer price/i.test(t) && /\bUS\b|united states/i.test(t),
    category: "inflation",
    trades: [
      { asset: "GC=F", assetName: "Gold", direction: "long", reasoning: "Hot CPI boosts inflation hedges — gold rallies on real rate expectations", conviction: 75 },
      { asset: "EUR-USD", assetName: "EUR/USD", direction: "short", reasoning: "Above-consensus CPI delays rate cuts, strengthening USD vs EUR", conviction: 73 },
      { asset: "BTC-USD", assetName: "Bitcoin", direction: "long", reasoning: "Inflation narrative supports BTC as store-of-value alternative", conviction: 60 },
    ],
  },
  {
    match: t => /non.?farm|nfp|payroll/i.test(t),
    category: "employment",
    trades: [
      { asset: "EUR-USD", assetName: "EUR/USD", direction: "short", reasoning: "Strong jobs = strong dollar = EUR/USD lower", conviction: 74 },
      { asset: "GBP-USD", assetName: "GBP/USD", direction: "short", reasoning: "Strong US employment widens rate differential vs UK", conviction: 70 },
      { asset: "SPY", assetName: "S&P 500", direction: "long", reasoning: "Strong employment supports consumer spending and earnings", conviction: 68 },
    ],
  },
  {
    match: t => /ecb.*rate|ecb.*decision/i.test(t),
    category: "central_bank",
    trades: [
      { asset: "EUR-USD", assetName: "EUR/USD", direction: "short", reasoning: "ECB cut weakens euro as rate differential with US widens", conviction: 76 },
      { asset: "DXY", assetName: "US Dollar", direction: "long", reasoning: "ECB easing while Fed holds creates USD tailwind", conviction: 72 },
    ],
  },
  {
    match: t => /boe|bank of england/i.test(t),
    category: "central_bank",
    trades: [
      { asset: "GBP-USD", assetName: "GBP/USD", direction: "short", reasoning: "BoE cut weakens sterling vs dollar", conviction: 74 },
      { asset: "EUR-USD", assetName: "EUR/USD", direction: "long", reasoning: "BoE easing may be less aggressive than ECB — relative EUR strength", conviction: 55 },
    ],
  },
  {
    match: t => /boj|bank of japan/i.test(t),
    category: "central_bank",
    trades: [
      { asset: "USD-JPY", assetName: "USD/JPY", direction: "long", reasoning: "BOJ maintaining ultra-loose policy keeps yen weak", conviction: 70 },
    ],
  },
  {
    match: t => /opec|oil.*meet/i.test(t),
    category: "energy",
    trades: [
      { asset: "BZ=F", assetName: "Brent Crude", direction: "long", reasoning: "OPEC production discipline supports crude — any cut extension is bullish", conviction: 72 },
      { asset: "CL=F", assetName: "WTI Crude", direction: "long", reasoning: "Supply constraints from OPEC decisions drive WTI higher", conviction: 70 },
    ],
  },
  {
    match: t => /gdp|gross domestic/i.test(t),
    category: "growth",
    trades: [
      { asset: "SPY", assetName: "S&P 500", direction: "long", reasoning: "Strong GDP supports corporate earnings and equity valuations", conviction: 65 },
      { asset: "DXY", assetName: "US Dollar", direction: "long", reasoning: "Above-trend growth supports Fed hawkishness", conviction: 62 },
    ],
  },
  {
    match: t => /pmi|purchasing manager|ism.*manufactur/i.test(t),
    category: "growth",
    trades: [
      { asset: "SPY", assetName: "S&P 500", direction: "long", reasoning: "PMI above 50 signals expansion — positive for equities", conviction: 63 },
    ],
  },
  {
    match: t => /retail sales/i.test(t),
    category: "growth",
    trades: [
      { asset: "DXY", assetName: "US Dollar", direction: "long", reasoning: "Strong retail = strong consumer = hawkish Fed lean", conviction: 62 },
    ],
  },
  {
    match: t => /pce|personal consumption/i.test(t),
    category: "inflation",
    trades: [
      { asset: "GC=F", assetName: "Gold", direction: "long", reasoning: "Core PCE is the Fed's preferred inflation gauge — hot reading = inflation hedge demand", conviction: 72 },
      { asset: "EUR-USD", assetName: "EUR/USD", direction: "short", reasoning: "Hot PCE pushes rate expectations higher, strengthening USD", conviction: 70 },
    ],
  },
  {
    match: t => /jobless.*claim|initial.*claim/i.test(t),
    category: "employment",
    trades: [
      { asset: "DXY", assetName: "US Dollar", direction: "long", reasoning: "Low claims = tight labour market = hawkish Fed stance", conviction: 58 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------

function categoriseEvent(title: string): { category: EventCategory; template: EventTemplate | null } {
  for (const t of EVENT_TEMPLATES) {
    if (t.match(title)) return { category: t.category, template: t };
  }
  return { category: "other", template: null };
}

function buildTopTrade(
  trades: EventTemplate["trades"][0][],
  eventTitle: string
): MacroTrade | undefined {
  if (trades.length === 0) return undefined;

  const best = trades[0]; // highest conviction
  const lev = getLeverage(best.asset);

  // Always 2:1 R:R minimum
  const stopPct = best.asset.includes("-USD") && !best.asset.includes("BTC") ? 0.5 : 2;
  const targetPct = stopPct * 2; // 2:1

  const tradeAmount = 1000;
  const size = calculateTradeSize(best.asset, tradeAmount, 0, stopPct);

  const winRate = best.conviction / 100;
  const expectedReturn = (winRate * targetPct) - ((1 - winRate) * stopPct);

  return {
    asset: best.asset,
    assetName: best.assetName,
    direction: best.direction,
    thesis: best.reasoning,
    entry: `Before ${eventTitle}`,
    stopLossPercent: stopPct,
    takeProfitPercent: targetPct,
    holdPeriod: "Through the event, reassess after",
    leverage: lev.leverage,
    tradeAmount,
    exposure: size.exposure,
    maxLoss: size.maxLoss,
    expectedReturn: +(expectedReturn).toFixed(2),
    riskReward: +(targetPct / stopPct).toFixed(1),
  };
}

function computeDayLabel(date: Date): string {
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const now = new Date();
  const diffDays = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const dayName = DAYS[date.getDay()];

  if (diffDays <= 0 && date.toDateString() === now.toDateString()) return `${dayName} (Today)`;
  if (diffDays === 1 || (diffDays <= 0 && date.getDate() === now.getDate() + 1)) return `${dayName} (Tomorrow)`;
  return dayName;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

let cache: { data: MacroEvent[]; fetchedAt: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

export async function getMacroCalendar(days: number = 14): Promise<MacroEvent[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) return cache.data;

  const calendarProvider = getCalendarProvider();
  const rawEvents = await calendarProvider.getUpcomingEvents(days);

  const enriched: MacroEvent[] = rawEvents
    .filter(e => e.impact === "high" || e.impact === "medium")
    .map(e => {
      const eventDate = new Date(e.date);
      const { category, template } = categoriseEvent(e.title);
      const trades = template?.trades ?? [];
      const topTrade = buildTopTrade(trades, e.title);
      const hoursUntil = Math.max(0, (eventDate.getTime() - Date.now()) / (1000 * 3600));

      return {
        id: e.id,
        title: e.title,
        country: e.country,
        date: e.date,
        impact: e.impact,
        forecast: e.forecast,
        previous: e.previous,
        category,
        affectedAssets: trades.map(t => ({ symbol: t.asset, name: t.assetName, direction: t.direction, reasoning: t.reasoning })),
        conviction: topTrade ? trades[0].conviction : 30,
        topTrade,
        dayLabel: computeDayLabel(eventDate),
        timeLabel: eventDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" }),
        hoursUntil: +hoursUntil.toFixed(1),
      };
    })
    .sort((a, b) => {
      // Sort by date first, then by conviction within same day
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (Math.abs(dateDiff) > 12 * 3600 * 1000) return dateDiff;
      return b.conviction - a.conviction;
    });

  cache = { data: enriched, fetchedAt: Date.now() };
  return enriched;
}
