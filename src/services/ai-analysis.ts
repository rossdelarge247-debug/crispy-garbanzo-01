/**
 * AI Analysis Service
 *
 * Uses Claude to generate deep market analysis when ANTHROPIC_API_KEY is set.
 * Falls back to structured rules-based analysis when no key is available.
 */

import type { MarketFlagDetail, Hypothesis, NewsArticle } from "@/types";
import type { CompositeSocialSentiment } from "@/services/social-sentiment";

// ---------------------------------------------------------------------------
// Analysis types
// ---------------------------------------------------------------------------

export interface AnalysisRequest {
  type:
    | "deep_narrative"
    | "opportunity_scan"
    | "risk_assessment"
    | "scenario_matrix"
    | "trading_frameworks"
    | "correlation_analysis"
    | "custom";
  flag: MarketFlagDetail;
  hypotheses: Hypothesis[];
  articles: NewsArticle[];
  socialSentiment: CompositeSocialSentiment | null;
  customPrompt?: string;
}

export interface AnalysisResult {
  type: string;
  title: string;
  content: string;
  source: "ai" | "rules";
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Analysis framework definitions
// ---------------------------------------------------------------------------

export const ANALYSIS_FRAMEWORKS = [
  {
    type: "deep_narrative" as const,
    title: "Deep Narrative Analysis",
    description: "AI synthesizes all available data into a comprehensive market narrative — connecting news, sentiment, and price action into a coherent story.",
    icon: "📖",
  },
  {
    type: "opportunity_scan" as const,
    title: "Opportunity Scanner",
    description: "Identifies specific trading opportunities across affected assets — entry zones, catalysts, and risk/reward profiles.",
    icon: "🎯",
  },
  {
    type: "risk_assessment" as const,
    title: "Risk Assessment",
    description: "Evaluates downside scenarios, tail risks, correlation risks, and position sizing considerations.",
    icon: "⚠",
  },
  {
    type: "scenario_matrix" as const,
    title: "Scenario Matrix",
    description: "Bull / Base / Bear case analysis with probability estimates, key triggers, and expected asset impact for each.",
    icon: "📊",
  },
  {
    type: "trading_frameworks" as const,
    title: "Trading Frameworks",
    description: "Applies professional frameworks — momentum, mean reversion, breakout, carry trade — to identify which approach fits this situation.",
    icon: "🔧",
  },
  {
    type: "correlation_analysis" as const,
    title: "Correlation & Spillover",
    description: "Maps how this situation could ripple into other markets — cross-asset correlations, second-order effects, and contagion risk.",
    icon: "🌐",
  },
];

// ---------------------------------------------------------------------------
// System prompt for Claude
// ---------------------------------------------------------------------------

function buildSystemPrompt(): string {
  return `You are Trade Daddy's AI analysis engine. You help non-traders understand market situations and identify opportunities.

CRITICAL RULES:
- Write for people who are NOT professional traders
- Use plain English — no unexplained jargon
- When you use a financial term, briefly explain it in parentheses
- Be specific and actionable, not vague
- Include specific numbers, levels, and timeframes where possible
- Use bullet points and clear structure
- Bold key takeaways using **markdown**
- Be honest about uncertainty — say "this could go either way" when it's true
- Never give financial advice — frame everything as analysis and scenarios
- Keep it concise but thorough — aim for depth without padding`;
}

function buildAnalysisPrompt(request: AnalysisRequest): string {
  const { type, flag, hypotheses, articles, socialSentiment } = request;

  const context = `
MARKET SITUATION: ${flag.title}
CATEGORY: ${flag.category}
CONVICTION SCORE: ${flag.convictionScore}% (${flag.convictionLevel})
STATUS: ${flag.status}
TIME HORIZON: ${flag.timeHorizon} (${flag.timeHorizonDays} days)

SUMMARY: ${flag.summary}

WHY IT MATTERS: ${flag.whyItMatters}

WHAT CHANGED: ${flag.whatChanged}

AFFECTED ASSETS:
${flag.affectedAssets.map(a => `- ${a.symbol} (${a.name}) — ${a.assetClass}, ${a.direction}, ${a.impact} impact`).join("\n")}

KEY DRIVERS:
${flag.drivers.map(d => `- ${d}`).join("\n")}

CURRENT HYPOTHESES:
${hypotheses.map(h => `- [${h.direction.toUpperCase()}] ${h.title} (confidence: ${h.confidenceScore}%) — ${h.summary}`).join("\n")}

NEWS SENTIMENT: Score ${flag.sentimentScore} — ${flag.sentimentSummary}

RECENT ARTICLES (${articles.length}):
${articles.slice(0, 8).map(a => `- "${a.title}" (${a.source}, sentiment: ${a.sentiment})`).join("\n")}

${socialSentiment ? `SOCIAL SENTIMENT:
- Composite: ${socialSentiment.compositeLabel} (score: ${socialSentiment.compositeScore}, agreement: ${socialSentiment.agreement}%)
${socialSentiment.signals.filter(s => s.volume > 0 && s.source !== "composite").map(s => `- ${s.source}: ${s.label} (${s.volume} data points)`).join("\n")}` : "SOCIAL SENTIMENT: Not available"}
`;

  const prompts: Record<string, string> = {
    deep_narrative: `Analyze this market situation deeply. Write a comprehensive narrative that:
1. Connects the news flow, sentiment data, and market context into a coherent story
2. Identifies what the market is pricing in vs. what it might be missing
3. Highlights the key tension or debate driving this situation
4. Explains what would need to change for the situation to resolve
5. Gives a clear "bottom line" assessment

${context}`,

    opportunity_scan: `Scan this market situation for specific trading opportunities. For each opportunity:
1. Identify the specific asset and direction
2. Explain the thesis in one sentence
3. Suggest an entry zone or trigger condition
4. Define what would invalidate the trade
5. Estimate risk/reward ratio
6. Rate the opportunity (strong / moderate / speculative)

Find at least 3-5 distinct opportunities across the affected assets. Include both obvious and non-obvious angles.

${context}`,

    risk_assessment: `Conduct a thorough risk assessment of this market situation:
1. **Primary risks** — what are the most likely things that could go wrong?
2. **Tail risks** — what are the low-probability, high-impact scenarios?
3. **Correlation risk** — how could positions in these assets amplify losses?
4. **Timing risk** — what's the danger of being right on direction but wrong on timing?
5. **Liquidity risk** — any concerns about exit ability during stress?
6. **Position sizing** — given these risks, what position size makes sense?
7. **Hedging options** — how could exposure be partially protected?

${context}`,

    scenario_matrix: `Build a detailed scenario matrix for this market situation:

**BULL CASE** (probability: X%)
- What needs to happen
- Expected asset moves
- Timeline
- Key trigger events

**BASE CASE** (probability: X%)
- Most likely outcome
- Expected asset moves
- Timeline

**BEAR CASE** (probability: X%)
- What goes wrong
- Expected asset moves
- Timeline
- Key warning signs

**BLACK SWAN** (probability: <5%)
- Extreme scenario
- Expected impact

For each scenario, be specific about expected price levels and timeframes.

${context}`,

    trading_frameworks: `Apply professional trading frameworks to this situation and identify which approaches fit best:

1. **Momentum** — Is there a trend worth riding? What confirms/denies momentum?
2. **Mean Reversion** — Is anything oversold/overbought? What levels matter?
3. **Breakout** — Are there key technical levels where a break could accelerate moves?
4. **Event-Driven** — What upcoming catalysts could create asymmetric opportunities?
5. **Carry / Yield** — Any income or cost-of-carry considerations?
6. **Relative Value** — Are there pair trades or spread opportunities?
7. **Options/Volatility** — Is implied volatility mispriced? (explain simply)

For each framework that applies, give a specific, actionable recommendation.

${context}`,

    correlation_analysis: `Map the spillover and correlation effects of this market situation:

1. **Direct correlations** — How do the primary assets move with each other?
2. **Second-order effects** — What other assets/sectors get affected indirectly?
3. **Cross-asset implications** — How does this affect bonds, currencies, commodities?
4. **Sector rotation** — Which sectors benefit or suffer?
5. **Geographic spillover** — Which regions/countries are most exposed?
6. **Portfolio impact** — How would a typical retail portfolio be affected?
7. **Contagion risk** — Could this cascade into a broader market event?

Be specific about the direction and magnitude of correlations.

${context}`,

    custom: `${request.customPrompt || "Analyze this market situation in depth."}

${context}`,
  };

  return prompts[type] || prompts.deep_narrative;
}

// ---------------------------------------------------------------------------
// Rules-based fallback (when no AI API key)
// ---------------------------------------------------------------------------

function generateRulesBasedAnalysis(request: AnalysisRequest): AnalysisResult {
  const { type, flag, hypotheses, articles, socialSentiment } = request;

  const framework = ANALYSIS_FRAMEWORKS.find(f => f.type === type);
  const title = framework?.title || "Analysis";

  const sentimentDirection = flag.sentimentScore > 20 ? "bullish" : flag.sentimentScore < -20 ? "bearish" : "mixed";
  const topHypothesis = hypotheses.sort((a, b) => b.confidenceScore - a.confidenceScore)[0];
  const socialLabel = socialSentiment?.compositeLabel || "unavailable";
  const articleCount = articles.length;

  const analyses: Record<string, string> = {
    deep_narrative: `## Deep Narrative Analysis

**Situation:** ${flag.title}

**The Story So Far:**
${flag.summary}

${flag.whatChanged}

**Key Tension:**
The market is weighing ${flag.drivers.slice(0, 2).join(" against ")}. With a conviction score of ${flag.convictionScore}%, the signal is ${flag.convictionLevel === "high" ? "strong enough to act on" : flag.convictionLevel === "medium" ? "worth monitoring closely" : "still developing"}.

**Sentiment Picture:**
- News sentiment is ${sentimentDirection} (score: ${flag.sentimentScore})
- Social sentiment is ${socialLabel}
- ${articleCount} articles covering this theme from multiple sources
${socialSentiment && socialSentiment.agreement > 60 ? "- **Sources broadly agree** — this strengthens the signal" : socialSentiment && socialSentiment.agreement < 40 ? "- **Sources are conflicted** — exercise caution" : ""}

**Leading Hypothesis:**
${topHypothesis ? `"${topHypothesis.title}" with ${topHypothesis.confidenceScore}% confidence. ${topHypothesis.summary}` : "No dominant hypothesis yet."}

**Bottom Line:**
${flag.convictionScore >= 70 ? "This situation has enough evidence to warrant active engagement. The next step is to explore hypotheses and test them." : flag.convictionScore >= 50 ? "Promising signals but not yet conclusive. Monitor for additional confirmation before committing capital." : "Early-stage situation. Keep watching but don't act yet."}

---
*To unlock deeper AI-powered analysis, add your ANTHROPIC_API_KEY in Vercel environment variables.*`,

    opportunity_scan: `## Opportunity Scanner

Based on ${articleCount} articles and ${sentimentDirection} sentiment:

${flag.affectedAssets.map((asset, i) => `### Opportunity ${i + 1}: ${asset.symbol} (${asset.name})
- **Direction:** ${asset.direction}
- **Thesis:** ${asset.impact === "primary" ? "Directly affected by " + flag.category.split("/")[0].trim().toLowerCase() + " developments" : "Secondary beneficiary/casualty of the primary move"}
- **Conviction:** ${asset.impact === "primary" ? flag.convictionScore : Math.round(flag.convictionScore * 0.7)}%
- **Risk:** ${asset.impact === "primary" ? "Direct exposure to event risk" : "Correlation risk — may decouple from primary asset"}
- **Rating:** ${asset.impact === "primary" && flag.convictionScore >= 70 ? "**Strong**" : asset.impact === "primary" ? "**Moderate**" : "**Speculative**"}
`).join("\n")}

### Cross-Asset Angle
${hypotheses.length > 1 ? `With ${hypotheses.length} competing hypotheses, a volatility-based approach (benefiting from large moves in either direction) could be worth considering.` : "Limited alternative angles with current data."}

---
*Add ANTHROPIC_API_KEY for AI-powered opportunity scanning with specific entry zones and risk/reward analysis.*`,

    risk_assessment: `## Risk Assessment

### Primary Risks
${flag.drivers.map(d => `- **${d}** — could reverse or intensify unexpectedly`).join("\n")}

### Sentiment Risk
- News sentiment: ${sentimentDirection} (score: ${flag.sentimentScore})
- ${flag.sentimentScore > 50 || flag.sentimentScore < -50 ? "**Extreme sentiment** — contrarian reversal risk is elevated" : "Sentiment is moderate — not yet at contrarian extremes"}

### Timing Risk
- Time horizon: ${flag.timeHorizon} (${flag.timeHorizonDays} days)
- ${flag.status === "emerging" ? "**Early stage** — the thesis may take longer to play out than expected" : flag.status === "active" ? "**Active** — already in motion, risk of entering late" : "**Maturing** — much of the move may already be priced in"}

### Position Sizing Guidance
- Given ${flag.convictionLevel} conviction, position size should be ${flag.convictionLevel === "high" ? "standard (1-2% risk)" : flag.convictionLevel === "medium" ? "reduced (0.5-1% risk)" : "minimal (0.25-0.5% risk)"}

---
*Add ANTHROPIC_API_KEY for comprehensive tail risk analysis and hedging recommendations.*`,

    scenario_matrix: `## Scenario Matrix

### 🟢 Bull Case (${topHypothesis && topHypothesis.direction === "long" ? topHypothesis.confidenceScore : 30}% probability)
${hypotheses.find(h => h.direction === "long")?.summary || "Positive catalysts accelerate the trend."}
- Invalidated by: ${hypotheses.find(h => h.direction === "long")?.invalidation || "Reversal of key drivers"}

### 🟡 Base Case (${100 - (hypotheses.reduce((s, h) => s + h.confidenceScore, 0) / Math.max(hypotheses.length, 1))}% probability)
The situation persists at current levels with elevated volatility but no clear resolution.
- Most likely if news flow stabilizes without new catalysts

### 🔴 Bear Case (${hypotheses.find(h => h.direction === "short")?.confidenceScore || 25}% probability)
${hypotheses.find(h => h.direction === "short")?.summary || "Key assumptions break down, forcing a reversal."}
- Invalidated by: ${hypotheses.find(h => h.direction === "short")?.invalidation || "Continuation of current trend"}

---
*Add ANTHROPIC_API_KEY for specific price targets and probability-weighted expected values.*`,

    trading_frameworks: `## Trading Frameworks Applied

### Momentum
${flag.sentimentScore > 30 ? "**Applicable.** Positive sentiment momentum supports trend-following positions." : flag.sentimentScore < -30 ? "**Applicable.** Negative momentum supports defensive/short positioning." : "**Neutral.** No clear momentum signal — wait for directional clarity."}

### Event-Driven
**Applicable.** Key drivers (${flag.drivers.slice(0, 2).join(", ")}) create potential catalyst-driven moves. Event-driven strategies thrive when specific triggers are identifiable.

### Relative Value
${flag.affectedAssets.length >= 2 ? `**Possible.** With ${flag.affectedAssets.length} affected assets, a relative value approach (long primary / short secondary or vice versa) could reduce directional risk.` : "Limited — not enough assets for a relative value approach."}

### Volatility
${flag.status === "volatile" || flag.status === "emerging" ? "**Applicable.** Elevated uncertainty suggests volatility is likely underpriced. Consider strategies that benefit from large moves regardless of direction." : "**Neutral.** Volatility is not the primary feature of this situation."}

---
*Add ANTHROPIC_API_KEY for specific trade structures and entry/exit parameters per framework.*`,

    correlation_analysis: `## Correlation & Spillover Analysis

### Primary Assets
${flag.affectedAssets.filter(a => a.impact === "primary").map(a => `- **${a.symbol}** (${a.name}) — directly exposed`).join("\n")}

### Secondary Effects
${flag.affectedAssets.filter(a => a.impact === "secondary").map(a => `- **${a.symbol}** (${a.name}) — correlated via ${flag.category.split("/")[0].trim().toLowerCase()} channel`).join("\n")}

### Cross-Market Implications
- **Equities:** ${flag.category.includes("Energy") ? "Energy sector exposed; airlines and transport inversely affected" : flag.category.includes("Crypto") ? "Crypto-exposed equities (COIN, MSTR) move in sympathy" : flag.category.includes("FX") ? "USD-sensitive exporters and multinationals affected" : "Sector-specific impact likely"}
- **Bonds:** ${flag.sentimentScore < -20 ? "Risk-off sentiment could drive flight to safety (bonds up)" : "Limited direct bond market impact at current levels"}
- **Currencies:** ${flag.category.includes("FX") || flag.category.includes("Macro") ? "Direct FX impact expected across major pairs" : "Indirect currency effects through risk appetite channel"}

---
*Add ANTHROPIC_API_KEY for quantified correlation coefficients and second-order contagion mapping.*`,
  };

  return {
    type,
    title,
    content: analyses[type] || analyses.deep_narrative,
    source: "rules",
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Main analysis function
// ---------------------------------------------------------------------------

export async function runAnalysis(request: AnalysisRequest): Promise<AnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const framework = ANALYSIS_FRAMEWORKS.find(f => f.type === request.type);
  const title = framework?.title || "Analysis";

  if (!apiKey) {
    return generateRulesBasedAnalysis(request);
  }

  // Use Claude API
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: buildSystemPrompt(),
      messages: [
        { role: "user", content: buildAnalysisPrompt(request) },
      ],
    });

    const content = message.content
      .filter(block => block.type === "text")
      .map(block => ("text" in block ? block.text : ""))
      .join("\n\n");

    return {
      type: request.type,
      title,
      content,
      source: "ai",
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn("[ai-analysis] Claude API call failed, using rules-based fallback:", error);
    return generateRulesBasedAnalysis(request);
  }
}
