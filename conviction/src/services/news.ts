import type { NewsArticle } from "@/types";

export interface NewsProvider {
  getNews(query: string, limit?: number): Promise<NewsArticle[]>;
  getNewsBySymbol(symbol: string, limit?: number): Promise<NewsArticle[]>;
}

class MockNewsProvider implements NewsProvider {
  private articles: NewsArticle[] = [
    {
      id: "news-001",
      title: "OPEC+ Signals Deeper Production Cuts Amid Geopolitical Tensions",
      summary: "OPEC+ members are considering extending and deepening production cuts as Middle East tensions disrupt shipping routes and threaten supply chains.",
      source: "Reuters",
      url: "https://reuters.com/markets/commodities/opec-production-cuts",
      publishedAt: "2026-03-27T14:30:00Z",
      sentiment: 0.6,
      relevance: 0.95,
      symbols: ["BZ=F", "XOM", "CVX"],
    },
    {
      id: "news-002",
      title: "Red Sea Shipping Disruptions Push Oil Prices Higher",
      summary: "Continued attacks on commercial vessels in the Red Sea are forcing tankers to reroute around the Cape of Good Hope, adding transit time and costs to global oil supply.",
      source: "Bloomberg",
      url: "https://bloomberg.com/news/red-sea-oil-shipping",
      publishedAt: "2026-03-26T09:15:00Z",
      sentiment: 0.4,
      relevance: 0.9,
      symbols: ["BZ=F", "CL=F"],
    },
    {
      id: "news-003",
      title: "Bitcoin ETF Inflows Slow as Crypto Market Consolidates",
      summary: "Spot Bitcoin ETF inflows have decelerated to $120M daily, down from $400M peaks, as the market digests gains and awaits the next catalyst.",
      source: "CNBC",
      url: "https://cnbc.com/crypto/bitcoin-etf-inflows-slow",
      publishedAt: "2026-03-27T16:45:00Z",
      sentiment: -0.1,
      relevance: 0.85,
      symbols: ["BTC-USD", "ETH-USD"],
    },
    {
      id: "news-004",
      title: "Fed Officials Signal Patience on Rate Cuts Despite Cooling Inflation",
      summary: "Multiple Federal Reserve governors emphasized the need for additional data before committing to rate reductions, pushing dollar strength higher.",
      source: "Financial Times",
      url: "https://ft.com/content/fed-rate-patience",
      publishedAt: "2026-03-26T20:00:00Z",
      sentiment: -0.3,
      relevance: 0.88,
      symbols: ["DXY", "EUR-USD", "BTC-USD"],
    },
    {
      id: "news-005",
      title: "Dollar Index Hits Three-Month High on Hawkish Fed Rhetoric",
      summary: "The US Dollar Index surged to 104.80 as traders repriced rate cut expectations, putting pressure on euro and emerging market currencies.",
      source: "Wall Street Journal",
      url: "https://wsj.com/markets/dollar-index-high",
      publishedAt: "2026-03-27T11:20:00Z",
      sentiment: 0.5,
      relevance: 0.92,
      symbols: ["DXY", "EUR-USD"],
    },
    {
      id: "news-006",
      title: "Ethereum Layer-2 Activity Surges Ahead of Major Protocol Upgrade",
      summary: "Transaction volumes on Ethereum Layer-2 networks have hit record highs as developers prepare for the upcoming Pectra upgrade expected in Q2 2026.",
      source: "Bloomberg",
      url: "https://bloomberg.com/crypto/ethereum-l2-surge",
      publishedAt: "2026-03-25T13:00:00Z",
      sentiment: 0.35,
      relevance: 0.75,
      symbols: ["ETH-USD", "BTC-USD"],
    },
  ];

  async getNews(query: string, limit = 5): Promise<NewsArticle[]> {
    const q = query.toLowerCase();
    return this.articles
      .filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.symbols.some(s => s.toLowerCase().includes(q))
      )
      .slice(0, limit);
  }

  async getNewsBySymbol(symbol: string, limit = 5): Promise<NewsArticle[]> {
    return this.articles
      .filter(a => a.symbols.includes(symbol))
      .slice(0, limit);
  }
}

class GdeltNewsProvider implements NewsProvider {
  // GDELT Project — no API key required
  // Base URL: https://api.gdeltproject.org/api/v2/doc/doc

  async getNews(query: string, limit = 5): Promise<NewsArticle[]> {
    // TODO: Implement GDELT API call
    // GET https://api.gdeltproject.org/api/v2/doc/doc?query={query}&mode=artlist&format=json&maxrecords={limit}
    throw new Error("GDELT provider not yet implemented");
  }

  async getNewsBySymbol(symbol: string, limit = 5): Promise<NewsArticle[]> {
    return this.getNews(symbol, limit);
  }
}

class NewsApiProvider implements NewsProvider {
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }

  async getNews(query: string, limit = 5): Promise<NewsArticle[]> {
    // TODO: Implement NewsAPI call
    // GET https://newsapi.org/v2/everything?q={query}&pageSize={limit}&apiKey={key}
    throw new Error("NewsAPI provider not yet implemented. Set up at https://newsapi.org");
  }

  async getNewsBySymbol(symbol: string, limit = 5): Promise<NewsArticle[]> {
    return this.getNews(symbol, limit);
  }
}

export function getNewsProvider(): NewsProvider {
  const newsApiKey = process.env.NEWSAPI_KEY;
  if (newsApiKey) return new NewsApiProvider(newsApiKey);
  return new MockNewsProvider();
}
