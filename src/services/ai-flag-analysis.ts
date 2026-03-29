/**
 * AI Flag Analysis — Claude-powered scenario analysis
 *
 * Takes a cluster of news articles about a theme and uses Claude to:
 * 1. Identify the SPECIFIC situation (not just "energy risk")
 * 2. Generate distinct scenario-based hypotheses with different triggers
 * 3. Assess what the market is pricing in vs missing
 * 4. Provide nuanced conviction scoring based on understanding
 * 5. Write a clear, plain-English situation summary
 *
 * This replaces the keyword-counted, template-based analysis with
 * real reasoning about what the news actually means for trading.
 */

import type { NewsArticle, Direction } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AIScenario {
  title: string;
  direction: Direction;
  probability: number;        // 0-100
  trigger: string;            // what would make this happen
  priceImpact: string;        // "Brent could test $95-100"
  timeframe: string;          // "1-2 weeks"
  invalidation: string;       // what would kill this thesis
}

export interface AIFlagAnalysis {
  situationTitle: string;       // specific: "US military posture in Strait of Hormuz"
  situationSummary: string;     // 2-3 sentence plain English summary
  whatMarketIsPricing: string;  // what's already in the price
  whatMarketIsMissing: string;  // the edge / the overlooked angle
  keyQuestion: string;          // the one question that determines the trade
  scenarios: AIScenario[];      // 2-4 distinct scenarios with triggers
  conviction: number;           // 0-100
  convictionRationale: string;  // why this score
  topTrade: {                   // the single best trade right now
    asset: string;
    direction: Direction;
    thesis: string;             // one sentence
    entry: string;              // "on any pullback below $88"
    risk: string;               // "stop below $85"
  } | null;
  source: "ai" | "rules";
}

// ---------------------------------------------------------------------------
// Claude-powered analysis
// ---------------------------------------------------------------------------

async function analyseWithClaude(
  themeName: string,
  category: string,
  articles: NewsArticle[],
  assetSymbols: string[]
): Promise<AIFlagAnalysis | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const articleText = articles.slice(0, 12).map((a, i) =>
    `${i + 1}. "${a.title}" — ${a.source}${a.summary ? ` | ${a.summary}` : ""}`
  ).join("\n");

  const prompt = `You are a senior macro analyst at a hedge fund. Analyse this news cluster and produce a trading assessment.

THEME: ${themeName}
CATEGORY: ${category}
ASSETS: ${assetSymbols.join(", ")}

RECENT NEWS (${articles.length} articles):
${articleText}

Respond in this EXACT JSON format (no markdown, no code fences, just raw JSON):
{
  "situationTitle": "Specific title describing the ACTUAL situation (not generic like 'energy risk' — be specific about what's happening)",
  "situationSummary": "2-3 sentences. Plain English. What is actually happening and why it matters for these assets.",
  "whatMarketIsPricing": "What the current price already reflects. Be specific.",
  "whatMarketIsMissing": "The edge — what most people are overlooking or underweighting. This is where the trade opportunity lives.",
  "keyQuestion": "The single question whose answer determines the trade. E.g. 'Will the US commit ground forces to protect shipping lanes?'",
  "scenarios": [
    {
      "title": "Scenario name",
      "direction": "long" or "short",
      "probability": 0-100,
      "trigger": "What specific event would make this happen",
      "priceImpact": "Expected price move with specific levels if possible",
      "timeframe": "When this would play out",
      "invalidation": "What kills this thesis"
    }
  ],
  "conviction": 0-100,
  "convictionRationale": "Why this conviction level — what evidence supports it and what's missing",
  "topTrade": {
    "asset": "The single best asset to trade right now from the list",
    "direction": "long" or "short",
    "thesis": "One sentence: why this trade, why now",
    "entry": "Specific entry condition or level",
    "risk": "Where to place stop or what invalidates"
  }
}

RULES:
- Be SPECIFIC. "Oil could go up" is useless. "Brent could test $95 if US announces Hormuz patrol" is useful.
- Generate 2-4 distinct scenarios with DIFFERENT triggers and outcomes.
- The key question should be the one thing a trader needs to watch.
- If the news doesn't support a high-conviction trade, say so — low conviction is honest.
- Scenarios must have different directions where appropriate (don't just give 3 bullish scenarios).
- Price impacts should include specific levels or ranges where possible.
- topTrade can be null if conviction is too low to recommend anything.`;

  try {
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

    // Parse JSON response
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      ...parsed,
      scenarios: (parsed.scenarios || []).map((s: AIScenario) => ({
        ...s,
        direction: s.direction || "neutral",
        probability: Math.max(0, Math.min(100, s.probability || 25)),
      })),
      conviction: Math.max(0, Math.min(100, parsed.conviction || 30)),
      source: "ai" as const,
    };
  } catch (error) {
    console.warn("[ai-flag-analysis] Claude analysis failed:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Rules-based fallback (no AI key)
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
    situationSummary: `${articles.length} articles detected around ${themeName.toLowerCase()}. News flow is ${avgSentiment > 0.1 ? "positive" : avgSentiment < -0.1 ? "negative" : "mixed"}.`,
    whatMarketIsPricing: "Current news flow appears largely reflected in recent price action.",
    whatMarketIsMissing: "Without deeper analysis, it's difficult to identify overlooked angles. Enable AI analysis for more insight.",
    keyQuestion: `Will the ${themeName.toLowerCase()} situation escalate or resolve?`,
    scenarios: [
      {
        title: "Situation escalates",
        direction: direction === "short" ? "short" : "long",
        probability: 40,
        trigger: "New developments intensify the current trend",
        priceImpact: "Continuation of current direction",
        timeframe: "1-2 weeks",
        invalidation: "Counter-narrative emerges or catalyst reverses",
      },
      {
        title: "Situation stabilises",
        direction: "neutral",
        probability: 40,
        trigger: "News flow dies down without new catalysts",
        priceImpact: "Range-bound price action",
        timeframe: "Coming days",
        invalidation: "Surprise catalyst in either direction",
      },
    ],
    conviction: Math.min(Math.round(articles.length * 5 + Math.abs(avgSentiment) * 30), 60),
    convictionRationale: `Based on ${articles.length} articles. Enable AI analysis (ANTHROPIC_API_KEY) for scenario-specific reasoning.`,
    topTrade: assetSymbols[0] ? {
      asset: assetSymbols[0],
      direction,
      thesis: `${themeName} news flow suggests ${direction === "long" ? "upward" : direction === "short" ? "downward" : "sideways"} pressure`,
      entry: "Monitor for confirmation",
      risk: "Use standard stop levels",
    } : null,
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
  // Try Claude first
  const aiResult = await analyseWithClaude(themeName, category, articles, assetSymbols);
  if (aiResult) return aiResult;

  // Fall back to rules
  return analyseWithRules(themeName, articles, assetSymbols);
}
