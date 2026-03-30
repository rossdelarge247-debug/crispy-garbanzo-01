/**
 * CoinGecko — free crypto price API. No key required.
 * More reliable than Polygon for crypto prices.
 */

import type { MarketDataPoint } from "@/types";

const COINGECKO_IDS: Record<string, string> = {
  "BTC-USD": "bitcoin",
  "ETH-USD": "ethereum",
  "SOL-USD": "solana",
  "XRP-USD": "ripple",
  "DOGE-USD": "dogecoin",
  "ADA-USD": "cardano",
};

export async function fetchCoinGeckoQuote(symbol: string): Promise<MarketDataPoint | null> {
  const id = COINGECKO_IDS[symbol];
  if (!id) return null;

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`,
      { signal: AbortSignal.timeout(6000), next: { revalidate: 30 } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const coin = data[id];
    if (!coin) return null;

    const price = coin.usd ?? 0;
    const changePct = coin.usd_24h_change ?? 0;
    const change = price * (changePct / 100);

    return {
      symbol,
      price: +price.toFixed(2),
      change: +change.toFixed(2),
      changePercent: +changePct.toFixed(2),
      volume: coin.usd_24h_vol ?? 0,
      timestamp: new Date().toISOString(),
    };
  } catch { return null; }
}

export async function fetchCoinGeckoHistory(symbol: string, days: number): Promise<MarketDataPoint[]> {
  const id = COINGECKO_IDS[symbol];
  if (!id) return [];

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=daily`,
      { signal: AbortSignal.timeout(10000), next: { revalidate: 300 } }
    );
    if (!res.ok) return [];

    const data = await res.json();
    const prices: [number, number][] = data.prices ?? [];
    const volumes: [number, number][] = data.total_volumes ?? [];

    return prices.map(([ts, price], i) => ({
      symbol,
      price: +price.toFixed(2),
      change: 0,
      changePercent: 0,
      volume: volumes[i]?.[1] ?? 0,
      timestamp: new Date(ts).toISOString(),
    }));
  } catch { return []; }
}

export function isCryptoSymbol(symbol: string): boolean {
  return symbol in COINGECKO_IDS;
}
