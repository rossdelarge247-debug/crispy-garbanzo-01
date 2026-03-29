/**
 * Opportunity Scanner — Trade Wizard
 *
 * Two modes:
 * 1. AI mode (ANTHROPIC_API_KEY): Claude reads calendar + news + articles
 * 2. Rules mode: generates ideas from known calendar patterns + news themes
 *
 * Both modes produce the same TradeOpportunity format.
 */

import type { EconomicEvent, NewsArticle, Direction } from "@/types";
import { fetchArticleContents } from "@/services/article-reader";
import { fetchWithCache } from "@/services/feed-cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TradeOpportunity {
  id: string;
  asset: string;
  assetName: string;
  direction: Direction;
  category: string;
  title: string;
  thesis: string;
  catalyst: string;
  timing: string;
  entryCondition: string;
  stopLoss: string;
  target: string;
  holdPeriod: string;
  conviction: number;
  convictionRationale: string;
  reasons: string[];
  risks: string[];
  whatToWatch: string;
  relatedEvents: string[];
  relatedHeadlines: string[];
}

export interface ScanResult {
  opportunities: TradeOpportunity[];
  marketSummary: string;
  source: "ai" | "rules";
  scannedAt: string;
}

// ---------------------------------------------------------------------------
// Known calendar event → trade patterns
// ---------------------------------------------------------------------------

interface EventPattern {
  match: (title: string) => boolean;
  trades: { asset: string; assetName: string; direction: Direction; thesis: string; conviction: number }[];
}

const EVENT_PATTERNS: EventPattern[] = [
  {
    match: t => /fomc|fed.*rate|federal reserve/i.test(t),
    trades: [
      { asset: "DXY", assetName: "US Dollar", direction: "long", thesis: "Hawkish Fed tone or hold strengthens the dollar as rate differentials widen.", conviction: 75 },
      { asset: "GC=F", assetName: "Gold", direction: "short", thesis: "Higher-for-longer rates pressure gold as opportunity cost of holding non-yielding assets rises.", conviction: 70 },
      { asset: "SPY", assetName: "S&P 500", direction: "short", thesis: "Hawkish surprise typically triggers equity selling as discount rates rise.", conviction: 65 },
    ],
  },
  {
    match: t => /non.?farm|nfp|payroll/i.test(t),
    trades: [
      { asset: "DXY", assetName: "US Dollar", direction: "long", thesis: "Strong jobs data supports USD as it reduces rate cut expectations.", conviction: 72 },
      { asset: "SPY", assetName: "S&P 500", direction: "long", thesis: "Strong employment supports consumer spending and corporate earnings.", conviction: 68 },
      { asset: "EUR-USD", assetName: "Euro/Dollar", direction: "short", thesis: "Strong US data widens rate differential, pressuring EUR.", conviction: 70 },
    ],
  },
  {
    match: t => /\bcpi\b|consumer price|inflation/i.test(t),
    trades: [
      { asset: "GC=F", assetName: "Gold", direction: "long", thesis: "Hot CPI boosts inflation hedges. Gold rallies as real rates expectations shift.", conviction: 73 },
      { asset: "DXY", assetName: "US Dollar", direction: "long", thesis: "Above-consensus CPI pushes rate expectations higher, strengthening USD.", conviction: 72 },
      { asset: "BTC-USD", assetName: "Bitcoin", direction: "long", thesis: "Inflation narrative supports Bitcoin as a store-of-value alternative.", conviction: 60 },
    ],
  },
  {
    match: t => /ecb.*rate|ecb.*decision/i.test(t),
    trades: [
      { asset: "EUR-USD", assetName: "Euro/Dollar", direction: "short", thesis: "ECB rate cut weakens Euro as rate differential with the US widens.", conviction: 74 },
      { asset: "DXY", assetName: "US Dollar", direction: "long", thesis: "ECB easing while Fed holds creates USD tailwind.", conviction: 70 },
    ],
  },
  {
    match: t => /opec|oil.*meet/i.test(t),
    trades: [
      { asset: "BZ=F", assetName: "Brent Crude", direction: "long", thesis: "OPEC production discipline supports crude prices. Any cut extension is bullish.", conviction: 72 },
      { asset: "CL=F", assetName: "WTI Crude", direction: "long", thesis: "Supply constraints from OPEC decisions drive WTI higher.", conviction: 70 },
    ],
  },
  {
    match: t => /ism.*manufactur|pmi/i.test(t),
    trades: [
      { asset: "SPY", assetName: "S&P 500", direction: "long", thesis: "Above-50 PMI signals expansion, supporting equity valuations.", conviction: 65 },
      { asset: "DXY", assetName: "US Dollar", direction: "long", thesis: "Strong manufacturing data supports growth and rate expectations.", conviction: 62 },
    ],
  },
  {
    match: t => /jobless.*claim|initial.*claim/i.test(t),
    trades: [
      { asset: "DXY", assetName: "US Dollar", direction: "long", thesis: "Low claims signal tight labor market, supporting hawkish Fed stance.", conviction: 60 },
    ],
  },
  {
    match: t => /boj|bank of japan/i.test(t),
    trades: [
      { asset: "USD-JPY", assetName: "Dollar/Yen", direction: "long", thesis: "BOJ maintaining ultra-loose policy keeps yen weak vs dollar.", conviction: 68 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Rules-based scanner — generates ideas from known patterns
// ---------------------------------------------------------------------------

function scanWithRules(
  events: EconomicEvent[],
  articles: NewsArticle[]
): ScanResult {
  const opportunities: TradeOpportunity[] = [];
  const seen = new Set<string>(); // deduplicate by asset

  // Calendar event → trade ideas
  for (const event of events) {
    if (event.impact !== "high" && event.impact !== "medium") continue;

    for (const pattern of EVENT_PATTERNS) {
      if (!pattern.match(event.title)) continue;

      for (const trade of pattern.trades) {
        const key = `${trade.asset}-${event.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const dateStr = new Date(event.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

        opportunities.push({
          id: `cal-${trade.asset.replace(/[^a-zA-Z0-9]/g, "-")}-${event.id}`,
          asset: trade.asset,
          assetName: trade.assetName,
          direction: trade.direction,
          category: "calendar",
          title: `${trade.direction === "long" ? "Long" : "Short"} ${trade.assetName} into ${event.title}`,
          thesis: trade.thesis,
          catalyst: event.title,
          timing: `Before ${dateStr}`,
          entryCondition: "At current levels",
          stopLoss: "2% from entry",
          target: "3% from entry",
          holdPeriod: "Through the event, reassess after",
          conviction: trade.conviction,
          convictionRationale: `Well-established pattern. ${event.title} has historically moved ${trade.assetName} in this direction.`,
          reasons: [
            trade.thesis,
            event.forecast ? `Consensus: ${event.forecast} vs previous ${event.previous}` : "Watch for deviation from expectations",
          ],
          risks: [`Opposite-to-consensus ${event.title} result would reverse the trade`],
          whatToWatch: event.title,
          relatedEvents: [event.title],
          relatedHeadlines: [],
        });
      }
    }
  }

  // News-driven ideas from keyword matching
  const newsThemes = [
    { keywords: ["oil", "crude", "opec", "brent", "energy"], asset: "BZ=F", assetName: "Brent Crude", defaultDir: "long" as Direction },
    { keywords: ["bitcoin", "btc", "crypto", "ethereum"], asset: "BTC-USD", assetName: "Bitcoin", defaultDir: "long" as Direction },
    { keywords: ["dollar", "fed", "rate", "treasury"], asset: "DXY", assetName: "US Dollar", defaultDir: "long" as Direction },
    { keywords: ["nvidia", "ai", "semiconductor", "chip"], asset: "NVDA", assetName: "NVIDIA", defaultDir: "long" as Direction },
    { keywords: ["gold", "haven", "inflation hedge"], asset: "GC=F", assetName: "Gold", defaultDir: "long" as Direction },
  ];

  for (const theme of newsThemes) {
    const matched = articles.filter(a =>
      theme.keywords.some(kw => (a.title + " " + (a.summary || "")).toLowerCase().includes(kw))
    );
    if (matched.length < 2) continue;

    const key = `news-${theme.asset}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const avgSentiment = matched.reduce((s, a) => s + a.sentiment, 0) / matched.length;
    const direction: Direction = avgSentiment > 0.1 ? theme.defaultDir : avgSentiment < -0.1 ? (theme.defaultDir === "long" ? "short" : "long") : theme.defaultDir;
    const topHeadline = matched[0]?.title ?? "";

    opportunities.push({
      id: `news-${theme.asset.replace(/[^a-zA-Z0-9]/g, "-")}`,
      asset: theme.asset,
      assetName: theme.assetName,
      direction,
      category: "momentum",
      title: `${direction === "long" ? "Long" : "Short"} ${theme.assetName} — news momentum`,
      thesis: `${matched.length} articles driving ${theme.assetName} sentiment. Lead: "${topHeadline}"`,
      catalyst: topHeadline,
      timing: "Current",
      entryCondition: "At current levels",
      stopLoss: "2% from entry",
      target: "3% from entry",
      holdPeriod: "3-5 days",
      conviction: Math.min(55 + matched.length * 3, 72),
      convictionRationale: `${matched.length} articles with ${avgSentiment > 0 ? "positive" : "negative"} tone.`,
      reasons: [`${matched.length} recent articles supporting this direction`, topHeadline],
      risks: ["Sentiment can reverse quickly on counter-narrative"],
      whatToWatch: "News flow continuation",
      relatedEvents: [],
      relatedHeadlines: matched.slice(0, 3).map(a => a.title),
    });
  }

  // Sort by conviction
  opportunities.sort((a, b) => b.conviction - a.conviction);

  return {
    opportunities,
    marketSummary: `${opportunities.length} trade ideas from ${events.filter(e => e.impact === "high").length} calendar events and ${articles.length} news articles.`,
    source: "rules",
    scannedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Claude-powered scanner
// ---------------------------------------------------------------------------

async function scanWithClaude(
  events: EconomicEvent[],
  articles: NewsArticle[],
  assetFilter?: string
): Promise<ScanResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const articleContents = await fetchArticleContents(
    articles.slice(0, 8).map(a => ({ url: a.url, title: a.title })),
    5
  );

  const calendarText = events
    .filter(e => e.impact === "high" || e.impact === "medium")
    .map(e => {
      const date = new Date(e.date);
      const dayStr = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      return `${dayStr} ${timeStr}: ${e.title} (${e.country}, ${e.impact})${e.forecast ? ` — forecast: ${e.forecast}, prev: ${e.previous ?? "n/a"}` : ""}`;
    }).join("\n");

  const articleText = articles.slice(0, 10).map((a, i) => {
    const content = articleContents.find(c => c.url === a.url);
    if (content?.success) return `${i + 1}. "${a.title}" — ${a.source}\n${content.text}`;
    return `${i + 1}. "${a.title}" — ${a.source}${a.summary ? ` | ${a.summary}` : ""}`;
  }).join("\n\n");

  const filterNote = assetFilter && assetFilter !== "all"
    ? `FOCUS: ${assetFilter} opportunities. Include cross-asset if strong.`
    : "";

  const prompt = `You are an experienced day trader with 20 years of live market experience. You know exactly how markets react to economic data releases, central bank decisions, and geopolitical developments.

${filterNote}

CALENDAR (next 7 days):
${calendarText || "None."}

NEWS (${articles.length} articles):
${articleText || "None."}

DATE: ${new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}

GENERATE A TRADE IDEA FOR EVERY HIGH-IMPACT CALENDAR EVENT. These are bread and butter — CPI beats → dollar up. NFP strong → risk-on. ECB cuts → EUR down. You've traded these hundreds of times.

Also generate ideas from news and geopolitical developments.

Return raw JSON:
{
  "marketSummary": "1-2 sentences. The setup this week.",
  "opportunities": [
    {
      "asset": "Ticker",
      "assetName": "Name",
      "direction": "long" or "short",
      "category": "calendar" or "geopolitical" or "momentum" or "mean-reversion" or "cross-asset",
      "title": "Punchy. 'Short EUR into ECB cut'",
      "thesis": "1-2 sentences.",
      "catalyst": "Specific trigger.",
      "timing": "When to enter.",
      "entryCondition": "Level or condition",
      "stopLoss": "Level",
      "target": "Level",
      "holdPeriod": "Duration",
      "conviction": 0-100,
      "convictionRationale": "Why.",
      "reasons": ["Max 3"],
      "risks": ["Max 2"],
      "whatToWatch": "Key monitor",
      "relatedEvents": ["Events"],
      "relatedHeadlines": ["Headlines"]
    }
  ]
}

CONVICTION: Calendar events with clear pattern: 70-85. Geopolitical with catalyst: 60-75. Momentum with confirmation: 65-80. Only <50 if genuinely unclear.

One idea per calendar event minimum. 5-10 ideas total. Specific levels. Order by conviction.`;

  const cacheKey = `scan-${assetFilter ?? "all"}-${new Date().toISOString().split("T")[0]}`;
  const cacheConfig = {
    id: cacheKey,
    name: "Opportunity scan",
    ttlSeconds: 600,
    source: "anthropic",
    rateLimit: "API tier dependent",
  };

  const cached = await fetchWithCache<ScanResult>(cacheConfig, async () => {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .filter(block => block.type === "text")
      .map(block => ("text" in block ? block.text : ""))
      .join("");

    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      opportunities: (parsed.opportunities || []).map((o: TradeOpportunity, i: number) => ({
        ...o,
        id: `opp-${(o.asset || "unknown").replace(/[^a-zA-Z0-9]/g, "-")}-${i}`,
        conviction: Math.max(0, Math.min(100, o.conviction || 30)),
        direction: o.direction || "long",
        category: o.category || "calendar",
        reasons: o.reasons || [],
        risks: o.risks || [],
        relatedEvents: o.relatedEvents || [],
        relatedHeadlines: o.relatedHeadlines || [],
      })),
      marketSummary: parsed.marketSummary || "",
      source: "ai" as const,
      scannedAt: new Date().toISOString(),
    };
  });

  return cached?.data ?? null;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function scanForOpportunities(
  events: EconomicEvent[],
  articles: NewsArticle[],
  assetFilter?: string
): Promise<ScanResult> {
  // Try Claude first
  const aiResult = await scanWithClaude(events, articles, assetFilter);
  if (aiResult && aiResult.opportunities.length > 0) return aiResult;

  // Fall back to rules — this should ALWAYS produce ideas from calendar events
  return scanWithRules(events, articles);
}
