/**
 * OHLCV API — returns candlestick data (Open, High, Low, Close, Volume).
 * Sources: Yahoo Finance (free, OHLCV native).
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? "BTC-USD";
  const days = parseInt(searchParams.get("days") ?? "90");

  const yahooSymbol = YAHOO_SYMBOLS[symbol] ?? symbol;
  const rangeStr = days > 365 ? "2y" : days > 180 ? "1y" : days > 30 ? "6mo" : "1mo";

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${rangeStr}&interval=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10000), next: { revalidate: 300 } }
    );

    if (!res.ok) return NextResponse.json([], { status: 200 });

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return NextResponse.json([], { status: 200 });

    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};
    const opens: (number | null)[] = quote.open ?? [];
    const highs: (number | null)[] = quote.high ?? [];
    const lows: (number | null)[] = quote.low ?? [];
    const closes: (number | null)[] = quote.close ?? [];
    const volumes: (number | null)[] = quote.volume ?? [];

    const bars = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (opens[i] == null || closes[i] == null) continue;
      const d = new Date(timestamps[i] * 1000);
      bars.push({
        time: d.toISOString().split("T")[0],
        open: +opens[i]!.toFixed(opens[i]! >= 100 ? 2 : 4),
        high: +highs[i]!.toFixed(highs[i]! >= 100 ? 2 : 4),
        low: +lows[i]!.toFixed(lows[i]! >= 100 ? 2 : 4),
        close: +closes[i]!.toFixed(closes[i]! >= 100 ? 2 : 4),
        volume: volumes[i] ?? 0,
      });
    }

    return NextResponse.json(bars, { headers: { "Cache-Control": "public, s-maxage=300" } });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
