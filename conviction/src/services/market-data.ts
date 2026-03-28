import type { MarketDataPoint } from "@/types";

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<MarketDataPoint>;
  getHistorical(symbol: string, days: number): Promise<MarketDataPoint[]>;
}

class MockMarketDataProvider implements MarketDataProvider {
  async getQuote(symbol: string): Promise<MarketDataPoint> {
    // Return realistic mock quote data based on symbol
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
    // Generate simple mock historical data
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

class PolygonMarketDataProvider implements MarketDataProvider {
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }

  async getQuote(symbol: string): Promise<MarketDataPoint> {
    // TODO: Implement Polygon.io REST API call
    // GET https://api.polygon.io/v2/aggs/ticker/{symbol}/prev?apiKey={key}
    throw new Error("Polygon provider not yet implemented. Set up at https://polygon.io");
  }

  async getHistorical(symbol: string, days: number): Promise<MarketDataPoint[]> {
    // TODO: Implement Polygon.io historical bars
    // GET https://api.polygon.io/v2/aggs/ticker/{symbol}/range/1/day/{from}/{to}?apiKey={key}
    throw new Error("Polygon provider not yet implemented. Set up at https://polygon.io");
  }
}

export function getMarketDataProvider(): MarketDataProvider {
  const apiKey = process.env.POLYGON_API_KEY;
  if (apiKey) return new PolygonMarketDataProvider(apiKey);
  return new MockMarketDataProvider();
}
