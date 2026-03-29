import type { NewsArticle } from "@/types";
import { isCircuitOpen, markSourceFailed, FEED_CONFIGS } from "@/services/feed-cache";

export interface NewsProvider {
  getNews(query: string, limit?: number): Promise<NewsArticle[]>;
  getNewsBySymbol(symbol: string, limit?: number): Promise<NewsArticle[]>;
}

// ---------------------------------------------------------------------------
// Symbol → search query mapping
// GDELT searches news text, not ticker symbols, so we map symbols to
// human-readable search terms that will match relevant articles.
// ---------------------------------------------------------------------------
const symbolSearchTerms: Record<string, string> = {
  "BZ=F": "brent crude oil",
  "CL=F": "crude oil WTI",
  "XOM": "exxon mobil",
  "USO": "oil fund",
  "BTC-USD": "bitcoin",
  "ETH-USD": "ethereum",
  "COIN": "coinbase",
  "DXY": "dollar index",
  "EUR-USD": "euro dollar",
  "GBP-USD": "pound dollar",
  "USD-JPY": "dollar yen",
};

// ---------------------------------------------------------------------------
// Mock provider — static articles for demo mode
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// GDELT DOC 2.0 API — free, no API key required
// Docs: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
//
// Response format (mode=ArtList, format=json):
// {
//   "articles": [
//     {
//       "url": "https://...",
//       "url_mobile": "...",
//       "title": "Article Title",
//       "seendate": "20260327T143000Z",
//       "socialimage": "https://...",
//       "domain": "reuters.com",
//       "language": "English",
//       "sourcecountry": "United States"
//     }
//   ]
// }
//
// Notes:
// - No sentiment or summary in the response — we derive what we can
// - seendate format: YYYYMMDDTHHmmssZ
// - socialimage may be empty string
// - Free, no rate limit published, but be respectful
// ---------------------------------------------------------------------------

interface GdeltArticle {
  url: string;
  url_mobile?: string;
  title: string;
  seendate: string;
  socialimage: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

interface GdeltResponse {
  articles?: GdeltArticle[];
}

function parseGdeltDate(seendate: string): string {
  // "20260327T143000Z" → "2026-03-27T14:30:00Z"
  if (seendate.length < 15) return new Date().toISOString();
  const y = seendate.slice(0, 4);
  const m = seendate.slice(4, 6);
  const d = seendate.slice(6, 8);
  const h = seendate.slice(9, 11);
  const min = seendate.slice(11, 13);
  const s = seendate.slice(13, 15);
  return `${y}-${m}-${d}T${h}:${min}:${s}Z`;
}

function extractDomainName(domain: string): string {
  // "reuters.com" → "Reuters", "bbc.co.uk" → "BBC"
  const name = domain.replace(/^www\./, "").split(".")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

class GdeltNewsProvider implements NewsProvider {
  private baseUrl = "https://api.gdeltproject.org/api/v2/doc/doc";

  async getNews(query: string, limit = 10): Promise<NewsArticle[]> {
    // Circuit breaker: if GDELT failed recently, skip entirely
    const feedConfig = FEED_CONFIGS.gdelt_news(query);
    if (isCircuitOpen(feedConfig)) {
      return new MockNewsProvider().getNews(query, limit);
    }

    const params = new URLSearchParams({
      query: query,
      mode: "ArtList",
      format: "json",
      maxrecords: String(Math.min(limit, 75)), // GDELT max is 75
      sort: "DateDesc",
    });

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        signal: controller.signal,
        next: { revalidate: 300 }, // cache for 5 minutes in Next.js
      });
      clearTimeout(timer);

      if (!response.ok) {
        markSourceFailed("gdelt");
        return new MockNewsProvider().getNews(query, limit);
      }

      const data: GdeltResponse = await response.json();

      if (!data.articles || data.articles.length === 0) {
        return [];
      }

      return data.articles
        .filter((a) => a.language === "English" || !a.language)
        .slice(0, limit)
        .map((article, i) => ({
          id: `gdelt-${i}-${article.url.length}-${article.seendate}`,
          title: article.title,
          summary: "", // GDELT artlist mode doesn't include summaries
          source: extractDomainName(article.domain),
          url: article.url,
          publishedAt: parseGdeltDate(article.seendate),
          sentiment: 0, // Not provided by GDELT — use sentiment service separately
          relevance: 1, // All results are query-matched
          symbols: [], // GDELT doesn't tag by symbol — caller knows the context
        }));
    } catch {
      markSourceFailed("gdelt");
      return new MockNewsProvider().getNews(query, limit);
    }
  }

  async getNewsBySymbol(symbol: string, limit = 10): Promise<NewsArticle[]> {
    // Convert ticker symbol to a human-readable search query
    const searchQuery = symbolSearchTerms[symbol] || symbol.replace(/[-=]/g, " ");
    const articles = await this.getNews(searchQuery, limit);
    // Tag the returned articles with the requesting symbol
    return articles.map((a) => ({ ...a, symbols: [symbol] }));
  }
}

// ---------------------------------------------------------------------------
// NewsAPI — requires NEWSAPI_KEY env var
// Docs: https://newsapi.org/docs/endpoints/everything
// ---------------------------------------------------------------------------
class NewsApiProvider implements NewsProvider {
  private apiKey: string;
  private baseUrl = "https://newsapi.org/v2";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getNews(query: string, limit = 10): Promise<NewsArticle[]> {
    const params = new URLSearchParams({
      q: query,
      pageSize: String(limit),
      sortBy: "publishedAt",
      language: "en",
      apiKey: this.apiKey,
    });

    try {
      const response = await fetch(`${this.baseUrl}/everything?${params.toString()}`, {
        next: { revalidate: 300 },
      });

      if (!response.ok) {
        console.warn(`NewsAPI returned ${response.status}, falling back to mock`);
        return new MockNewsProvider().getNews(query, limit);
      }

      const data = await response.json();

      if (!data.articles || data.articles.length === 0) {
        return [];
      }

      return data.articles.slice(0, limit).map((article: {
        title: string;
        description: string;
        source: { name: string };
        url: string;
        publishedAt: string;
      }, i: number) => ({
        id: `newsapi-${i}-${Date.now()}`,
        title: article.title || "",
        summary: article.description || "",
        source: article.source?.name || "Unknown",
        url: article.url,
        publishedAt: article.publishedAt,
        sentiment: 0,
        relevance: 1,
        symbols: [],
      }));
    } catch (error) {
      console.warn("NewsAPI fetch failed, falling back to mock:", error);
      return new MockNewsProvider().getNews(query, limit);
    }
  }

  async getNewsBySymbol(symbol: string, limit = 10): Promise<NewsArticle[]> {
    const searchQuery = symbolSearchTerms[symbol] || symbol.replace(/[-=]/g, " ");
    const articles = await this.getNews(searchQuery, limit);
    return articles.map((a) => ({ ...a, symbols: [symbol] }));
  }
}

// ---------------------------------------------------------------------------
// Factory — selects provider based on environment configuration
//
// Priority: NEWSAPI_KEY → GDELT (default, free, no key) → Mock
// Set NEXT_PUBLIC_NEWS_PROVIDER=mock to force mock data
// ---------------------------------------------------------------------------
export function getNewsProvider(): NewsProvider {
  const newsApiKey = process.env.NEWSAPI_KEY;
  if (newsApiKey) return new NewsApiProvider(newsApiKey);

  const forceMock = process.env.NEXT_PUBLIC_NEWS_PROVIDER === "mock";
  if (forceMock) return new MockNewsProvider();

  // Default to GDELT — it's free and needs no key
  return new GdeltNewsProvider();
}
