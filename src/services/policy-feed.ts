/**
 * Policy Feed Engine — tracks Trump/White House announcements and
 * analyses their market impact.
 *
 * Sources:
 * 1. GDELT — political news mentioning Trump, tariffs, White House
 * 2. RSS — Reuters politics, AP, White House press releases
 * 3. Reddit — r/politics, r/wallstreetbets for reaction
 *
 * Each announcement is categorised, assessed for market impact,
 * and enriched with trade recommendations.
 */

import type { PolicyAnnouncement, PolicyCategory, PolicyAssetImpact, PolicyTrade, PolicyDashboardData, PolicyScenario } from "@/types/policy-tracker";
import { getNewsProvider } from "@/services/news";
import { fetchRSSNews } from "@/services/rss-news";
import { getLeverage, calculateTradeSize } from "@/lib/leverage";
import type { NewsArticle } from "@/types";

// ---------------------------------------------------------------------------
// Policy keyword detection + asset mapping
// ---------------------------------------------------------------------------

interface PolicyRule {
  keywords: string[];
  category: PolicyCategory;
  assets: PolicyAssetImpact[];
}

const POLICY_RULES: PolicyRule[] = [
  {
    keywords: ["tariff", "trade war", "import duty", "trade deal", "trade deficit", "customs"],
    category: "tariffs",
    assets: [
      { symbol: "EUR-USD", name: "EUR/USD", direction: "short", reasoning: "Trade tensions strengthen USD as safe haven", confidence: 72, sector: "FX" },
      { symbol: "GC=F", name: "Gold", direction: "long", reasoning: "Trade uncertainty drives safe haven demand", confidence: 70, sector: "Commodities" },
      { symbol: "SPY", name: "S&P 500", direction: "short", reasoning: "Tariffs raise costs and reduce earnings", confidence: 65, sector: "Equities" },
    ],
  },
  {
    keywords: ["china", "beijing", "chinese", "xi jinping", "ccp"],
    category: "tariffs",
    assets: [
      { symbol: "EUR-USD", name: "EUR/USD", direction: "short", reasoning: "US-China tensions boost dollar", confidence: 68, sector: "FX" },
      { symbol: "NVDA", name: "NVIDIA", direction: "short", reasoning: "China tech restrictions risk", confidence: 62, sector: "Tech" },
      { symbol: "GC=F", name: "Gold", direction: "long", reasoning: "Geopolitical risk premium", confidence: 65, sector: "Commodities" },
    ],
  },
  {
    keywords: ["oil", "drill", "energy", "pipeline", "lng", "petroleum", "opec", "gasoline"],
    category: "energy",
    assets: [
      { symbol: "BZ=F", name: "Brent Crude", direction: "short", reasoning: "Pro-drilling policy increases supply outlook", confidence: 70, sector: "Energy" },
      { symbol: "CL=F", name: "WTI Crude", direction: "short", reasoning: "Domestic production expansion weighs on prices", confidence: 68, sector: "Energy" },
    ],
  },
  {
    keywords: ["iran", "sanctions", "hormuz", "middle east", "israel", "military"],
    category: "foreign_policy",
    assets: [
      { symbol: "BZ=F", name: "Brent Crude", direction: "long", reasoning: "Middle East tensions threaten oil supply", confidence: 75, sector: "Energy" },
      { symbol: "GC=F", name: "Gold", direction: "long", reasoning: "Geopolitical risk drives gold demand", confidence: 72, sector: "Commodities" },
      { symbol: "SPY", name: "S&P 500", direction: "short", reasoning: "Military escalation is risk-off", confidence: 60, sector: "Equities" },
    ],
  },
  {
    keywords: ["tax cut", "tax reform", "corporate tax", "income tax", "fiscal"],
    category: "fiscal",
    assets: [
      { symbol: "SPY", name: "S&P 500", direction: "long", reasoning: "Tax cuts boost corporate earnings", confidence: 73, sector: "Equities" },
      { symbol: "DXY", name: "US Dollar", direction: "long", reasoning: "Fiscal stimulus supports growth and rates", confidence: 65, sector: "FX" },
    ],
  },
  {
    keywords: ["fed", "powell", "interest rate", "federal reserve", "monetary"],
    category: "fed",
    assets: [
      { symbol: "DXY", name: "US Dollar", direction: "long", reasoning: "Trump Fed pressure often backfires — markets price independence", confidence: 60, sector: "FX" },
      { symbol: "GC=F", name: "Gold", direction: "long", reasoning: "Political pressure on Fed creates uncertainty", confidence: 65, sector: "Commodities" },
    ],
  },
  {
    keywords: ["semiconductor", "chip", "ai ", "artificial intelligence", "tiktok", "big tech", "antitrust"],
    category: "tech",
    assets: [
      { symbol: "NVDA", name: "NVIDIA", direction: "long", reasoning: "US tech policy generally favours domestic chipmakers", confidence: 62, sector: "Tech" },
      { symbol: "SPY", name: "S&P 500", direction: "long", reasoning: "Tech sector is largest S&P weight", confidence: 55, sector: "Equities" },
    ],
  },
  {
    keywords: ["nato", "ukraine", "russia", "defence", "defense", "military spending", "weapons"],
    category: "defence",
    assets: [
      { symbol: "GC=F", name: "Gold", direction: "long", reasoning: "Geopolitical uncertainty supports gold", confidence: 68, sector: "Commodities" },
      { symbol: "EUR-USD", name: "EUR/USD", direction: "short", reasoning: "European defence concerns weaken euro", confidence: 60, sector: "FX" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Classify a news article as a policy announcement
// ---------------------------------------------------------------------------

function classifyArticle(article: NewsArticle): PolicyAnnouncement | null {
  const text = `${article.title} ${article.summary}`.toLowerCase();

  // Must be Trump/White House related
  const isPolicyRelated = ["trump", "white house", "president", "administration", "executive order", "truth social"].some(kw => text.includes(kw));
  if (!isPolicyRelated) return null;

  // Find matching policy rules
  let bestRule: PolicyRule | null = null;
  let bestMatchCount = 0;

  for (const rule of POLICY_RULES) {
    const matchCount = rule.keywords.filter(kw => text.includes(kw)).length;
    if (matchCount > bestMatchCount) {
      bestMatchCount = matchCount;
      bestRule = rule;
    }
  }

  const category: PolicyCategory = bestRule?.category ?? "other";
  const assets = bestRule?.assets ?? [];

  // Determine impact
  const hasHighImpactWords = ["tariff", "sanction", "war", "executive order", "ban", "emergency"].some(w => text.includes(w));
  const impact = hasHighImpactWords ? "high" as const : bestMatchCount >= 2 ? "medium" as const : "low" as const;

  // Determine sentiment
  const bullishWords = ["deal", "agreement", "cut tax", "boost", "growth", "strong"];
  const bearishWords = ["tariff", "war", "sanction", "ban", "threat", "crisis", "crash"];
  const bullCount = bullishWords.filter(w => text.includes(w)).length;
  const bearCount = bearishWords.filter(w => text.includes(w)).length;
  const sentiment = bullCount > bearCount ? "bullish" as const : bearCount > bullCount ? "bearish" as const : "mixed" as const;

  const pubDate = new Date(article.publishedAt);
  const isWeekend = pubDate.getDay() === 0 || pubDate.getDay() === 6;
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return {
    id: `policy-${article.id}`,
    title: article.title,
    summary: article.summary || "",
    source: article.source.toLowerCase().includes("truth") ? "truth_social" : article.source.toLowerCase().includes("white house") ? "white_house" : "reuters",
    sourceUrl: article.url,
    category,
    publishedAt: article.publishedAt,
    impact,
    affectedAssets: assets,
    sentiment,
    marketMoving: impact === "high",
    isWeekend,
    dayLabel: DAYS[pubDate.getDay()],
    timeLabel: pubDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  };
}

// ---------------------------------------------------------------------------
// Build trade recommendation from policy announcement
// ---------------------------------------------------------------------------

function buildPolicyTrade(announcement: PolicyAnnouncement): PolicyTrade | null {
  const topAsset = announcement.affectedAssets[0];
  if (!topAsset) return null;

  const lev = getLeverage(topAsset.symbol);
  const stopPct = topAsset.symbol.includes("-USD") && !topAsset.symbol.includes("BTC") ? 0.5 : 2;
  const targetPct = stopPct * 2;
  const tradeAmount = 1000;
  const size = calculateTradeSize(topAsset.symbol, tradeAmount, 0, stopPct);

  const timing = announcement.isWeekend
    ? "Monday market open — announcement was made over the weekend"
    : "Now — monitor for 15 minutes then enter if direction confirmed";

  return {
    asset: topAsset.symbol,
    assetName: topAsset.name,
    direction: topAsset.direction,
    thesis: topAsset.reasoning,
    timing,
    stopLossPercent: stopPct,
    takeProfitPercent: targetPct,
    leverage: lev.leverage,
    tradeAmount,
    exposure: size.exposure,
    maxWin: +(size.exposure * targetPct / 100).toFixed(0),
    maxLoss: size.maxLoss,
    riskReward: +(targetPct / stopPct).toFixed(1),
    confidence: topAsset.confidence,
  };
}

// ---------------------------------------------------------------------------
// Fetch + classify + enrich
// ---------------------------------------------------------------------------

let cache: { data: PolicyDashboardData; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function getPolicyDashboard(): Promise<PolicyDashboardData> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) return cache.data;

  const newsProvider = getNewsProvider();

  // Fetch from multiple sources in parallel
  const [trumpNews, policyNews, rssNews] = await Promise.all([
    newsProvider.getNews("Trump tariff trade policy", 15).catch(() => []),
    newsProvider.getNews("White House executive order announcement", 10).catch(() => []),
    fetchRSSNews(20).catch(() => []),
  ]);

  // Merge and deduplicate
  const seen = new Set<string>();
  const allArticles: NewsArticle[] = [];
  for (const a of [...trumpNews, ...policyNews, ...rssNews]) {
    const key = a.title.toLowerCase().slice(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);
    allArticles.push(a);
  }

  // Classify as policy announcements
  const announcements = allArticles
    .map(classifyArticle)
    .filter((a): a is PolicyAnnouncement => a !== null)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // Generate trade recommendations for high-impact announcements
  const activeTrades = announcements
    .filter(a => a.impact === "high" || a.impact === "medium")
    .map(buildPolicyTrade)
    .filter((t): t is PolicyTrade => t !== null)
    .slice(0, 5);

  // Sentiment pulse
  const bullish = announcements.filter(a => a.sentiment === "bullish").length;
  const bearish = announcements.filter(a => a.sentiment === "bearish").length;
  const total = announcements.length || 1;
  const sentimentScore = Math.round(((bullish - bearish) / total) * 100);

  // Weekend alert
  const now = new Date();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6 || (now.getDay() === 5 && now.getHours() >= 17);
  const weekendAnnouncements = announcements.filter(a => a.isWeekend);

  // Patterns
  const patterns = [
    { name: "Friday evening drop", description: "Policy announcements made after market close on Friday, causing Monday gaps", frequency: "Occurs regularly", avgImpact: "0.5-2% gap on affected assets", lastOccurrence: weekendAnnouncements[0]?.publishedAt ?? "None recent" },
    { name: "Tweet storm volatility", description: "Multiple rapid-fire statements increase intraday volatility", frequency: "Weekly", avgImpact: "Elevated VIX, wider spreads", lastOccurrence: "Ongoing" },
    { name: "Policy reversal", description: "Harsh statement followed by softer walk-back within 48-72 hours", frequency: "Common", avgImpact: "Initial move partially reversed", lastOccurrence: "Check recent feed" },
  ];

  // Brief
  const highImpact = announcements.filter(a => a.impact === "high");
  const brief = highImpact.length > 0
    ? `${highImpact.length} high-impact policy ${highImpact.length === 1 ? "announcement" : "announcements"} detected. ${activeTrades.length} trade ${activeTrades.length === 1 ? "opportunity" : "opportunities"} identified. Sentiment: ${sentimentScore > 20 ? "bullish" : sentimentScore < -20 ? "bearish" : "mixed"}.`
    : `${announcements.length} policy-related items tracked. No high-impact announcements right now.`;

  const data: PolicyDashboardData = {
    announcements: announcements.slice(0, 20),
    activeTrades,
    sentimentPulse: {
      overall: sentimentScore > 20 ? "bullish" : sentimentScore < -20 ? "bearish" : "mixed",
      score: sentimentScore,
      sources: [
        { name: "News", sentiment: sentimentScore > 0 ? "bullish" : "bearish", volume: announcements.length },
      ],
    },
    weekendAlert: isWeekend && weekendAnnouncements.length > 0,
    patterns,
    brief,
    updatedAt: new Date().toISOString(),
  };

  cache = { data, fetchedAt: Date.now() };
  return data;
}
