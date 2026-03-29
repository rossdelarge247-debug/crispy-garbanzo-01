/**
 * Yahoo Finance Price Provider — free, no API key required.
 *
 * Uses the Yahoo Finance v8 chart API which is publicly accessible.
 * Falls back gracefully if Yahoo blocks the request.
 *
 * Used as a secondary source when Polygon is unavailable or rate-limited.
 */

import type { MarketDataPoint } from "@/types";

const YAHOO_SYMBOLS: Record<string, string> = {
  "BTC-USD": "BTC-USD",
  "ETH-USD": "ETH-USD",
  "SOL-USD": "SOL-USD",
  "EUR-USD": "EURUSD=X",
  "GBP-USD": "GBPUSD=X",
  "USD-JPY": "JPY=X",
  "BZ=F": "BZ=F",
  "CL=F": "CL=F",
  "GC=F": "GC=F",
  "SI=F": "SI=F",
  "NG=F": "NG=F",
  "SPY": "SPY",
  "QQQ": "QQQ",
  "NVDA": "NVDA",
  "AAPL": "AAPL",
  "MSFT": "MSFT",
  "TSLA": "TSLA",
  "DXY": "DX-Y.NYB",
};

export async function fetchYahooQuote(symbol: string): Promise<MarketDataPoint | null> {
  const yahooSymbol = YAHOO_SYMBOLS[symbol] ?? symbol;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=1d`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 30 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta.regularMarketPrice ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prevClose;
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

    return {
      symbol,
      price: +price.toFixed(price >= 100 ? 2 : 4),
      change: +change.toFixed(4),
      changePercent: +changePct.toFixed(2),
      volume: meta.regularMarketVolume ?? 0,
      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function fetchYahooHistorical(symbol: string, days: number): Promise<MarketDataPoint[]> {
  const yahooSymbol = YAHOO_SYMBOLS[symbol] ?? symbol;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${days > 365 ? "2y" : days > 180 ? "1y" : days > 30 ? "6mo" : "1mo"}&interval=1d`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp ?? [];
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    const volumes = result.indicators?.quote?.[0]?.volume ?? [];

    const points: MarketDataPoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      if (close == null) continue;

      points.push({
        symbol,
        price: +close.toFixed(close >= 100 ? 2 : 4),
        change: 0,
        changePercent: 0,
        volume: volumes[i] ?? 0,
        timestamp: new Date(timestamps[i] * 1000).toISOString(),
      });
    }

    return points;
  } catch {
    return [];
  }
}
