import type { MarketDataPoint } from "@/types";

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<MarketDataPoint>;
  getHistorical(symbol: string, days: number): Promise<MarketDataPoint[]>;
}

// ---------------------------------------------------------------------------
// Symbol mapping — Polygon uses different ticker formats
// ---------------------------------------------------------------------------
const polygonSymbolMap: Record<string, string> = {
  "BZ=F": "BZ", // Brent crude (may need futures prefix)
  "CL=F": "CL",
  "BTC-USD": "X:BTCUSD",
  "ETH-USD": "X:ETHUSD",
  "EUR-USD": "C:EURUSD",
  "GBP-USD": "C:GBPUSD",
  "USD-JPY": "C:USDJPY",
  // Equities use their own symbol directly: XOM, COIN, USO, DXY
};

function toPolygonSymbol(symbol: string): string {
  return polygonSymbolMap[symbol] || symbol;
}

// ---------------------------------------------------------------------------
// Mock provider
// ---------------------------------------------------------------------------
class MockMarketDataProvider implements MarketDataProvider {
  async getQuote(symbol: string): Promise<MarketDataPoint> {
    const quotes: Record<string, Partial<MarketDataPoint>> = {
      "BZ=F": { price: 89.40, change: 1.20, changePercent: 1.36, volume: 245000 },
      "BTC-USD": { price: 68200, change: 1450, changePercent: 2.17, volume: 32000000000 },
      "ETH-USD": { price: 3520, change: 85, changePercent: 2.47, volume: 18000000000 },
      "EUR-USD": { price: 1.0685, change: -0.0035, changePercent: -0.33, volume: 0 },
      "DXY": { price: 104.80, change: 0.45, changePercent: 0.43, volume: 0 },
      "XOM": { price: 118.50, change: 2.10, changePercent: 1.80, volume: 15200000 },
    };
    const q = quotes[symbol] || { price: 100, change: 0, changePercent: 0, volume: 0 };
    return { symbol, ...q, timestamp: new Date().toISOString() } as MarketDataPoint;
  }

  async getHistorical(symbol: string, days: number): Promise<MarketDataPoint[]> {
    const quote = await this.getQuote(symbol);
    const data: MarketDataPoint[] = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const variance = (Math.random() - 0.5) * quote.price * 0.02;
      data.push({
        symbol,
        price: +(quote.price + variance * (i / days)).toFixed(2),
        change: 0,
        changePercent: 0,
        volume: Math.floor(quote.volume * (0.8 + Math.random() * 0.4)),
        timestamp: date.toISOString(),
      });
    }
    return data;
  }
}

// ---------------------------------------------------------------------------
// Polygon.io Market Data API
// Docs: https://polygon.io/docs/stocks/get_v2_aggs_ticker__stocksticker__prev
//       https://polygon.io/docs/stocks/get_v2_aggs_ticker__stocksticker__range__multiplier___timespan___from___to
//
// Previous close (quote):
// GET https://api.polygon.io/v2/aggs/ticker/{ticker}/prev?apiKey={key}
// Response: { "results": [{ "c": close, "h": high, "l": low, "o": open, "v": volume, "t": timestamp_ms }] }
//
// Historical bars:
// GET https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/{from}/{to}?apiKey={key}
// Response: { "results": [{ "c": close, "o": open, "h": high, "l": low, "v": volume, "t": timestamp_ms }] }
// ---------------------------------------------------------------------------

interface PolygonBar {
  c: number; // close
  o: number; // open
  h: number; // high
  l: number; // low
  v: number; // volume
  t: number; // timestamp in ms
  vw?: number; // volume-weighted avg price
}

interface PolygonResponse {
  results?: PolygonBar[];
  resultsCount?: number;
  status?: string;
  error?: string;
}

class PolygonMarketDataProvider implements MarketDataProvider {
  private apiKey: string;
  private baseUrl = "https://api.polygon.io/v2/aggs";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getQuote(symbol: string): Promise<MarketDataPoint> {
    const ticker = toPolygonSymbol(symbol);

    try {
      const response = await fetch(
        `${this.baseUrl}/ticker/${ticker}/prev?apiKey=${this.apiKey}`,
        { next: { revalidate: 60 } } // cache 1 minute
      );

      if (!response.ok) {
        console.warn(`Polygon prev-close returned ${response.status} for ${ticker}, falling back to mock`);
        return new MockMarketDataProvider().getQuote(symbol);
      }

      const data: PolygonResponse = await response.json();

      if (!data.results || data.results.length === 0) {
        console.warn(`Polygon returned no results for ${ticker}, falling back to mock`);
        return new MockMarketDataProvider().getQuote(symbol);
      }

      const bar = data.results[0];
      const change = bar.c - bar.o;
      const changePercent = bar.o !== 0 ? (change / bar.o) * 100 : 0;

      return {
        symbol,
        price: bar.c,
        change: +change.toFixed(4),
        changePercent: +changePercent.toFixed(2),
        volume: bar.v,
        timestamp: new Date(bar.t).toISOString(),
      };
    } catch (error) {
      console.warn(`Polygon fetch failed for ${ticker}, falling back to mock:`, error);
      return new MockMarketDataProvider().getQuote(symbol);
    }
  }

  async getHistorical(symbol: string, days: number): Promise<MarketDataPoint[]> {
    const ticker = toPolygonSymbol(symbol);
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];

    try {
      const response = await fetch(
        `${this.baseUrl}/ticker/${ticker}/range/1/day/${fromStr}/${toStr}?apiKey=${this.apiKey}&sort=asc`,
        { next: { revalidate: 300 } } // cache 5 minutes
      );

      if (!response.ok) {
        console.warn(`Polygon historical returned ${response.status} for ${ticker}, falling back to mock`);
        return new MockMarketDataProvider().getHistorical(symbol, days);
      }

      const data: PolygonResponse = await response.json();

      if (!data.results || data.results.length === 0) {
        console.warn(`Polygon returned no historical data for ${ticker}, falling back to mock`);
        return new MockMarketDataProvider().getHistorical(symbol, days);
      }

      return data.results.map((bar) => {
        const change = bar.c - bar.o;
        const changePercent = bar.o !== 0 ? (change / bar.o) * 100 : 0;
        return {
          symbol,
          price: bar.c,
          change: +change.toFixed(4),
          changePercent: +changePercent.toFixed(2),
          volume: bar.v,
          timestamp: new Date(bar.t).toISOString(),
        };
      });
    } catch (error) {
      console.warn(`Polygon historical fetch failed for ${ticker}, falling back to mock:`, error);
      return new MockMarketDataProvider().getHistorical(symbol, days);
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export function getMarketDataProvider(): MarketDataProvider {
  const apiKey = process.env.POLYGON_API_KEY;
  if (apiKey) return new PolygonMarketDataProvider(apiKey);
  return new MockMarketDataProvider();
}
