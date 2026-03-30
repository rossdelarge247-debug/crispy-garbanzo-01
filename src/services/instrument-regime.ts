/**
 * Instrument Regime — composes existing services into a rich per-instrument regime.
 *
 * Wraps: regime.ts + signal-profile.ts + calendar.ts + session-detector.ts
 */

import type { InstrumentRegime, TrendState, VolatilityState, EventRisk } from "@/types/mission-control";
import type { MarketDataPoint, EconomicEvent } from "@/types";
import { detectRegime, type RegimeState } from "@/services/intelligence/regime";
import { computeCurrentProfile, type SignalProfile } from "@/services/signal-profile";
import { getCurrentSession } from "@/services/session-detector";

// Event → instrument relevance mapping
const EVENT_INSTRUMENT_MAP: Record<string, string[]> = {
  "fomc": ["DXY", "EUR-USD", "GBP-USD", "USD-JPY", "GC=F", "SPY", "BTC-USD"],
  "fed": ["DXY", "EUR-USD", "GBP-USD", "USD-JPY", "GC=F", "SPY"],
  "nfp": ["DXY", "EUR-USD", "GBP-USD", "SPY"],
  "payroll": ["DXY", "EUR-USD", "GBP-USD", "SPY"],
  "cpi": ["DXY", "GC=F", "EUR-USD", "BTC-USD", "SPY"],
  "ecb": ["EUR-USD", "DXY", "GBP-USD"],
  "boe": ["GBP-USD", "EUR-USD"],
  "boj": ["USD-JPY"],
  "opec": ["BZ=F", "CL=F"],
  "oil": ["BZ=F", "CL=F"],
  "pmi": ["DXY", "SPY", "EUR-USD"],
  "gdp": ["DXY", "GBP-USD", "EUR-USD", "SPY"],
  "retail": ["SPY", "DXY"],
  "jobless": ["DXY", "SPY"],
  "pce": ["DXY", "GC=F", "SPY", "BTC-USD"],
};

function mapTrend(regime: RegimeState, profile: SignalProfile | null): { trend: TrendState; label: string } {
  if (regime.regime === "trending_up") {
    const strong = profile && profile.trendAlignment >= 0.9 && profile.return7d > 3;
    return { trend: strong ? "strong_up" : "up", label: strong ? "Strong uptrend" : "Uptrend" };
  }
  if (regime.regime === "trending_down") {
    const strong = profile && profile.trendAlignment >= 0.9 && profile.return7d < -3;
    return { trend: strong ? "strong_down" : "down", label: strong ? "Strong downtrend" : "Downtrend" };
  }
  return { trend: "flat", label: "Sideways" };
}

function mapVolatility(regime: RegimeState): { vol: VolatilityState; label: string } {
  const vr = regime.volatilityRatio;
  if (vr > 2.5) return { vol: "extreme", label: "Extreme volatility" };
  if (vr > 1.5) return { vol: "elevated", label: "Elevated volatility" };
  if (vr < 0.6) return { vol: "compressed", label: "Compressed — breakout watch" };
  return { vol: "normal", label: "Normal volatility" };
}

function getEventRisk(events: { title: string; date: string }[]): EventRisk {
  if (events.length === 0) return "none";
  const now = Date.now();
  const hoursToNearest = events
    .map(e => (new Date(e.date).getTime() - now) / (1000 * 3600))
    .filter(h => h > 0)
    .sort((a, b) => a - b)[0];

  if (hoursToNearest == null) return "none";
  if (hoursToNearest < 4) return "high";
  if (hoursToNearest < 24) return "medium";
  return "low";
}

function getFavouredStyles(trend: TrendState, vol: VolatilityState): { favoured: string[]; avoid: string[] } {
  const favoured: string[] = [];
  const avoid: string[] = [];

  if (trend === "strong_up" || trend === "strong_down") {
    favoured.push("Trend continuation", "Pullback entry");
    avoid.push("Mean reversion");
  } else if (trend === "up" || trend === "down") {
    favoured.push("Trend continuation");
  } else {
    favoured.push("Range trading");
    avoid.push("Trend following");
  }

  if (vol === "compressed") {
    favoured.push("Breakout");
  } else if (vol === "extreme") {
    avoid.push("New entries");
    favoured.push("Mean reversion (cautious)");
  }

  return { favoured, avoid };
}

function filterEventsForInstrument(events: EconomicEvent[], symbol: string): { title: string; date: string; impact: string }[] {
  return events.filter(e => {
    const titleLower = e.title.toLowerCase();
    for (const [keyword, instruments] of Object.entries(EVENT_INSTRUMENT_MAP)) {
      if (titleLower.includes(keyword) && instruments.includes(symbol)) return true;
    }
    return false;
  }).map(e => ({ title: e.title, date: e.date, impact: e.impact }));
}

export function computeInstrumentRegime(
  symbol: string,
  assetClass: string,
  historical: MarketDataPoint[],
  allEvents: EconomicEvent[]
): InstrumentRegime {
  const prices = historical.map(d => d.price);
  const volumes = historical.map(d => d.volume ?? 0);
  const dates = historical.map(d => d.timestamp.split("T")[0]);

  const raw = detectRegime(prices, 60);
  const profile = prices.length >= 30 ? computeCurrentProfile(prices, volumes, dates) : null;
  const { state: session, label: sessionLabel } = getCurrentSession(assetClass);
  const relevantEvents = filterEventsForInstrument(allEvents, symbol);
  const eventRisk = getEventRisk(relevantEvents);
  const { trend, label: trendLabel } = mapTrend(raw, profile);
  const { vol: volatility, label: volatilityLabel } = mapVolatility(raw);
  const { favoured, avoid } = getFavouredStyles(trend, volatility);

  // Build summary
  const parts = [trendLabel];
  if (volatility !== "normal") parts.push(volatilityLabel.toLowerCase());
  if (eventRisk === "high") parts.push("event risk imminent");
  else if (eventRisk === "medium") parts.push("event risk within 24h");
  const regimeSummary = parts.join(", ");

  return {
    symbol,
    trend, trendLabel,
    volatility, volatilityLabel,
    eventRisk,
    session, sessionLabel,
    regimeSummary,
    favouredStyles: favoured,
    avoidStyles: avoid,
    upcomingEvents: relevantEvents,
    signalProfile: profile,
    raw,
    updatedAt: new Date().toISOString(),
  };
}
