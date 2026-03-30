/**
 * RSS News Provider — fetches news from financial RSS feeds.
 * Free, no API key, high quality sources.
 *
 * Sources: CNBC, MarketWatch, Reuters, BBC Business
 * Parses XML RSS feeds and extracts articles.
 */

import type { NewsArticle } from "@/types";

interface RSSFeed {
  url: string;
  source: string;
}

const FEEDS: RSSFeed[] = [
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", source: "CNBC" },
  { url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", source: "MarketWatch" },
  { url: "https://feeds.bbci.co.uk/news/business/rss.xml", source: "BBC Business" },
  { url: "https://www.cnbc.com/id/10000664/device/rss/rss.html", source: "CNBC Finance" },
];

function parseRSSXml(xml: string, source: string): NewsArticle[] {
  const articles: NewsArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/)?.[1] ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
    const link = item.match(/<link>(.*?)<\/link>/)?.[1] ?? "";
    const desc = item.match(/<description><!\[CDATA\[(.*?)\]\]>|<description>(.*?)<\/description>/)?.[1] ?? "";
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";

    if (!title || title.length < 10) continue;

    // Strip HTML from description
    const cleanDesc = desc.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();

    articles.push({
      id: `rss-${source.toLowerCase().replace(/\s/g, "")}-${Buffer.from(title).toString("base64").slice(0, 16)}`,
      title: title.trim(),
      summary: cleanDesc.slice(0, 200),
      source,
      url: link.trim(),
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      sentiment: 0,
      relevance: 1,
      symbols: [],
    });
  }

  return articles;
}

export async function fetchRSSNews(limit = 20): Promise<NewsArticle[]> {
  const results: NewsArticle[] = [];

  const fetches = FEEDS.map(async (feed) => {
    try {
      const res = await fetch(feed.url, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "TradeWizard/1.0" },
        next: { revalidate: 600 },
      });
      if (!res.ok) return [];
      const xml = await res.text();
      return parseRSSXml(xml, feed.source);
    } catch { return []; }
  });

  const batches = await Promise.all(fetches);
  const seen = new Set<string>();

  for (const batch of batches) {
    for (const article of batch) {
      // Deduplicate by title similarity
      const key = article.title.toLowerCase().slice(0, 50);
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(article);
    }
  }

  // Sort by date (newest first)
  results.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return results.slice(0, limit);
}

/**
 * Filter RSS articles by keyword relevance to a symbol
 */
export async function fetchRSSNewsBySymbol(symbol: string, limit = 10): Promise<NewsArticle[]> {
  const keywordMap: Record<string, string[]> = {
    "BTC-USD": ["bitcoin", "btc", "crypto"],
    "ETH-USD": ["ethereum", "eth", "crypto"],
    "BZ=F": ["oil", "crude", "brent", "opec", "energy"],
    "CL=F": ["oil", "crude", "wti", "energy"],
    "GC=F": ["gold", "precious metal"],
    "EUR-USD": ["euro", "ecb", "eurozone"],
    "GBP-USD": ["pound", "sterling", "bank of england", "boe"],
    "USD-JPY": ["yen", "japan", "boj"],
    "SPY": ["s&p", "stock market", "wall street", "equities"],
    "NVDA": ["nvidia", "semiconductor", "ai chip"],
    "DXY": ["dollar", "fed", "federal reserve"],
  };

  const keywords = keywordMap[symbol] ?? [symbol.replace(/[-=]/g, " ").toLowerCase()];
  const all = await fetchRSSNews(50);

  return all
    .filter(a => keywords.some(kw => (a.title + " " + a.summary).toLowerCase().includes(kw)))
    .slice(0, limit);
}
