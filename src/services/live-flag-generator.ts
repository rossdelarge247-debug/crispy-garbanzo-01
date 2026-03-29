/**
 * Live Flag Generator
 *
 * Scans news articles from connected providers, clusters them into
 * market themes, scores each theme by volume/recency/sentiment,
 * and generates MarketFlag + Hypothesis objects dynamically.
 *
 * No AI API key required — uses keyword-based theme detection,
 * article frequency scoring, and rules-based hypothesis generation.
 */

import type {
  MarketFlag,
  MarketFlagDetail,
  Hypothesis,
  AffectedAsset,
  AssetClass,
  Direction,
  TimelineEvent,
  NewsArticle,
} from "@/types";
import { getNewsProvider } from "@/services/news";
import { getCalendarProvider } from "@/services/calendar";
import { getSocialSentiment, type CompositeSocialSentiment } from "@/services/social-sentiment";
import { analyseFlagWithAI, type AIFlagAnalysis } from "@/services/ai-flag-analysis";

// ---------------------------------------------------------------------------
// Theme definitions — each theme maps keywords to a market situation
// ---------------------------------------------------------------------------

interface ThemeDefinition {
  id: string;
  name: string;
  category: string;
  searchQueries: string[];        // queries to fetch news for
  keywords: string[];             // keywords that match articles to this theme
  assets: AffectedAsset[];
  baseHypotheses: {
    title: string;
    direction: Direction;
    summary: string;
    rationale: string;
    invalidation: string;
    suggestedAction: string;
    baseConfidence: number;       // adjusted by article count/sentiment
  }[];
}

const THEMES: ThemeDefinition[] = [
  {
    id: "energy-geopolitical",
    name: "Energy & Geopolitical Risk",
    category: "Geopolitical / Energy",
    searchQueries: ["oil crude opec", "oil geopolitical conflict", "brent crude price"],
    keywords: ["oil", "crude", "brent", "opec", "petroleum", "energy", "barrel", "refinery", "pipeline", "sanctions", "middle east", "iran", "russia", "supply disruption", "shipping", "tanker"],
    assets: [
      { symbol: "BZ=F", name: "Brent Crude", assetClass: "commodity", direction: "long", impact: "primary" },
      { symbol: "XOM", name: "Exxon Mobil", assetClass: "equity", direction: "long", impact: "secondary" },
      { symbol: "USO", name: "US Oil Fund", assetClass: "equity", direction: "long", impact: "secondary" },
    ],
    baseHypotheses: [
      {
        title: "Supply pressure drives prices higher",
        direction: "long",
        summary: "Ongoing supply constraints and geopolitical risk premiums could push crude oil prices higher in the near term.",
        rationale: "When supply disruptions persist and OPEC maintains discipline, crude tends to trend higher. The current news cluster suggests sustained pressure on supply chains.",
        invalidation: "Diplomatic resolution or surprise OPEC production increase",
        suggestedAction: "Review energy exposure and monitor for confirmation",
        baseConfidence: 55,
      },
      {
        title: "Volatility spike without clear direction",
        direction: "neutral",
        summary: "Elevated headline risk may increase price volatility without establishing a clear trend.",
        rationale: "Geopolitical situations often create two-sided risk — prices can spike on escalation but reverse sharply on de-escalation signals.",
        invalidation: "Clear breakout above or below recent range",
        suggestedAction: "Monitor volatility and avoid directional bets",
        baseConfidence: 40,
      },
    ],
  },
  {
    id: "crypto-sentiment",
    name: "Crypto Market Sentiment",
    category: "Crypto / Sentiment",
    searchQueries: ["bitcoin crypto", "bitcoin ETF price", "ethereum crypto market"],
    keywords: ["bitcoin", "btc", "ethereum", "eth", "crypto", "cryptocurrency", "blockchain", "defi", "nft", "stablecoin", "binance", "coinbase", "etf", "halving", "mining"],
    assets: [
      { symbol: "BTC-USD", name: "Bitcoin", assetClass: "crypto", direction: "long", impact: "primary" },
      { symbol: "ETH-USD", name: "Ethereum", assetClass: "crypto", direction: "long", impact: "secondary" },
      { symbol: "COIN", name: "Coinbase", assetClass: "equity", direction: "long", impact: "secondary" },
    ],
    baseHypotheses: [
      {
        title: "Sentiment recovery drives rally",
        direction: "long",
        summary: "Positive news flow and returning institutional interest could drive crypto prices higher.",
        rationale: "Crypto markets are heavily sentiment-driven. A sustained cluster of positive headlines often precedes price rallies, especially when combined with ETF inflows.",
        invalidation: "Regulatory crackdown or major exchange failure",
        suggestedAction: "Monitor sentiment indicators and ETF flow data",
        baseConfidence: 50,
      },
      {
        title: "Negative sentiment pressures prices lower",
        direction: "short",
        summary: "Bearish headlines and regulatory concerns could push crypto prices down.",
        rationale: "Crypto is sensitive to negative sentiment cascades. Regulatory news, security incidents, or macro risk-off moves can trigger sharp selloffs.",
        invalidation: "Major positive catalyst (ETF approval, institutional adoption)",
        suggestedAction: "Reduce exposure or hedge positions",
        baseConfidence: 40,
      },
    ],
  },
  {
    id: "fx-macro",
    name: "USD & Macro Policy",
    category: "Macro / FX",
    searchQueries: ["federal reserve interest rate", "dollar currency forex", "ECB monetary policy"],
    keywords: ["dollar", "fed", "federal reserve", "interest rate", "monetary policy", "inflation", "cpi", "employment", "jobs", "nonfarm", "payroll", "ecb", "boj", "central bank", "rate cut", "rate hike", "hawkish", "dovish", "treasury", "yield", "bond"],
    assets: [
      { symbol: "DXY", name: "Dollar Index", assetClass: "index", direction: "long", impact: "primary" },
      { symbol: "EUR-USD", name: "Euro", assetClass: "forex", direction: "short", impact: "secondary" },
      { symbol: "GBP-USD", name: "British Pound", assetClass: "forex", direction: "short", impact: "secondary" },
      { symbol: "USD-JPY", name: "Japanese Yen", assetClass: "forex", direction: "long", impact: "secondary" },
    ],
    baseHypotheses: [
      {
        title: "Dollar strengthens on hawkish policy",
        direction: "long",
        summary: "Hawkish Fed messaging and strong economic data could extend dollar strength against major currencies.",
        rationale: "When the Fed signals higher-for-longer rates while other central banks ease, the interest rate differential favors the dollar.",
        invalidation: "Dovish Fed pivot or significantly weak US economic data",
        suggestedAction: "Review FX exposure and consider dollar-positive positioning",
        baseConfidence: 50,
      },
      {
        title: "Dollar weakens on dovish shift",
        direction: "short",
        summary: "Signs of economic cooling or dovish Fed language could reverse recent dollar strength.",
        rationale: "Markets are forward-looking — even hints of a policy shift can cause rapid dollar unwinding, especially if positioned heavily long.",
        invalidation: "Continued hot inflation data or global risk-off event",
        suggestedAction: "Monitor Fed communications and economic data releases",
        baseConfidence: 35,
      },
    ],
  },
  {
    id: "tech-ai",
    name: "Technology & AI",
    category: "Technology / AI",
    searchQueries: ["artificial intelligence AI tech", "semiconductor chip nvidia", "tech earnings big tech"],
    keywords: ["ai", "artificial intelligence", "nvidia", "semiconductor", "chip", "openai", "google", "microsoft", "apple", "amazon", "meta", "tech", "technology", "earnings", "cloud", "data center", "gpu"],
    assets: [
      { symbol: "NVDA", name: "NVIDIA", assetClass: "equity", direction: "long", impact: "primary" },
      { symbol: "MSFT", name: "Microsoft", assetClass: "equity", direction: "long", impact: "secondary" },
      { symbol: "GOOGL", name: "Alphabet", assetClass: "equity", direction: "long", impact: "secondary" },
    ],
    baseHypotheses: [
      {
        title: "AI momentum continues lifting tech",
        direction: "long",
        summary: "Sustained AI investment and strong earnings could continue driving tech valuations higher.",
        rationale: "The AI capex cycle shows no signs of slowing. Companies are increasing AI spend, and beneficiaries like NVIDIA continue to beat expectations.",
        invalidation: "AI spending pullback or major earnings miss from a bellwether",
        suggestedAction: "Evaluate tech exposure and AI-adjacent opportunities",
        baseConfidence: 50,
      },
      {
        title: "Valuation correction as hype fades",
        direction: "short",
        summary: "Overextended valuations and unrealistic AI expectations could trigger a pullback in tech stocks.",
        rationale: "When expectations outpace reality, corrections follow. Elevated P/E ratios in AI-related stocks leave little margin for disappointment.",
        invalidation: "Accelerating revenue growth that justifies current valuations",
        suggestedAction: "Tighten stops and watch for earnings disappointments",
        baseConfidence: 30,
      },
    ],
  },
  {
    id: "global-risk",
    name: "Global Risk & Volatility",
    category: "Risk / Volatility",
    searchQueries: ["market volatility risk", "recession fears economy", "trade war tariffs"],
    keywords: ["recession", "volatility", "vix", "risk", "crash", "selloff", "bear market", "correction", "tariff", "trade war", "default", "debt ceiling", "crisis", "contagion", "bank failure"],
    assets: [
      { symbol: "SPY", name: "S&P 500 ETF", assetClass: "equity", direction: "short", impact: "primary" },
      { symbol: "VIX", name: "Volatility Index", assetClass: "index", direction: "long", impact: "secondary" },
      { symbol: "TLT", name: "Treasury Bond ETF", assetClass: "bond", direction: "long", impact: "secondary" },
    ],
    baseHypotheses: [
      {
        title: "Risk-off environment deepens",
        direction: "short",
        summary: "Growing economic concerns and market stress could trigger a broader risk-off move across equities.",
        rationale: "When fear headlines cluster, institutional investors reduce exposure. This creates selling pressure that can become self-reinforcing.",
        invalidation: "Positive economic surprise or decisive policy intervention",
        suggestedAction: "Review portfolio risk exposure and consider defensive positioning",
        baseConfidence: 45,
      },
      {
        title: "Fear is overblown — markets stabilize",
        direction: "long",
        summary: "Market concerns may be overstated, and a stabilization or bounce could follow once panic subsides.",
        rationale: "Markets often overshoot on fear. If economic fundamentals hold and the situation doesn't escalate, a relief rally is likely.",
        invalidation: "Confirmed economic deterioration or systemic event",
        suggestedAction: "Wait for stabilization signals before adding risk",
        baseConfidence: 35,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

function countKeywordMatches(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.filter(kw => lower.includes(kw.toLowerCase())).length;
}

function scoreTheme(
  articles: NewsArticle[],
  theme: ThemeDefinition
): { score: number; matchedArticles: NewsArticle[]; topKeywords: string[] } {
  const matched: NewsArticle[] = [];
  const keywordCounts: Record<string, number> = {};

  for (const article of articles) {
    const text = `${article.title} ${article.summary}`;
    const hits = countKeywordMatches(text, theme.keywords);
    if (hits > 0) {
      matched.push(article);
      for (const kw of theme.keywords) {
        if (text.toLowerCase().includes(kw.toLowerCase())) {
          keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
        }
      }
    }
  }

  if (matched.length === 0) return { score: 0, matchedArticles: [], topKeywords: [] };

  // Score: article volume (0-40) + keyword diversity (0-30) + recency (0-30)
  const volumeScore = Math.min(matched.length * 5, 40);

  const uniqueKeywords = Object.keys(keywordCounts).length;
  const diversityScore = Math.min(uniqueKeywords * 5, 30);

  // Recency: how many articles are from the last 48 hours
  const now = Date.now();
  const recentCount = matched.filter(a => {
    const articleTime = new Date(a.publishedAt).getTime();
    return now - articleTime < 48 * 60 * 60 * 1000;
  }).length;
  const recencyScore = Math.min(recentCount * 6, 30);

  const score = volumeScore + diversityScore + recencyScore;

  const topKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([kw]) => kw);

  return { score, matchedArticles: matched, topKeywords };
}

function determineStatus(score: number): MarketFlag["status"] {
  if (score >= 70) return "active";
  if (score >= 50) return "emerging";
  if (score >= 30) return "maturing";
  return "emerging";
}

function determineConvictionLevel(score: number): MarketFlag["convictionLevel"] {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// Build MarketFlag from a scored theme
// ---------------------------------------------------------------------------

function buildFlag(
  theme: ThemeDefinition,
  score: number,
  matchedArticles: NewsArticle[],
  topKeywords: string[],
  socialSentiment?: CompositeSocialSentiment,
  aiAnalysis?: AIFlagAnalysis
): MarketFlagDetail {
  const now = new Date().toISOString();
  // Boost conviction when social sentiment confirms the theme
  let convictionBoost = 0;
  if (socialSentiment) {
    if (Math.abs(socialSentiment.compositeScore) > 30) convictionBoost += 8;
    if (socialSentiment.agreement > 70) convictionBoost += 5;
    if (socialSentiment.signals.filter(s => s.volume > 0).length >= 2) convictionBoost += 5;
  }
  const convictionScore = Math.min(Math.round(score + convictionBoost), 95);

  // Build action-oriented title
  const topArticles = matchedArticles.slice(0, 5);
  const articleTitles = topArticles.map(a => a.title).filter(Boolean);

  // Determine sentiment direction for title
  const avgNewsSentiment = matchedArticles.length > 0
    ? matchedArticles.reduce((sum, a) => sum + a.sentiment, 0) / matchedArticles.length
    : 0;
  const socialDirection = socialSentiment?.compositeScore || 0;
  const combinedDirection = avgNewsSentiment * 100 * 0.5 + socialDirection * 0.5;

  // Generate action-oriented titles per theme
  const titleTemplates: Record<string, { bullish: string; bearish: string; neutral: string }> = {
    "energy-geopolitical": {
      bullish: "Oil prices climbing — energy longs and inflation hedges in play",
      bearish: "Oil under pressure — potential short or defensive energy positioning",
      neutral: "Oil volatility elevated — watch for breakout direction before acting",
    },
    "crypto-sentiment": {
      bullish: "Crypto sentiment turning positive — BTC and ETH showing strength",
      bearish: "Crypto sentiment weakening — consider reducing exposure or hedging",
      neutral: "Crypto in consolidation — range-bound strategies may work here",
    },
    "fx-macro": {
      bullish: "Dollar strengthening — FX trades favoring USD longs and EUR/GBP shorts",
      bearish: "Dollar weakening — look at USD shorts and commodity currency longs",
      neutral: "Currency markets directionless — wait for central bank catalyst",
    },
    "tech-ai": {
      bullish: "AI and tech momentum building — semiconductor and cloud names in focus",
      bearish: "Tech sector showing strain — rotation risk and valuation concerns rising",
      neutral: "Tech mixed — selective opportunities but no broad sector bet",
    },
    "global-risk": {
      bullish: "Risk appetite returning — equities and growth assets may benefit",
      bearish: "Risk-off signals building — consider defensive positioning and safe havens",
      neutral: "Markets uncertain — elevated volatility but no clear direction",
    },
  };

  const templates = titleTemplates[theme.id] || {
    bullish: `${theme.name} — bullish signals suggest opportunity`,
    bearish: `${theme.name} — bearish signals warrant caution`,
    neutral: `${theme.name} — mixed signals, monitor before acting`,
  };

  // Use AI analysis when available — falls back to templates
  const title = aiAnalysis
    ? aiAnalysis.situationTitle
    : combinedDirection > 15 ? templates.bullish :
      combinedDirection < -15 ? templates.bearish :
      templates.neutral;

  const summary = aiAnalysis
    ? aiAnalysis.situationSummary
    : matchedArticles.length >= 3
      ? `${matchedArticles.length} articles across multiple sources point to a developing situation. ${topKeywords.slice(0, 3).map(kw => kw.charAt(0).toUpperCase() + kw.slice(1)).join(", ")} are the dominant themes. The data suggests this could present a tradeable opportunity within the ${convictionScore >= 60 ? "next 1-2 weeks" : "coming days"}.`
      : `Early signals detected around ${topKeywords.slice(0, 2).join(" and ")}. Not yet enough data for high conviction, but worth monitoring for follow-through.`;

  const whyItMatters = aiAnalysis
    ? `**What the market is pricing:** ${aiAnalysis.whatMarketIsPricing}\n\n**What the market is missing:** ${aiAnalysis.whatMarketIsMissing}\n\n**The key question:** ${aiAnalysis.keyQuestion}`
    : `When news clusters around a theme like ${theme.name.toLowerCase()}, it often signals a developing market situation. ${matchedArticles.length} articles from multiple sources in a short window suggests this isn't isolated noise — it's a pattern worth tracking.`;

  // Override conviction with AI assessment when available
  if (aiAnalysis && aiAnalysis.source === "ai") {
    // Blend: 60% AI conviction + 40% data-driven conviction
    const blendedConviction = Math.round(aiAnalysis.conviction * 0.6 + convictionScore * 0.4);
    // TypeScript won't let us reassign const, so we use the blended value below
    Object.assign({ convictionScore: blendedConviction }); // placeholder — actual assignment below
  }
  const finalConviction = aiAnalysis?.source === "ai"
    ? Math.min(Math.round(aiAnalysis.conviction * 0.6 + convictionScore * 0.4), 95)
    : convictionScore;

  const whatChanged = articleTitles.length > 0
    ? aiAnalysis
      ? `${aiAnalysis.convictionRationale} Recent: "${articleTitles[0]}"${articleTitles.length > 1 ? ` and ${articleTitles.length - 1} more` : ""}.`
      : `Recent headline activity: "${articleTitles[0]}"${articleTitles.length > 1 ? ` and ${articleTitles.length - 1} more articles` : ""}. This represents a concentration of coverage that stands out from normal news flow.`
    : "Elevated news activity detected across multiple sources.";

  // Build timeline from articles
  const timeline: TimelineEvent[] = topArticles.map(a => ({
    date: a.publishedAt,
    title: a.title,
    description: a.summary || "News article related to this market theme.",
    impact: a.sentiment > 0.2 ? "positive" as const : a.sentiment < -0.2 ? "negative" as const : "neutral" as const,
    source: a.source,
  }));

  // Sentiment from articles + social sources (reuse avgNewsSentiment from above)
  const newsSentimentScore = Math.round(avgNewsSentiment * 100);

  // Blend news sentiment with social sentiment if available
  const sentimentScore = socialSentiment
    ? Math.round(socialSentiment.compositeScore * 0.6 + newsSentimentScore * 0.4)
    : newsSentimentScore;

  const sentimentLabel = sentimentScore > 20 ? "bullish" : sentimentScore < -20 ? "bearish" : "mixed";

  // Build rich sentiment summary from social sources
  const socialDetails = socialSentiment
    ? socialSentiment.signals
        .filter(s => s.volume > 0 && s.source !== "composite")
        .map(s => `${s.source === "reddit" ? "Reddit" : s.source === "stocktwits" ? "StockTwits" : "Fear & Greed"}: ${s.label}`)
        .join(" · ")
    : null;

  const agreementNote = socialSentiment && socialSentiment.agreement > 60
    ? "Sources broadly agree on direction."
    : socialSentiment && socialSentiment.agreement < 40
      ? "Sources are conflicted — mixed signals."
      : "";

  const sentimentSummary = socialDetails
    ? `Composite sentiment is ${sentimentLabel} (score: ${sentimentScore}) based on news (${matchedArticles.length} articles) and social signals. ${socialDetails}. ${agreementNote}`
    : `Aggregate sentiment across ${matchedArticles.length} articles is ${sentimentLabel} (score: ${sentimentScore}). ${
        sentimentScore > 20
          ? "The tone of recent coverage is predominantly positive, suggesting market optimism."
          : sentimentScore < -20
            ? "The tone of recent coverage skews negative, suggesting market concern."
            : "Coverage is mixed, with both positive and negative signals present."
      }`;

  // Adjust asset directions based on sentiment
  const assets = theme.assets.map(a => ({
    ...a,
    direction: (sentimentScore < -20 && a.direction === "long" ? "short" :
                sentimentScore > 20 && a.direction === "short" ? "long" :
                a.direction) as Direction,
  }));

  return {
    id: `live-${theme.id}`,
    title,
    summary,
    whyItMatters,
    convictionScore: finalConviction,
    convictionLevel: determineConvictionLevel(finalConviction),
    status: determineStatus(finalConviction),
    timeHorizon: finalConviction >= 60 ? "weeks" : "days",
    timeHorizonDays: finalConviction >= 60 ? 14 : 7,
    affectedAssets: assets,
    drivers: topKeywords.map(kw => kw.charAt(0).toUpperCase() + kw.slice(1)),
    category: theme.category,
    suggestedAction: convictionScore >= 60
      ? "Investigate further → explore hypotheses and run tests"
      : "Monitor — keep watching for more confirming signals",
    createdAt: now,
    updatedAt: now,
    whatChanged,
    timeline,
    sentimentSummary,
    sentimentScore,
    priceContext: `Based on ${matchedArticles.length} recent news articles. Connect a market data provider (Polygon/Massive) for live price data.`,
    supportingEvidence: [
      ...articleTitles.map(t => `"${t}"`).slice(0, 4),
      ...(socialSentiment?.signals
        .filter(s => s.volume > 0 && s.samplePosts.length > 0 && s.source !== "composite")
        .flatMap(s => s.samplePosts.slice(0, 1).map(p => `[${s.source}] ${p}`)) || []),
    ],
  };
}

// ---------------------------------------------------------------------------
// Build Hypotheses from a scored theme
// ---------------------------------------------------------------------------

function buildHypotheses(
  theme: ThemeDefinition,
  flag: MarketFlag,
  matchedArticles: NewsArticle[],
  aiAnalysis?: AIFlagAnalysis
): Hypothesis[] {
  // If AI analysis produced scenarios, use those instead of templates
  if (aiAnalysis?.source === "ai" && aiAnalysis.scenarios.length > 0) {
    return aiAnalysis.scenarios.map((scenario, i) => ({
      id: `live-hyp-${theme.id}-ai-${i}`,
      flagId: flag.id,
      title: scenario.title,
      direction: scenario.direction,
      summary: `${scenario.priceImpact}. Timeframe: ${scenario.timeframe}.`,
      rationale: `Trigger: ${scenario.trigger}. Based on AI analysis of ${matchedArticles.length} recent articles.`,
      confidenceScore: Math.max(10, Math.min(90, scenario.probability)),
      invalidation: scenario.invalidation,
      timeHorizon: flag.timeHorizon,
      timeHorizonDays: flag.timeHorizonDays,
      status: "active" as const,
      suggestedAction: scenario.probability >= 50
        ? "Investigate further and run scenario test"
        : "Monitor — this scenario needs a specific trigger",
      createdAt: new Date().toISOString(),
    }));
  }

  // Fallback: template-based hypotheses
  const avgSentiment = matchedArticles.length > 0
    ? matchedArticles.reduce((sum, a) => sum + a.sentiment, 0) / matchedArticles.length
    : 0;

  return theme.baseHypotheses.map((base, i) => {
    // Adjust confidence based on article volume and sentiment alignment
    let confidence = base.baseConfidence;

    // More articles = more conviction
    confidence += Math.min(matchedArticles.length * 2, 15);

    // Sentiment alignment bonus
    if (base.direction === "long" && avgSentiment > 0.1) confidence += 10;
    if (base.direction === "short" && avgSentiment < -0.1) confidence += 10;
    if (base.direction === "long" && avgSentiment < -0.2) confidence -= 10;
    if (base.direction === "short" && avgSentiment > 0.2) confidence -= 10;

    confidence = Math.max(10, Math.min(90, confidence));

    return {
      id: `live-hyp-${theme.id}-${i}`,
      flagId: flag.id,
      title: base.title,
      direction: base.direction,
      summary: base.summary,
      rationale: base.rationale + ` (Based on ${matchedArticles.length} recent articles.)`,
      confidenceScore: confidence,
      invalidation: base.invalidation,
      timeHorizon: flag.timeHorizon,
      timeHorizonDays: flag.timeHorizonDays,
      status: "active" as const,
      suggestedAction: base.suggestedAction,
      createdAt: new Date().toISOString(),
    };
  });
}

// ---------------------------------------------------------------------------
// Main: scan news and generate live flags
// ---------------------------------------------------------------------------

export async function generateLiveFlags(focusSymbols?: string[]): Promise<{
  flags: MarketFlagDetail[];
  hypotheses: Hypothesis[];
}> {
  const newsProvider = getNewsProvider();

  // Filter themes to user's focus universe if provided
  let activeThemes = THEMES;
  if (focusSymbols && focusSymbols.length > 0) {
    const focusSet = new Set(focusSymbols.map(s => s.toLowerCase()));
    activeThemes = THEMES.filter(theme =>
      theme.assets.some(asset =>
        focusSet.has(asset.symbol.toLowerCase()) ||
        theme.keywords.some(kw => focusSymbols.some(fs => fs.toLowerCase().includes(kw.toLowerCase())))
      )
    );
    // Fall back to all themes if filtering removes everything
    if (activeThemes.length === 0) activeThemes = THEMES;
  }

  // Fetch news across active theme queries in parallel
  const allArticles: NewsArticle[] = [];
  const allQueries = activeThemes.flatMap(t => t.searchQueries);

  // Deduplicate queries and fetch
  const uniqueQueries = [...new Set(allQueries)];
  const results = await Promise.all(
    uniqueQueries.map(q => newsProvider.getNews(q, 15))
  );

  // Flatten and deduplicate articles
  const seen = new Set<string>();
  for (const batch of results) {
    for (const article of batch) {
      if (!seen.has(article.id)) {
        seen.add(article.id);
        allArticles.push(article);
      }
    }
  }

  if (allArticles.length === 0) {
    return { flags: [], hypotheses: [] };
  }

  // Score each theme against the article pool
  const scoredThemes = activeThemes.map(theme => ({
    theme,
    ...scoreTheme(allArticles, theme),
  }))
    .filter(t => t.score > 15) // minimum threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // top 5 flags max

  const flags: MarketFlagDetail[] = [];
  const hypotheses: Hypothesis[] = [];

  // Fetch social sentiment + AI analysis in parallel for each scored theme
  const [socialResults, aiResults] = await Promise.all([
    // Social sentiment per theme
    Promise.all(
      scoredThemes.map(({ theme, matchedArticles }) => {
        const primaryAsset = theme.assets.find(a => a.impact === "primary");
        const avgNewsSentiment = matchedArticles.length > 0
          ? Math.round((matchedArticles.reduce((s, a) => s + a.sentiment, 0) / matchedArticles.length) * 100)
          : undefined;
        return primaryAsset
          ? getSocialSentiment(primaryAsset.symbol, theme.searchQueries[0], avgNewsSentiment)
          : Promise.resolve(undefined);
      })
    ),
    // AI analysis per theme (Claude reads the actual articles)
    Promise.all(
      scoredThemes.map(({ theme, matchedArticles }) =>
        analyseFlagWithAI(
          theme.name,
          theme.category,
          matchedArticles,
          theme.assets.map(a => a.symbol)
        ).catch(() => undefined)
      )
    ),
  ]);

  for (let i = 0; i < scoredThemes.length; i++) {
    const { theme, score, matchedArticles, topKeywords } = scoredThemes[i];
    const socialSentiment = socialResults[i];
    const aiAnalysis = aiResults[i];

    const flag = buildFlag(theme, score, matchedArticles, topKeywords, socialSentiment, aiAnalysis);
    flags.push(flag);

    const hyps = buildHypotheses(theme, flag, matchedArticles, aiAnalysis);
    hypotheses.push(...hyps);
  }

  return { flags, hypotheses };
}
