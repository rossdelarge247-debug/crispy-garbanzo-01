import type { SentimentData } from "@/types";

export interface SentimentProvider {
  getSentiment(symbol: string): Promise<SentimentData>;
  getBulkSentiment(symbols: string[]): Promise<SentimentData[]>;
}

class MockSentimentProvider implements SentimentProvider {
  private sentiments: Record<string, SentimentData> = {
    "BZ=F": {
      symbol: "BZ=F",
      score: 72,
      label: "bullish",
      sources: 48,
      timestamp: new Date().toISOString(),
    },
    "BTC-USD": {
      symbol: "BTC-USD",
      score: 45,
      label: "bullish",
      sources: 124,
      timestamp: new Date().toISOString(),
    },
    "EUR-USD": {
      symbol: "EUR-USD",
      score: -35,
      label: "bearish",
      sources: 36,
      timestamp: new Date().toISOString(),
    },
    "DXY": {
      symbol: "DXY",
      score: 58,
      label: "bullish",
      sources: 52,
      timestamp: new Date().toISOString(),
    },
    "ETH-USD": {
      symbol: "ETH-USD",
      score: 38,
      label: "bullish",
      sources: 87,
      timestamp: new Date().toISOString(),
    },
    "XOM": {
      symbol: "XOM",
      score: 62,
      label: "bullish",
      sources: 29,
      timestamp: new Date().toISOString(),
    },
  };

  async getSentiment(symbol: string): Promise<SentimentData> {
    return this.sentiments[symbol] || {
      symbol,
      score: 0,
      label: "neutral" as const,
      sources: 0,
      timestamp: new Date().toISOString(),
    };
  }

  async getBulkSentiment(symbols: string[]): Promise<SentimentData[]> {
    return Promise.all(symbols.map(s => this.getSentiment(s)));
  }
}

class AlphaVantageSentimentProvider implements SentimentProvider {
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }

  async getSentiment(symbol: string): Promise<SentimentData> {
    // TODO: Implement Alpha Vantage News Sentiment API
    // GET https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers={symbol}&apikey={key}
    throw new Error("Alpha Vantage sentiment provider not yet implemented. Set up at https://alphavantage.co");
  }

  async getBulkSentiment(symbols: string[]): Promise<SentimentData[]> {
    return Promise.all(symbols.map(s => this.getSentiment(s)));
  }
}

export function getSentimentProvider(): SentimentProvider {
  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (apiKey) return new AlphaVantageSentimentProvider(apiKey);
  return new MockSentimentProvider();
}
