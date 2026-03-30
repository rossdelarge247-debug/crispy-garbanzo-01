/**
 * OHLCV API — candlestick data from Yahoo Finance + CoinGecko fallback.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const YAHOO_SYMBOLS: Record<string, string> = {
  "BTC-USD": "BTC-USD", "ETH-USD": "ETH-USD", "SOL-USD": "SOL-USD",
  "EUR-USD": "EURUSD=X", "GBP-USD": "GBPUSD=X", "USD-JPY": "JPY=X", "AUD-USD": "AUDUSD=X",
  "BZ=F": "BZ=F", "CL=F": "CL=F", "GC=F": "GC=F", "SI=F": "SI=F", "NG=F": "NG=F",
  "SPY": "SPY", "QQQ": "QQQ", "NVDA": "NVDA", "AAPL": "AAPL", "TSLA": "TSLA", "MSFT": "MSFT",
  "DXY": "DX-Y.NYB",
};

const COINGECKO_IDS: Record<string, string> = {
  "BTC-USD": "bitcoin", "ETH-USD": "ethereum", "SOL-USD": "solana",
  "XRP-USD": "ripple", "DOGE-USD": "dogecoin", "ADA-USD": "cardano",
};

interface Bar { time: string; open: number; high: number; low: number; close: number; volume: number; }

async function fetchYahooOHLCV(symbol: string, days: number): Promise<Bar[]> {
  const yahooSymbol = YAHOO_SYMBOLS[symbol] ?? symbol;
  const rangeStr = days > 365 ? "2y" : days > 180 ? "1y" : days > 90 ? "6mo" : days > 30 ? "3mo" : "1mo";

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${rangeStr}&interval=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000), next: { revalidate: 300 } }
    );
    if (!res.ok) return [];

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];

    const timestamps: number[] = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    const bars: Bar[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (q.open?.[i] == null || q.close?.[i] == null) continue;
      const d = new Date(timestamps[i] * 1000);
      const p = q.close[i] >= 100 ? 2 : 4;
      bars.push({
        time: d.toISOString().split("T")[0],
        open: +q.open[i].toFixed(p), high: +q.high[i].toFixed(p),
        low: +q.low[i].toFixed(p), close: +q.close[i].toFixed(p),
        volume: q.volume?.[i] ?? 0,
      });
    }
    return bars;
  } catch { return []; }
}

async function fetchCoinGeckoOHLCV(symbol: string, days: number): Promise<Bar[]> {
  const id = COINGECKO_IDS[symbol];
  if (!id) return [];

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}/ohlc?vs_currency=usd&days=${days}`,
      { signal: AbortSignal.timeout(8000), next: { revalidate: 300 } }
    );
    if (!res.ok) return [];

    const data: [number, number, number, number, number][] = await res.json();
    if (!Array.isArray(data)) return [];

    // CoinGecko OHLC returns [timestamp, open, high, low, close] — no volume
    // Group by day (data comes in 4h or 1d intervals)
    const byDay: Record<string, Bar> = {};
    for (const [ts, o, h, l, c] of data) {
      const day = new Date(ts).toISOString().split("T")[0];
      if (!byDay[day]) byDay[day] = { time: day, open: o, high: h, low: l, close: c, volume: 0 };
      else {
        byDay[day].high = Math.max(byDay[day].high, h);
        byDay[day].low = Math.min(byDay[day].low, l);
        byDay[day].close = c;
      }
    }
    return Object.values(byDay).sort((a, b) => a.time.localeCompare(b.time));
  } catch { return []; }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? "BTC-USD";
  const days = parseInt(searchParams.get("days") ?? "90");

  // Try Yahoo first, then CoinGecko for crypto
  let bars = await fetchYahooOHLCV(symbol, days);

  if (bars.length < 5 && COINGECKO_IDS[symbol]) {
    bars = await fetchCoinGeckoOHLCV(symbol, days);
  }

  return NextResponse.json(bars, { headers: { "Cache-Control": "public, s-maxage=300" } });
}
