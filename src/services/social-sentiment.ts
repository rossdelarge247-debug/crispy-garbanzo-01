/**
 * Social Sentiment Provider
 *
 * Aggregates sentiment signals from multiple free social sources:
 * - Reddit (public JSON endpoints, no auth)
 * - StockTwits (free API, no key for public streams)
 * - Fear & Greed Index (alternative.me, free, no key)
 *
 * Produces a composite social sentiment score per asset/theme
 * that enriches the existing news-based sentiment.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SocialSignal {
  source: "reddit" | "stocktwits" | "fear_greed" | "composite";
  asset: string;
  score: number;        // -100 to 100
  label: string;        // human-readable
  volume: number;       // post/mention count
  samplePosts: string[]; // top post titles for evidence
  fetchedAt: string;
}

export interface CompositeSocialSentiment {
  asset: string;
  compositeScore: number;   // -100 to 100
  compositeLabel: string;
  signals: SocialSignal[];
  agreement: number;         // 0-100, how aligned sources are
  fetchedAt: string;
}

// ---------------------------------------------------------------------------
// Reddit — public JSON endpoints (no auth needed)
// ---------------------------------------------------------------------------

// Subreddits to scan per theme
const REDDIT_SUBREDDITS: Record<string, string[]> = {
  "oil": ["energy", "oil", "commodities"],
  "crude": ["energy", "oil", "commodities"],
  "BZ=F": ["energy", "oil", "commodities"],
  "bitcoin": ["bitcoin", "cryptocurrency", "wallstreetbets"],
  "BTC-USD": ["bitcoin", "cryptocurrency", "CryptoMarkets"],
  "ETH-USD": ["ethereum", "cryptocurrency", "CryptoMarkets"],
  "crypto": ["cryptocurrency", "CryptoMarkets", "wallstreetbets"],
  "dollar": ["forex", "economics", "wallstreetbets"],
  "DXY": ["forex", "economics", "stocks"],
  "EUR-USD": ["forex", "economics"],
  "fed": ["economics", "stocks", "wallstreetbets"],
  "NVDA": ["stocks", "wallstreetbets", "nvidia"],
  "tech": ["stocks", "wallstreetbets", "technology"],
  "SPY": ["stocks", "wallstreetbets", "investing"],
  "market": ["stocks", "wallstreetbets", "investing"],
};

function getSubreddits(query: string): string[] {
  const lower = query.toLowerCase();
  for (const [key, subs] of Object.entries(REDDIT_SUBREDDITS)) {
    if (lower.includes(key.toLowerCase())) return subs;
  }
  return ["stocks", "wallstreetbets", "investing"];
}

// Simple sentiment scoring from text
function scoreSentiment(text: string): number {
  const lower = text.toLowerCase();

  const bullishWords = [
    "bull", "bullish", "moon", "pump", "rally", "breakout", "buy",
    "long", "calls", "upside", "surge", "soar", "boom", "green",
    "strong", "gains", "profit", "squeeze", "rocket", "diamond hands",
    "all time high", "ath", "undervalued", "opportunity",
  ];

  const bearishWords = [
    "bear", "bearish", "crash", "dump", "sell", "short", "puts",
    "downside", "plunge", "tank", "red", "weak", "loss", "bubble",
    "overvalued", "collapse", "recession", "fear", "panic", "rug pull",
    "scam", "dead", "bagholding",
  ];

  let score = 0;
  for (const word of bullishWords) {
    if (lower.includes(word)) score += 8;
  }
  for (const word of bearishWords) {
    if (lower.includes(word)) score -= 8;
  }

  return Math.max(-100, Math.min(100, score));
}

interface RedditPost {
  data: {
    title: string;
    score: number;
    num_comments: number;
    created_utc: number;
    subreddit: string;
    selftext?: string;
  };
}

interface RedditResponse {
  data?: {
    children?: RedditPost[];
  };
}

async function fetchRedditSentiment(query: string): Promise<SocialSignal> {
  const subreddits = getSubreddits(query);
  const allPosts: { title: string; score: number; sentiment: number }[] = [];

  for (const sub of subreddits.slice(0, 2)) { // limit to 2 subreddits to stay fast
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(
        `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&sort=new&limit=10&t=week&restrict_sr=on`,
        {
          signal: controller.signal,
          headers: { "User-Agent": "TradeDaddy/1.0 (market-sentiment-scanner)" },
          next: { revalidate: 600 }, // cache 10 min
        }
      );
      clearTimeout(timer);

      if (res.ok) {
        const data: RedditResponse = await res.json();
        if (data.data?.children) {
          for (const post of data.data.children) {
            allPosts.push({
              title: post.data.title,
              score: post.data.score,
              sentiment: scoreSentiment(post.data.title + " " + (post.data.selftext || "")),
            });
          }
        }
      }
    } catch {
      // Silently skip failed subreddits
    }
  }

  if (allPosts.length === 0) {
    return {
      source: "reddit",
      asset: query,
      score: 0,
      label: "No data",
      volume: 0,
      samplePosts: [],
      fetchedAt: new Date().toISOString(),
    };
  }

  // Weight by upvotes — high-upvote posts carry more signal
  const totalUpvotes = allPosts.reduce((s, p) => s + Math.max(p.score, 1), 0);
  const weightedScore = allPosts.reduce(
    (s, p) => s + p.sentiment * (Math.max(p.score, 1) / totalUpvotes),
    0
  );

  const finalScore = Math.round(Math.max(-100, Math.min(100, weightedScore)));
  const label = finalScore > 20 ? "Bullish" : finalScore < -20 ? "Bearish" : "Neutral";

  return {
    source: "reddit",
    asset: query,
    score: finalScore,
    label: `${label} (r/${subreddits[0]})`,
    volume: allPosts.length,
    samplePosts: allPosts
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(p => p.title),
    fetchedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// StockTwits — free public API
// GET https://api.stocktwits.com/api/2/streams/symbol/{SYMBOL}.json
// ---------------------------------------------------------------------------

interface StockTwitsMessage {
  body: string;
  entities?: {
    sentiment?: {
      basic: "Bullish" | "Bearish" | null;
    };
  };
}

interface StockTwitsResponse {
  messages?: StockTwitsMessage[];
  symbol?: {
    watchlist_count?: number;
  };
}

// Map our symbols to StockTwits symbols
const stocktwitsSymbolMap: Record<string, string> = {
  "BZ=F": "USO",
  "BTC-USD": "BTC.X",
  "ETH-USD": "ETH.X",
  "EUR-USD": "EUR/USD",
  "GBP-USD": "GBP/USD",
  "USD-JPY": "USD/JPY",
  "DXY": "UUP",
  // Equities pass through: XOM, NVDA, SPY, COIN, MSFT, GOOGL
};

async function fetchStockTwitsSentiment(symbol: string): Promise<SocialSignal> {
  const stwSymbol = stocktwitsSymbolMap[symbol] || symbol;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      `https://api.stocktwits.com/api/2/streams/symbol/${stwSymbol}.json`,
      {
        signal: controller.signal,
        next: { revalidate: 600 },
      }
    );
    clearTimeout(timer);

    if (!res.ok) {
      return { source: "stocktwits", asset: symbol, score: 0, label: "No data", volume: 0, samplePosts: [], fetchedAt: new Date().toISOString() };
    }

    const data: StockTwitsResponse = await res.json();
    const messages = data.messages || [];

    if (messages.length === 0) {
      return { source: "stocktwits", asset: symbol, score: 0, label: "No data", volume: 0, samplePosts: [], fetchedAt: new Date().toISOString() };
    }

    // Count bull/bear tagged messages
    let bullish = 0;
    let bearish = 0;
    let untagged = 0;

    for (const msg of messages) {
      const sentiment = msg.entities?.sentiment?.basic;
      if (sentiment === "Bullish") bullish++;
      else if (sentiment === "Bearish") bearish++;
      else untagged++;
    }

    // For untagged messages, use text analysis
    for (const msg of messages) {
      if (!msg.entities?.sentiment?.basic) {
        const textScore = scoreSentiment(msg.body);
        if (textScore > 10) bullish += 0.5;
        else if (textScore < -10) bearish += 0.5;
      }
    }

    const total = bullish + bearish || 1;
    const ratio = (bullish - bearish) / total;
    const score = Math.round(ratio * 100);
    const label = score > 15 ? "Bullish" : score < -15 ? "Bearish" : "Mixed";

    return {
      source: "stocktwits",
      asset: symbol,
      score: Math.max(-100, Math.min(100, score)),
      label: `${label} (${Math.round(bullish)}↑ ${Math.round(bearish)}↓)`,
      volume: messages.length,
      samplePosts: messages.slice(0, 3).map(m => m.body.slice(0, 120)),
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return { source: "stocktwits", asset: symbol, score: 0, label: "Unavailable", volume: 0, samplePosts: [], fetchedAt: new Date().toISOString() };
  }
}

// ---------------------------------------------------------------------------
// Fear & Greed Index — alternative.me (crypto) + CNN (traditional)
// GET https://api.alternative.me/fng/?limit=1&format=json
// ---------------------------------------------------------------------------

interface FearGreedResponse {
  data?: {
    value: string;
    value_classification: string;
    timestamp: string;
  }[];
}

async function fetchFearGreedIndex(): Promise<SocialSignal> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      "https://api.alternative.me/fng/?limit=1&format=json",
      {
        signal: controller.signal,
        next: { revalidate: 1800 }, // cache 30 min — updates daily
      }
    );
    clearTimeout(timer);

    if (!res.ok) {
      return { source: "fear_greed", asset: "MARKET", score: 0, label: "Unavailable", volume: 0, samplePosts: [], fetchedAt: new Date().toISOString() };
    }

    const data: FearGreedResponse = await res.json();
    if (!data.data || data.data.length === 0) {
      return { source: "fear_greed", asset: "MARKET", score: 0, label: "No data", volume: 0, samplePosts: [], fetchedAt: new Date().toISOString() };
    }

    const fng = data.data[0];
    const value = parseInt(fng.value, 10); // 0 = Extreme Fear, 100 = Extreme Greed

    // Convert 0-100 scale to our -100 to 100 scale
    const normalizedScore = Math.round((value - 50) * 2);

    return {
      source: "fear_greed",
      asset: "MARKET",
      score: normalizedScore,
      label: fng.value_classification,
      volume: 1,
      samplePosts: [`Fear & Greed Index: ${fng.value}/100 — ${fng.value_classification}`],
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return { source: "fear_greed", asset: "MARKET", score: 0, label: "Unavailable", volume: 0, samplePosts: [], fetchedAt: new Date().toISOString() };
  }
}

// ---------------------------------------------------------------------------
// Composite: aggregate all sources into a single score
// ---------------------------------------------------------------------------

const SOURCE_WEIGHTS = {
  reddit: 0.35,
  stocktwits: 0.30,
  fear_greed: 0.15,
  news: 0.20,
};

export async function getSocialSentiment(
  asset: string,
  searchQuery?: string,
  newsSentiment?: number
): Promise<CompositeSocialSentiment> {
  const query = searchQuery || asset;

  // Fetch all sources in parallel
  const [reddit, stocktwits, fearGreed] = await Promise.all([
    fetchRedditSentiment(query),
    fetchStockTwitsSentiment(asset),
    fetchFearGreedIndex(),
  ]);

  const signals: SocialSignal[] = [reddit, stocktwits, fearGreed];

  // Calculate composite score with weights
  const activeSignals: { score: number; weight: number }[] = [];

  if (reddit.volume > 0) {
    activeSignals.push({ score: reddit.score, weight: SOURCE_WEIGHTS.reddit });
  }
  if (stocktwits.volume > 0) {
    activeSignals.push({ score: stocktwits.score, weight: SOURCE_WEIGHTS.stocktwits });
  }
  if (fearGreed.volume > 0) {
    activeSignals.push({ score: fearGreed.score, weight: SOURCE_WEIGHTS.fear_greed });
  }
  if (newsSentiment !== undefined) {
    activeSignals.push({ score: newsSentiment, weight: SOURCE_WEIGHTS.news });
    signals.push({
      source: "composite",
      asset,
      score: newsSentiment,
      label: "News sentiment",
      volume: 1,
      samplePosts: [],
      fetchedAt: new Date().toISOString(),
    });
  }

  // Normalize weights to sum to 1
  const totalWeight = activeSignals.reduce((s, sig) => s + sig.weight, 0) || 1;
  const compositeScore = Math.round(
    activeSignals.reduce((s, sig) => s + sig.score * (sig.weight / totalWeight), 0)
  );

  // Agreement: how aligned are the sources (0 = total disagreement, 100 = unanimous)
  const scores = activeSignals.map(s => s.score);
  let agreement = 100;
  if (scores.length >= 2) {
    const allPositive = scores.every(s => s > 0);
    const allNegative = scores.every(s => s < 0);
    if (allPositive || allNegative) {
      agreement = 80 + Math.round(20 * (1 - standardDeviation(scores) / 100));
    } else {
      agreement = Math.max(0, 50 - Math.round(standardDeviation(scores)));
    }
  }

  const compositeLabel =
    compositeScore > 30 ? "Strongly Bullish" :
    compositeScore > 10 ? "Bullish" :
    compositeScore > -10 ? "Neutral" :
    compositeScore > -30 ? "Bearish" :
    "Strongly Bearish";

  return {
    asset,
    compositeScore,
    compositeLabel,
    signals,
    agreement: Math.max(0, Math.min(100, agreement)),
    fetchedAt: new Date().toISOString(),
  };
}

function standardDeviation(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  return Math.sqrt(variance);
}

// ---------------------------------------------------------------------------
// Bulk: get social sentiment for multiple assets
// ---------------------------------------------------------------------------

export async function getBulkSocialSentiment(
  assets: { symbol: string; searchQuery?: string; newsSentiment?: number }[]
): Promise<CompositeSocialSentiment[]> {
  // Run in parallel but cap concurrency to avoid rate limits
  const results: CompositeSocialSentiment[] = [];
  for (const asset of assets) {
    results.push(await getSocialSentiment(asset.symbol, asset.searchQuery, asset.newsSentiment));
  }
  return results;
}
