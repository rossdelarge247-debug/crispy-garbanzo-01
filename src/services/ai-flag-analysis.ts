/**
 * AI Flag Analysis — deep scenario analysis powered by Claude
 *
 * This is where the depth lives. Claude receives:
 * - The actual content of news articles (not just headlines)
 * - The asset context and market theme
 *
 * And produces:
 * - A specific situation assessment (not generic "energy risk")
 * - Decomposed scenarios: e.g., "US deploys naval escort" vs
 *   "diplomatic resolution" vs "escalation to nuclear standoff"
 *   — each with different market reactions, probabilities, triggers
 * - What the market is pricing in vs what it's missing
 * - The key question whose answer determines the trade
 * - A top trade recommendation (or null if conviction is too low)
 *
 * Falls back to rules-based analysis without ANTHROPIC_API_KEY.
 */

import type { NewsArticle, Direction } from "@/types";
import { fetchArticleContents } from "@/services/article-reader";
import { fetchWithCache, FEED_CONFIGS } from "@/services/feed-cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AIScenario {
  title: string;
  direction: Direction;
  probability: number;
  trigger: string;
  consequence: string;          // what happens to markets and why
  priceImpact: string;
  timeframe: string;
  invalidation: string;
}

export interface AIFlagAnalysis {
  situationTitle: string;
  situationSummary: string;
  whatMarketIsPricing: string;
  whatMarketIsMissing: string;
  keyQuestion: string;
  scenarios: AIScenario[];
  conviction: number;
  convictionRationale: string;
  topTrade: {
    asset: string;
    direction: Direction;
    thesis: string;
    entry: string;
    risk: string;
  } | null;
  source: "ai" | "rules";
}

// ---------------------------------------------------------------------------
// Claude-powered deep analysis
// ---------------------------------------------------------------------------

async function analyseWithClaude(
  themeName: string,
  category: string,
  articles: NewsArticle[],
  assetSymbols: string[]
): Promise<AIFlagAnalysis | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  // Fetch actual article content (not just headlines)
  const articleContents = await fetchArticleContents(
    articles.slice(0, 6).map(a => ({ url: a.url, title: a.title })),
    5
  );

  // Build rich context: articles with content where available
  const articleText = articles.slice(0, 10).map((a, i) => {
    const content = articleContents.find(c => c.url === a.url);
    if (content?.success) {
      return `ARTICLE ${i + 1}: "${a.title}" — ${a.source}\n${content.text}`;
    }
    return `ARTICLE ${i + 1}: "${a.title}" — ${a.source}${a.summary ? `\n${a.summary}` : ""}`;
  }).join("\n\n---\n\n");

  const articlesWithContent = articleContents.filter(c => c.success).length;

  const prompt = `You are a senior geopolitical and macro analyst advising a hedge fund's trading desk. You have deep expertise in how political decisions, military actions, and policy changes translate into specific market moves.

You have been given ${articles.length} recent news articles (${articlesWithContent} with full content) about ${themeName}. Read them carefully. Your job is NOT to summarise the news — it is to DECOMPOSE the situation into distinct scenarios that would each produce different market outcomes.

THEME: ${themeName}
CATEGORY: ${category}
TRADEABLE ASSETS: ${assetSymbols.join(", ")}

NEWS ARTICLES:
${articleText}

RESPOND IN THIS EXACT JSON FORMAT (raw JSON, no markdown):
{
  "situationTitle": "A specific, detailed title. NOT 'geopolitical tensions' — instead 'US weighing military options in Strait of Hormuz as Iran accelerates enrichment'. Be precise about WHAT is happening.",

  "situationSummary": "3-4 sentences. What is the SPECIFIC situation, who are the actors, what are they deciding, and what's at stake for these markets. Write for an intelligent non-expert.",

  "whatMarketIsPricing": "Be specific. 'Brent is pricing in ~$3-5 of risk premium for shipping disruption' not 'markets are nervous'. What does the current price ASSUME will happen?",

  "whatMarketIsMissing": "This is the edge. What are most traders NOT thinking about? What second-order effect, policy shift, or timeline change could move markets significantly?",

  "keyQuestion": "The SINGLE question whose answer determines the trade. This should be specific and monitorable — something the trader can actually watch for. Not 'will things escalate' but 'will the White House announce a naval task force deployment before the April NATO summit?'",

  "scenarios": [
    {
      "title": "SPECIFIC scenario name — not 'bullish case' but 'US deploys carrier group to Strait of Hormuz'",
      "direction": "long" or "short" (relative to the PRIMARY asset),
      "probability": percentage (must sum roughly to 100 across scenarios),
      "trigger": "The specific observable event that kicks this off. A speech, a vote, a data release, a military action.",
      "consequence": "WHY this trigger leads to this market reaction. Explain the transmission mechanism. 'Naval deployment signals commitment to protect shipping lanes, removes the risk premium on tanker insurance, but creates new premium on potential Iranian retaliation.'",
      "priceImpact": "Specific levels or ranges. '$X to $Y over Z timeframe'. Not 'oil goes up'.",
      "timeframe": "How long from trigger to full price impact",
      "invalidation": "What specific development would kill this scenario"
    }
  ],

  "conviction": 0-100,
  "convictionRationale": "Explain your conviction level honestly. What evidence is strong? What's missing? What would change your mind?",

  "topTrade": {
    "asset": "Best asset from the list",
    "direction": "long" or "short",
    "thesis": "One sentence. Why this asset, why this direction, why NOW.",
    "entry": "Specific condition. 'On any pullback below $88' or 'Immediately — the risk is in NOT being positioned'",
    "risk": "Specific stop or invalidation. 'Below $85' or 'If diplomatic talks resume with concrete timeline'"
  }
}

CRITICAL RULES:
1. DECOMPOSE the situation into 3-4 DISTINCT scenarios. Each scenario represents a DIFFERENT policy decision or event, with DIFFERENT market consequences. If the situation is about US military involvement, give scenarios for: (a) no action, (b) limited naval presence, (c) full deployment, (d) escalation/conflict. Each produces different price action.

2. Probabilities must be honest and must roughly sum to 100%. If you're uncertain, spread probability across scenarios rather than concentrating it.

3. The "consequence" field is MANDATORY and must explain the causal chain: trigger → market mechanism → price impact. This is what separates real analysis from opinion.

4. Price impacts must include SPECIFIC levels or ranges. Use your knowledge of current approximate levels and typical moves for these assets.

5. If the news doesn't support a clear trade, set conviction LOW and topTrade to null. Honesty is more valuable than forced conviction.

6. Focus on what's ACTIONABLE and TRADEABLE. Academic analysis of geopolitics is useless without a specific market implication.`;

  const cacheConfig = FEED_CONFIGS.claude_analysis(themeName.replace(/\s+/g, "-").slice(0, 20));

  const cached = await fetchWithCache<AIFlagAnalysis>(cacheConfig, async () => {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .filter(block => block.type === "text")
      .map(block => ("text" in block ? block.text : ""))
      .join("");

    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      ...parsed,
      scenarios: (parsed.scenarios || []).map((s: AIScenario) => ({
        ...s,
        direction: s.direction || "neutral",
        probability: Math.max(0, Math.min(100, s.probability || 25)),
        consequence: s.consequence || "",
      })),
      conviction: Math.max(0, Math.min(100, parsed.conviction || 30)),
      source: "ai" as const,
    };
  });

  return cached?.data ?? null;
}

// ---------------------------------------------------------------------------
// Rules-based fallback
// ---------------------------------------------------------------------------

function analyseWithRules(
  themeName: string,
  articles: NewsArticle[],
  assetSymbols: string[]
): AIFlagAnalysis {
  const avgSentiment = articles.length > 0
    ? articles.reduce((s, a) => s + a.sentiment, 0) / articles.length
    : 0;
  const direction: Direction = avgSentiment > 0.1 ? "long" : avgSentiment < -0.1 ? "short" : "neutral";

  return {
    situationTitle: `${themeName} — developing situation`,
    situationSummary: `${articles.length} articles detected. News flow is ${avgSentiment > 0.1 ? "positive" : avgSentiment < -0.1 ? "negative" : "mixed"}. Enable AI analysis (ANTHROPIC_API_KEY) for scenario-specific reasoning.`,
    whatMarketIsPricing: "Unable to assess without AI analysis.",
    whatMarketIsMissing: "Enable AI analysis for deeper insight.",
    keyQuestion: `Will the ${themeName.toLowerCase()} situation escalate or resolve?`,
    scenarios: [
      {
        title: "Situation escalates",
        direction: direction === "short" ? "short" : "long",
        probability: 40,
        trigger: "New developments intensify the current trend",
        consequence: "Continued pressure on affected assets in the current direction.",
        priceImpact: "Continuation of recent move",
        timeframe: "1-2 weeks",
        invalidation: "Counter-narrative emerges",
      },
      {
        title: "Situation stabilises",
        direction: "neutral",
        probability: 40,
        trigger: "News flow dies down",
        consequence: "Risk premium unwinds, assets return to range.",
        priceImpact: "Range-bound",
        timeframe: "Coming days",
        invalidation: "Surprise catalyst",
      },
    ],
    conviction: Math.min(Math.round(articles.length * 4 + Math.abs(avgSentiment) * 20), 50),
    convictionRationale: `Rules-based assessment from ${articles.length} articles. Enable AI for scenario-specific analysis.`,
    topTrade: null,
    source: "rules",
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function analyseFlagWithAI(
  themeName: string,
  category: string,
  articles: NewsArticle[],
  assetSymbols: string[]
): Promise<AIFlagAnalysis> {
  const aiResult = await analyseWithClaude(themeName, category, articles, assetSymbols);
  if (aiResult) return aiResult;
  return analyseWithRules(themeName, articles, assetSymbols);
}
