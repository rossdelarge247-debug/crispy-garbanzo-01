import type { SentimentData } from "@/types";

export interface SentimentProvider {
  getSentiment(symbol: string): Promise<SentimentData>;
  getBulkSentiment(symbols: string[]): Promise<SentimentData[]>;
}

// ---------------------------------------------------------------------------
// Symbol → Alpha Vantage ticker mapping
// Alpha Vantage uses standard tickers for equities, CRYPTO:BTC for crypto
// ---------------------------------------------------------------------------
const avTickerMap: Record<string, string> = {
  "BZ=F": "BRENT",
  "CL=F": "WTI",
  "BTC-USD": "CRYPTO:BTC",
  "ETH-USD": "CRYPTO:ETH",
  "EUR-USD": "FOREX:EUR",
  "GBP-USD": "FOREX:GBP",
  "USD-JPY": "FOREX:JPY",
  // Equities: XOM, COIN, USO, DXY pass through
};

function toAvTicker(symbol: string): string {
  return avTickerMap[symbol] || symbol;
}

// ---------------------------------------------------------------------------
// Mock provider
// ---------------------------------------------------------------------------
class MockSentimentProvider implements SentimentProvider {
  private sentiments: Record<string, SentimentData> = {
    "BZ=F": { symbol: "BZ=F", score: 72, label: "bullish", sources: 48, timestamp: new Date().toISOString() },
    "BTC-USD": { symbol: "BTC-USD", score: 45, label: "bullish", sources: 124, timestamp: new Date().toISOString() },
    "EUR-USD": { symbol: "EUR-USD", score: -35, label: "bearish", sources: 36, timestamp: new Date().toISOString() },
    "DXY": { symbol: "DXY", score: 58, label: "bullish", sources: 52, timestamp: new Date().toISOString() },
    "ETH-USD": { symbol: "ETH-USD", score: 38, label: "bullish", sources: 87, timestamp: new Date().toISOString() },
    "XOM": { symbol: "XOM", score: 62, label: "bullish", sources: 29, timestamp: new Date().toISOString() },
  };

  async getSentiment(symbol: string): Promise<SentimentData> {
    return this.sentiments[symbol] || {
      symbol, score: 0, label: "neutral" as const, sources: 0, timestamp: new Date().toISOString(),
    };
  }

  async getBulkSentiment(symbols: string[]): Promise<SentimentData[]> {
    return Promise.all(symbols.map(s => this.getSentiment(s)));
  }
}

// ---------------------------------------------------------------------------
// Alpha Vantage News Sentiment API
// Docs: https://www.alphavantage.co/documentation/#news-sentiment
//
// GET https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers={ticker}&apikey={key}
//
// Response:
// {
//   "feed": [
//     {
//       "title": "...",
//       "overall_sentiment_score": 0.234,
//       "overall_sentiment_label": "Somewhat-Bullish",
//       "ticker_sentiment": [
//         {
//           "ticker": "XOM",
//           "relevance_score": "0.95",
//           "ticker_sentiment_score": "0.32",
//           "ticker_sentiment_label": "Somewhat-Bullish"
//         }
//       ]
//     }
//   ],
//   "sentiment_score_definition": { ... }
// }
//
// Free tier: 25 requests/day. Cache aggressively.
// ---------------------------------------------------------------------------

interface AvTickerSentiment {
  ticker: string;
  relevance_score: string;
  ticker_sentiment_score: string;
  ticker_sentiment_label: string;
}

interface AvFeedItem {
  title: string;
  overall_sentiment_score: number;
  overall_sentiment_label: string;
  ticker_sentiment: AvTickerSentiment[];
}

interface AvSentimentResponse {
  feed?: AvFeedItem[];
  Information?: string; // rate limit message
}

function mapAvLabel(label: string): SentimentData["label"] {
  const normalized = label.toLowerCase().replace(/[_-]/g, "");
  if (normalized.includes("stronglybullish") || normalized.includes("verybullish")) return "very_bullish";
  if (normalized.includes("bullish")) return "bullish";
  if (normalized.includes("stronglybearish") || normalized.includes("verybearish")) return "very_bearish";
  if (normalized.includes("bearish")) return "bearish";
  return "neutral";
}

function avScoreToInt(score: number): number {
  // Alpha Vantage scores range from -1 to 1. Map to -100 to 100.
  return Math.round(score * 100);
}

class AlphaVantageSentimentProvider implements SentimentProvider {
  private apiKey: string;
  private baseUrl = "https://www.alphavantage.co/query";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getSentiment(symbol: string): Promise<SentimentData> {
    const ticker = toAvTicker(symbol);

    try {
      const response = await fetch(
        `${this.baseUrl}?function=NEWS_SENTIMENT&tickers=${ticker}&apikey=${this.apiKey}&limit=50`,
        { next: { revalidate: 1800 } } // cache 30 min (25 req/day limit)
      );

      if (!response.ok) {
        console.warn(`Alpha Vantage returned ${response.status} for ${ticker}, falling back to mock`);
        return new MockSentimentProvider().getSentiment(symbol);
      }

      const data: AvSentimentResponse = await response.json();

      // Check for rate limit message
      if (data.Information) {
        console.warn("Alpha Vantage rate limit hit:", data.Information);
        return new MockSentimentProvider().getSentiment(symbol);
      }

      if (!data.feed || data.feed.length === 0) {
        return {
          symbol, score: 0, label: "neutral", sources: 0, timestamp: new Date().toISOString(),
        };
      }

      // Aggregate sentiment across all articles that mention this ticker
      let totalScore = 0;
      let count = 0;

      for (const item of data.feed) {
        // Look for this specific ticker's sentiment within the article
        const tickerMatch = item.ticker_sentiment?.find(
          (ts) => ts.ticker === ticker || ts.ticker === symbol
        );

        if (tickerMatch) {
          totalScore += parseFloat(tickerMatch.ticker_sentiment_score);
          count++;
        } else {
          // Fall back to overall article sentiment
          totalScore += item.overall_sentiment_score;
          count++;
        }
      }

      const avgScore = count > 0 ? totalScore / count : 0;
      const intScore = avScoreToInt(avgScore);

      // Determine label from average score
      let label: SentimentData["label"];
      if (intScore >= 35) label = "very_bullish";
      else if (intScore >= 15) label = "bullish";
      else if (intScore > -15) label = "neutral";
      else if (intScore > -35) label = "bearish";
      else label = "very_bearish";

      return {
        symbol,
        score: intScore,
        label,
        sources: count,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn(`Alpha Vantage fetch failed for ${ticker}, falling back to mock:`, error);
      return new MockSentimentProvider().getSentiment(symbol);
    }
  }

  async getBulkSentiment(symbols: string[]): Promise<SentimentData[]> {
    // Alpha Vantage doesn't support bulk queries, so we fetch sequentially
    // with a small delay to respect rate limits
    const results: SentimentData[] = [];
    for (const symbol of symbols) {
      results.push(await this.getSentiment(symbol));
    }
    return results;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export function getSentimentProvider(): SentimentProvider {
  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (apiKey) return new AlphaVantageSentimentProvider(apiKey);
  return new MockSentimentProvider();
}
