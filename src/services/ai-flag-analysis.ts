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

  const prompt = `Macro analyst. Decompose this situation into tradeable scenarios. Be CONCISE — no filler, no preamble.

THEME: ${themeName} | ASSETS: ${assetSymbols.join(", ")}

NEWS (${articles.length} articles, ${articlesWithContent} with content):
${articleText}

Return raw JSON:
{
  "situationTitle": "Specific. 'US weighing Hormuz deployment' not 'energy tensions'",
  "situationSummary": "2 sentences. What's happening, who's deciding, what's at stake.",
  "whatMarketIsPricing": "One sentence. What the current price assumes.",
  "whatMarketIsMissing": "One sentence. The overlooked angle.",
  "keyQuestion": "The one monitorable question that determines the trade.",
  "scenarios": [
    {
      "title": "Specific scenario — 'US deploys carrier group'",
      "direction": "long" or "short",
      "probability": percent (sum to ~100),
      "trigger": "Observable event",
      "consequence": "Causal chain: trigger → mechanism → price impact",
      "priceImpact": "Specific levels. '$95-100' not 'oil rises'",
      "timeframe": "Duration",
      "invalidation": "What kills this"
    }
  ],
  "conviction": 0-100,
  "convictionRationale": "One sentence.",
  "topTrade": { "asset": "ticker", "direction": "long/short", "thesis": "One sentence.", "entry": "Condition", "risk": "Stop level" }
}

3-4 distinct scenarios with DIFFERENT outcomes. Military/policy situations: decompose by action type (no action / limited / full / escalation). Probabilities honest. topTrade null if conviction <40.`;

  const cacheConfig = FEED_CONFIGS.claude_analysis(themeName.replace(/\s+/g, "-").slice(0, 20));

  const cached = await fetchWithCache<AIFlagAnalysis>(cacheConfig, async () => {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
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
