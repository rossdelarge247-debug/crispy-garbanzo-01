/**
 * Live Quote API — /api/quote/[symbol]
 *
 * Returns the latest price for a given symbol.
 * Uses Polygon.io snapshot endpoint for crypto (24/7 data).
 * Falls back to mock data if the API key is absent or the request fails.
 *
 * Response is cached for 10 seconds via Cache-Control header,
 * so rapid client polling doesn't hammer the upstream API.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Symbol → Polygon ticker mapping
// Crypto: X: prefix, Forex: C: prefix, Futures: mapped to liquid ETF proxies
const POLY_TICKERS: Record<string, string> = {
  // Crypto
  "BTC-USD": "X:BTCUSD",
  "ETH-USD": "X:ETHUSD",
  "SOL-USD": "X:SOLUSD",
  "XRP-USD": "X:XRPUSD",
  "DOGE-USD": "X:DOGEUSD",
  "ADA-USD":  "X:ADAUSD",
  // Forex
  "EUR-USD": "C:EURUSD",
  "GBP-USD": "C:GBPUSD",
  "USD-JPY": "C:USDJPY",
  "AUD-USD": "C:AUDUSD",
  "USD-CAD": "C:USDCAD",
  "USD-CHF": "C:USDCHF",
  // Commodities → ETF proxies (Polygon free tier has stocks, not futures)
  "BZ=F": "BNO",       // Brent crude → United States Brent Oil Fund
  "CL=F": "USO",       // WTI crude → United States Oil Fund
  "GC=F": "GLD",       // Gold → SPDR Gold Trust
  "SI=F": "SLV",       // Silver → iShares Silver Trust
  "NG=F": "UNG",       // Natural Gas → United States Natural Gas Fund
  // Index proxies
  "DXY":  "UUP",       // Dollar Index → Invesco DB US Dollar Index
  "VIX":  "VIXY",      // VIX → ProShares VIX Short-Term Futures
};

const MOCK_PRICES: Record<string, { price: number; change: number; changePercent: number }> = {
  "BTC-USD":  { price: 68200,  change: 1450,   changePercent: 2.17 },
  "ETH-USD":  { price: 3520,   change: 85,     changePercent: 2.47 },
  "SOL-USD":  { price: 165,    change: 4.2,    changePercent: 2.61 },
  "EUR-USD":  { price: 1.0685, change: -0.003, changePercent: -0.28 },
  "GBP-USD":  { price: 1.2712, change: 0.0045, changePercent: 0.35 },
  "SPY":      { price: 520.4,  change: -2.1,   changePercent: -0.40 },
  "QQQ":      { price: 446.2,  change: -1.8,   changePercent: -0.40 },
  "NVDA":     { price: 875.5,  change: 12.3,   changePercent: 1.42 },
  "AAPL":     { price: 189.3,  change: 1.2,    changePercent: 0.64 },
  "TSLA":     { price: 248.5,  change: -4.1,   changePercent: -1.62 },
  "GC=F":     { price: 3050,   change: 18,     changePercent: 0.59 },
  "BZ=F":     { price: 73.20,  change: 0.85,   changePercent: 1.17 },
  "CL=F":     { price: 69.40,  change: 0.72,   changePercent: 1.05 },
  "SI=F":     { price: 34.10,  change: 0.55,   changePercent: 1.64 },
  "NG=F":     { price: 4.10,   change: -0.12,  changePercent: -2.84 },
  "DXY":      { price: 104.20, change: 0.35,   changePercent: 0.34 },
};

// Reference prices for commodity futures (ETF proxies trade at different levels)
// These are approximate current market levels — the % change from the proxy is applied to these
const COMMODITY_REFERENCE_PRICES: Record<string, number> = {
  "BZ=F": 73,      // Brent crude ~$73/barrel
  "CL=F": 69,      // WTI crude ~$69/barrel
  "GC=F": 3050,    // Gold ~$3050/oz
  "SI=F": 34,      // Silver ~$34/oz
  "NG=F": 4.10,    // Natural gas ~$4.10/MMBtu
  "DXY":  104,     // Dollar index ~104
  "VIX":  19,      // VIX ~19
};

interface QuoteResponse {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  source: "live" | "mock";
}

async function fetchPolygonCrypto(polyTicker: string, apiKey: string): Promise<{ price: number; change: number } | null> {
  try {
    const url = `https://api.polygon.io/v2/snapshot/locale/global/markets/crypto/tickers/${polyTicker}?apiKey=${apiKey}`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const ticker = data?.ticker;
    if (!ticker) return null;
    const price: number = ticker.lastTrade?.p ?? ticker.prevDay?.c ?? 0;
    const prevClose: number = ticker.prevDay?.c ?? price;
    return { price, change: price - prevClose };
  } catch {
    return null;
  }
}

async function fetchPolygonForex(polyTicker: string, apiKey: string): Promise<{ price: number; change: number } | null> {
  try {
    const url = `https://api.polygon.io/v1/last_quote/currencies/${polyTicker.replace("C:", "")}?apiKey=${apiKey}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const price: number = data?.last?.ask ?? 0;
    return { price, change: 0 };
  } catch {
    return null;
  }
}

async function fetchPolygonStock(ticker: string, apiKey: string): Promise<{ price: number; change: number } | null> {
  try {
    const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apiKey=${apiKey}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const t = data?.ticker;
    if (!t) return null;
    const price: number = t.day?.c ?? t.prevDay?.c ?? 0;
    const prev: number = t.prevDay?.c ?? price;
    return { price, change: price - prev };
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const apiKey = process.env.POLYGON_API_KEY;

  const mock = MOCK_PRICES[symbol];
  const fallback: QuoteResponse = {
    symbol,
    price: mock?.price ?? 100,
    change: mock?.change ?? 0,
    changePercent: mock?.changePercent ?? 0,
    timestamp: new Date().toISOString(),
    source: "mock",
  };

  if (!apiKey) {
    return NextResponse.json(fallback, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" },
    });
  }

  const polyTicker = POLY_TICKERS[symbol];
  let result: { price: number; change: number } | null = null;

  if (polyTicker?.startsWith("X:")) {
    result = await fetchPolygonCrypto(polyTicker, apiKey);
  } else if (polyTicker?.startsWith("C:")) {
    result = await fetchPolygonForex(polyTicker, apiKey);
  } else {
    // Stock or ETF proxy — use mapped ticker if available, else raw symbol
    result = await fetchPolygonStock(polyTicker ?? symbol, apiKey);
  }

  if (!result || result.price === 0) {
    return NextResponse.json(fallback, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" },
    });
  }

  let price = result.price;
  let change = result.change;

  // For commodity futures using ETF proxies: apply the % change to the
  // reference commodity price instead of showing the ETF's dollar price
  const refPrice = COMMODITY_REFERENCE_PRICES[symbol];
  if (refPrice && result.price > 0) {
    const pctChange = result.change / (result.price - result.change);
    price = refPrice * (1 + pctChange);
    change = refPrice * pctChange;
  }

  const changePercent = price > 0 && change !== 0
    ? +((change / (price - change)) * 100).toFixed(2)
    : 0;

  const response: QuoteResponse = {
    symbol,
    price: +price.toFixed(symbol.includes("USD") && !symbol.includes("-USD") ? 4 : 2),
    change: +change.toFixed(4),
    changePercent,
    timestamp: new Date().toISOString(),
    source: "live",
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" },
  });
}
