import type { MarketDataPoint } from "@/types";
import { fetchWithCache, FEED_CONFIGS } from "@/services/feed-cache";
import { fetchYahooQuote, fetchYahooHistorical } from "@/services/yahoo-finance";
import { fetchCoinGeckoQuote, fetchCoinGeckoHistory, isCryptoSymbol } from "@/services/coingecko";

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<MarketDataPoint>;
  getHistorical(symbol: string, days: number): Promise<MarketDataPoint[]>;
}

// ---------------------------------------------------------------------------
// Symbol mapping — Polygon/Massive ticker formats
//
// Stocks: plain symbol (AAPL, XOM, NVDA)
// Crypto: X:BTCUSD (prefix X:, no dash)
// Forex:  C:EURUSD (prefix C:, no dash)
// Indices: I:SPX (but DXY isn't available — use UUP as ETF proxy)
//
// Futures (BZ=F, CL=F) are NOT on Polygon free tier.
// We map them to liquid ETF proxies that track the same asset.
// ---------------------------------------------------------------------------

interface SymbolMapping {
  polygonTicker: string;   // what Polygon/Massive actually knows
  label: string;           // what we show the user
  isProxy: boolean;        // true = ETF proxy, not the actual futures contract
}

const symbolMappings: Record<string, SymbolMapping> = {
  // Commodities → ETF proxies (Polygon free tier has stocks, not futures)
  "BZ=F":   { polygonTicker: "BNO",       label: "BNO (Brent Oil ETF)",   isProxy: true },
  "CL=F":   { polygonTicker: "USO",       label: "USO (WTI Oil ETF)",     isProxy: true },
  "USO":    { polygonTicker: "USO",       label: "USO",                    isProxy: false },

  // Crypto → Polygon crypto format
  "BTC-USD": { polygonTicker: "X:BTCUSD", label: "BTC/USD",  isProxy: false },
  "ETH-USD": { polygonTicker: "X:ETHUSD", label: "ETH/USD",  isProxy: false },

  // Forex → Polygon forex format
  "EUR-USD": { polygonTicker: "C:EURUSD", label: "EUR/USD",  isProxy: false },
  "GBP-USD": { polygonTicker: "C:GBPUSD", label: "GBP/USD",  isProxy: false },
  "USD-JPY": { polygonTicker: "C:USDJPY", label: "USD/JPY",  isProxy: false },

  // Indices → ETF proxies
  "DXY":     { polygonTicker: "UUP",      label: "UUP (Dollar ETF)",  isProxy: true },
  "SPY":     { polygonTicker: "SPY",      label: "SPY",               isProxy: false },
  "VIX":     { polygonTicker: "VIXY",     label: "VIXY (VIX ETF)",    isProxy: true },

  // Equities — pass through directly
  "XOM":     { polygonTicker: "XOM",      label: "XOM",   isProxy: false },
  "COIN":    { polygonTicker: "COIN",     label: "COIN",  isProxy: false },
  "NVDA":    { polygonTicker: "NVDA",     label: "NVDA",  isProxy: false },
  "MSFT":    { polygonTicker: "MSFT",     label: "MSFT",  isProxy: false },
  "GOOGL":   { polygonTicker: "GOOGL",    label: "GOOGL", isProxy: false },
  "TLT":     { polygonTicker: "TLT",      label: "TLT",   isProxy: false },
};

function getMapping(symbol: string): SymbolMapping {
  return symbolMappings[symbol] || { polygonTicker: symbol, label: symbol, isProxy: false };
}

// Re-export so pages can show "via BNO" proxy labels
export function getChartLabel(symbol: string): string {
  const m = getMapping(symbol);
  return m.isProxy ? m.label : symbol;
}

export function isProxySymbol(symbol: string): boolean {
  return getMapping(symbol).isProxy;
}

// Reference prices for commodity futures — ETF proxies trade at different levels
const COMMODITY_REF: Record<string, number> = {
  "BZ=F": 73, "CL=F": 69, "GC=F": 3050, "SI=F": 34, "NG=F": 4.10, "DXY": 104, "VIX": 19,
};

/** Scale ETF proxy prices to commodity reference level */
function scaleProxyPrices(symbol: string, data: MarketDataPoint[]): MarketDataPoint[] {
  const ref = COMMODITY_REF[symbol];
  if (!ref || data.length === 0) return data;
  // Scale so the latest price matches the reference level
  const latestEtfPrice = data[data.length - 1].price;
  if (latestEtfPrice === 0) return data;
  const ratio = ref / latestEtfPrice;
  return data.map(d => ({ ...d, price: +(d.price * ratio).toFixed(2) }));
}

// ---------------------------------------------------------------------------
// Mock provider
// ---------------------------------------------------------------------------
class MockMarketDataProvider implements MarketDataProvider {
  async getQuote(symbol: string): Promise<MarketDataPoint> {
    const quotes: Record<string, Partial<MarketDataPoint>> = {
      "BZ=F":    { price: 89.40, change: 1.20, changePercent: 1.36, volume: 245000 },
      "BTC-USD": { price: 68200, change: 1450, changePercent: 2.17, volume: 32000000000 },
      "ETH-USD": { price: 3520, change: 85, changePercent: 2.47, volume: 18000000000 },
      "EUR-USD": { price: 1.0685, change: -0.0035, changePercent: -0.33, volume: 0 },
      "DXY":     { price: 104.80, change: 0.45, changePercent: 0.43, volume: 0 },
      "XOM":     { price: 118.50, change: 2.10, changePercent: 1.80, volume: 15200000 },
      "NVDA":    { price: 875.50, change: 12.30, changePercent: 1.42, volume: 45000000 },
      "SPY":     { price: 520.40, change: -2.10, changePercent: -0.40, volume: 72000000 },
    };
    const q = quotes[symbol] || { price: 100, change: 0, changePercent: 0, volume: 0 };
    return { symbol, ...q, timestamp: new Date().toISOString() } as MarketDataPoint;
  }

  async getHistorical(symbol: string, days: number): Promise<MarketDataPoint[]> {
    const quote = await this.getQuote(symbol);
    const data: MarketDataPoint[] = [];
    // Use a seeded random so the chart looks consistent per symbol
    let seed = 0;
    for (let i = 0; i < symbol.length; i++) seed += symbol.charCodeAt(i);
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      // Deterministic pseudo-random using seed
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const rand = (seed / 0x7fffffff) - 0.5;
      const drift = (days - i) / days * quote.price * 0.05; // slight uptrend
      const noise = rand * quote.price * 0.015;
      data.push({
        symbol,
        price: +(quote.price - drift + noise).toFixed(2),
        change: 0,
        changePercent: 0,
        volume: Math.floor(quote.volume * (0.8 + (seed % 100) / 250)),
        timestamp: date.toISOString(),
      });
    }
    return data;
  }
}

// ---------------------------------------------------------------------------
// Polygon.io / Massive Market Data API
// ---------------------------------------------------------------------------

interface PolygonBar {
  c: number;
  o: number;
  h: number;
  l: number;
  v: number;
  t: number;
  vw?: number;
}

interface PolygonResponse {
  results?: PolygonBar[];
  resultsCount?: number;
  status?: string;
  error?: string;
  message?: string;
}

class PolygonMarketDataProvider implements MarketDataProvider {
  private apiKey: string;
  private baseUrl = "https://api.polygon.io/v2/aggs";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getQuote(symbol: string): Promise<MarketDataPoint> {
    const { polygonTicker } = getMapping(symbol);
    const feedConfig = FEED_CONFIGS.polygon_quote(symbol);

    const result = await fetchWithCache<MarketDataPoint>(feedConfig, async () => {
      const response = await fetch(
        `${this.baseUrl}/ticker/${polygonTicker}/prev?apiKey=${this.apiKey}`,
        { next: { revalidate: 60 } }
      );

      if (!response.ok) {
        throw new Error(`Polygon ${response.status} for ${polygonTicker}`);
      }

      const data: PolygonResponse = await response.json();

      if (!data.results || data.results.length === 0) {
        throw new Error(`Empty results for ${polygonTicker}`);
      }

      const bar = data.results[0];
      const change = bar.c - bar.o;
      const changePercent = bar.o !== 0 ? (change / bar.o) * 100 : 0;

      return {
        symbol,
        price: bar.c,
        change: +change.toFixed(4),
        changePercent: +changePercent.toFixed(2),
        volume: bar.v || 0,
        timestamp: new Date(bar.t).toISOString(),
      };
    });

    if (result) {
      const ref = COMMODITY_REF[symbol];
      if (ref && result.data.price > 0) {
        const pct = result.data.changePercent / 100;
        return { ...result.data, price: +(ref * (1 + pct)).toFixed(2), change: +(ref * pct).toFixed(4) };
      }
      return result.data;
    }
    // Try CoinGecko for crypto, then Yahoo, then mock
    if (isCryptoSymbol(symbol)) {
      const cg = await fetchCoinGeckoQuote(symbol);
      if (cg && cg.price > 0) return cg;
    }
    const yahoo = await fetchYahooQuote(symbol);
    if (yahoo && yahoo.price > 0) return yahoo;
    return new MockMarketDataProvider().getQuote(symbol);
  }

  async getHistorical(symbol: string, days: number): Promise<MarketDataPoint[]> {
    const { polygonTicker } = getMapping(symbol);
    const feedConfig = FEED_CONFIGS.polygon_historical(symbol);

    const result = await fetchWithCache<MarketDataPoint[]>(feedConfig, async () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - days);

      const fromStr = from.toISOString().split("T")[0];
      const toStr = to.toISOString().split("T")[0];

      const response = await fetch(
        `${this.baseUrl}/ticker/${polygonTicker}/range/1/day/${fromStr}/${toStr}?apiKey=${this.apiKey}&sort=asc&limit=5000`,
        { next: { revalidate: 300 } }
      );

      if (!response.ok) {
        throw new Error(`Polygon historical ${response.status} for ${polygonTicker}`);
      }

      const data: PolygonResponse = await response.json();

      if (!data.results || data.results.length === 0) {
        throw new Error(`Empty historical for ${polygonTicker}`);
      }

      console.log(`[market-data] Polygon returned ${data.results.length} bars for ${polygonTicker} (${symbol})`);

      return data.results.map((bar) => {
        const change = bar.c - bar.o;
        const changePercent = bar.o !== 0 ? (change / bar.o) * 100 : 0;
        return {
          symbol,
          price: bar.c,
          change: +change.toFixed(4),
          changePercent: +changePercent.toFixed(2),
          volume: bar.v || 0,
          timestamp: new Date(bar.t).toISOString(),
        };
      });
    }, (data) => data.length >= 5);

    if (result) return scaleProxyPrices(symbol, result.data);
    // Try Yahoo Finance before mock
    const yahoo = await fetchYahooHistorical(symbol, days);
    if (yahoo.length >= 5) return yahoo;
    return new MockMarketDataProvider().getHistorical(symbol, days);
  }
}

// ---------------------------------------------------------------------------
// Yahoo Finance provider — used when no Polygon key
class YahooMarketDataProvider implements MarketDataProvider {
  async getQuote(symbol: string): Promise<MarketDataPoint> {
    // CoinGecko for crypto (free, reliable, no rate issues)
    if (isCryptoSymbol(symbol)) {
      const cg = await fetchCoinGeckoQuote(symbol);
      if (cg && cg.price > 0) return cg;
    }
    const yahoo = await fetchYahooQuote(symbol);
    if (yahoo && yahoo.price > 0) return yahoo;
    return new MockMarketDataProvider().getQuote(symbol);
  }

  async getHistorical(symbol: string, days: number): Promise<MarketDataPoint[]> {
    if (isCryptoSymbol(symbol)) {
      const cg = await fetchCoinGeckoHistory(symbol, days);
      if (cg.length >= 5) return cg;
    }
    const yahoo = await fetchYahooHistorical(symbol, days);
    if (yahoo.length >= 5) return yahoo;
    return new MockMarketDataProvider().getHistorical(symbol, days);
  }
}

// Factory — Polygon (if key) → Yahoo Finance (free) → Mock
export function getMarketDataProvider(): MarketDataProvider {
  const apiKey = process.env.POLYGON_API_KEY;
  if (apiKey) return new PolygonMarketDataProvider(apiKey);
  return new YahooMarketDataProvider();
}
