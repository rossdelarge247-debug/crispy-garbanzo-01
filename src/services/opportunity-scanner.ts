/**
 * Opportunity Scanner — the brain of Trade Daddy
 *
 * Instead of keyword-matching news into themes, this service gives
 * Claude ALL available data and asks: "What are the best trade
 * opportunities right now?"
 *
 * Claude receives:
 *  - Economic calendar (upcoming events with forecasts)
 *  - News articles (with content where available)
 *  - The user's asset filter
 *
 * And produces concrete, specific trade ideas — each with:
 *  - A clear thesis tied to a specific catalyst
 *  - Direction, asset, entry/stop/target levels
 *  - Why NOW (timing)
 *  - Historical context
 *  - Probability assessment
 *
 * This replaces the keyword → theme → flag → backtest pipeline
 * with a single AI-first analysis step.
 */

import type { EconomicEvent, NewsArticle, Direction } from "@/types";
import { fetchArticleContents } from "@/services/article-reader";
import { fetchWithCache, FEED_CONFIGS } from "@/services/feed-cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TradeOpportunity {
  id: string;
  asset: string;
  assetName: string;
  direction: Direction;
  category: string;            // "calendar" | "geopolitical" | "momentum" | "mean-reversion" | "cross-asset"

  // The thesis
  title: string;               // "Short EUR/USD into ECB rate decision"
  thesis: string;              // 2-3 sentences explaining the idea
  catalyst: string;            // "ECB expected to cut 25bp while Fed holds"
  timing: string;              // "Enter before Thursday's ECB meeting"

  // Trade spec
  entryCondition: string;      // "At current levels" or "On pullback to 1.0650"
  stopLoss: string;            // "Above 1.0750" or "-2%"
  target: string;              // "1.0500" or "+3%"
  holdPeriod: string;          // "2-3 days" or "Through the event"

  // Conviction
  conviction: number;          // 0-100
  convictionRationale: string;

  // Why this, why now
  reasons: string[];           // specific, numbered
  risks: string[];
  whatToWatch: string;         // the key thing to monitor

  // Context
  relatedEvents: string[];     // calendar event titles that drive this
  relatedHeadlines: string[];  // news headlines supporting the thesis
}

export interface ScanResult {
  opportunities: TradeOpportunity[];
  marketSummary: string;       // 2-3 sentence overview of what's happening
  source: "ai" | "rules";
  scannedAt: string;
}

// ---------------------------------------------------------------------------
// Claude-powered scanning
// ---------------------------------------------------------------------------

async function scanWithClaude(
  events: EconomicEvent[],
  articles: NewsArticle[],
  assetFilter?: string
): Promise<ScanResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  // Fetch article content for the top articles
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
      return `${dayStr} ${timeStr}: ${e.title} (${e.country}, ${e.impact} impact)${e.forecast ? ` — forecast: ${e.forecast}, previous: ${e.previous ?? "n/a"}` : ""}`;
    })
    .join("\n");

  const articleText = articles.slice(0, 10).map((a, i) => {
    const content = articleContents.find(c => c.url === a.url);
    if (content?.success) {
      return `${i + 1}. "${a.title}" — ${a.source}\n${content.text}`;
    }
    return `${i + 1}. "${a.title}" — ${a.source}${a.summary ? ` | ${a.summary}` : ""}`;
  }).join("\n\n");

  const filterNote = assetFilter && assetFilter !== "all"
    ? `FOCUS: The user is specifically interested in ${assetFilter} opportunities. Prioritise these, but include cross-asset opportunities if they're strong enough.`
    : "No filter — scan across all asset classes.";

  const prompt = `You are the head of macro strategy at a top-tier hedge fund. Your job is to identify the best trade opportunities for the coming days based on the economic calendar and current news flow.

${filterNote}

ECONOMIC CALENDAR (next 7 days):
${calendarText || "No major events scheduled."}

CURRENT NEWS (${articles.length} articles, ${articleContents.filter(c => c.success).length} with full content):
${articleText || "No relevant articles."}

TODAY'S DATE: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}

Identify 3-6 SPECIFIC trade opportunities. Each must be tied to a concrete catalyst — an economic release, a policy decision, a geopolitical development, or a technical setup created by recent events.

RESPOND IN THIS EXACT JSON FORMAT (raw JSON, no markdown):
{
  "marketSummary": "2-3 sentences. What's the overall picture this week? What's driving markets? What should traders be paying attention to?",
  "opportunities": [
    {
      "asset": "Ticker symbol (e.g., EUR-USD, BTC-USD, BZ=F, NVDA, SPY)",
      "assetName": "Human-readable name",
      "direction": "long" or "short",
      "category": "calendar" or "geopolitical" or "momentum" or "mean-reversion" or "cross-asset",

      "title": "Short, specific title. NOT 'Buy oil' but 'Long Brent into OPEC+ meeting with production cut expectations'",
      "thesis": "2-3 sentences. The specific logic: what's happening, why it creates an opportunity, and what the expected outcome is.",
      "catalyst": "The specific event or development that triggers this trade. Be precise.",
      "timing": "When to enter. 'Before Thursday's ECB meeting' or 'On Monday's open' or 'On any pullback below X'.",

      "entryCondition": "Specific. 'At current levels around 1.0680' or 'On pullback to $87'",
      "stopLoss": "Specific level or percentage",
      "target": "Specific level or percentage",
      "holdPeriod": "How long to hold. '2-3 days' or 'Through the event then reassess'",

      "conviction": 0-100,
      "convictionRationale": "Why this conviction level. What evidence is strong, what's uncertain.",

      "reasons": ["Specific reason 1", "Specific reason 2", "..."],
      "risks": ["Specific risk 1", "Specific risk 2"],
      "whatToWatch": "The single most important thing to monitor. A data release, a speech, a price level.",

      "relatedEvents": ["Calendar event titles that are relevant"],
      "relatedHeadlines": ["News headlines supporting this thesis"]
    }
  ]
}

RULES:
1. Every opportunity must be tied to a SPECIFIC, IDENTIFIABLE catalyst. No vague "markets look good" ideas.
2. Calendar events are gold — they have known timing, historical patterns, and measurable outcomes. Use them.
3. Geopolitical situations must be decomposed into specific scenarios. "Middle East tensions" is not a trade idea. "Long Brent if US announces Hormuz naval deployment" is.
4. Include the TIMING — when to enter, not just what to buy.
5. Conviction must be honest. An 80% conviction idea is one where you'd put real money on it.
6. Include at least one calendar-driven idea if there are high-impact events in the next 7 days.
7. Risks must be specific and actionable, not generic "markets could go down".
8. Stop losses and targets must be specific levels, not vague percentages where possible.
9. If cross-asset effects exist (e.g., hawkish Fed → strong dollar → weak gold → weak EM), include them.
10. Order opportunities by conviction, highest first.`;

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
        id: `opp-${i}-${Date.now()}`,
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
// Rules-based fallback
// ---------------------------------------------------------------------------

function scanWithRules(
  events: EconomicEvent[],
  articles: NewsArticle[]
): ScanResult {
  const opportunities: TradeOpportunity[] = [];

  // Generate ideas from high-impact calendar events
  const highImpact = events.filter(e => e.impact === "high");
  for (const event of highImpact.slice(0, 3)) {
    const isUS = event.country === "US";
    const isFed = event.title.toLowerCase().includes("fomc") || event.title.toLowerCase().includes("rate decision");
    const isJobs = event.title.toLowerCase().includes("payroll") || event.title.toLowerCase().includes("employment");
    const isCPI = event.title.toLowerCase().includes("cpi");

    let asset = isUS ? "DXY" : "EUR-USD";
    let assetName = isUS ? "US Dollar Index" : "Euro/Dollar";
    let direction: Direction = "long";

    if (isFed) { asset = "DXY"; assetName = "US Dollar Index"; }
    if (isJobs) { asset = "SPY"; assetName = "S&P 500"; direction = "long"; }
    if (isCPI) { asset = "GC=F"; assetName = "Gold"; direction = "long"; }

    opportunities.push({
      id: `cal-${event.id}`,
      asset,
      assetName,
      direction,
      category: "calendar",
      title: `${event.title} — potential catalyst`,
      thesis: `Upcoming ${event.title} could move ${assetName}. ${event.forecast ? `Market expects ${event.forecast} vs previous ${event.previous}.` : "Watch for surprises."}`,
      catalyst: event.title,
      timing: `Around ${new Date(event.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`,
      entryCondition: "Before the release",
      stopLoss: "2% from entry",
      target: "3% from entry",
      holdPeriod: "Through the event",
      conviction: 40,
      convictionRationale: "Calendar events have predictable timing but uncertain outcomes. Enable AI analysis for deeper assessment.",
      reasons: [`${event.title} is a high-impact event that historically moves markets`],
      risks: ["Actual vs forecast deviation determines direction"],
      whatToWatch: event.title,
      relatedEvents: [event.title],
      relatedHeadlines: [],
    });
  }

  return {
    opportunities,
    marketSummary: `${events.filter(e => e.impact === "high").length} high-impact events in the coming days. Enable AI analysis (ANTHROPIC_API_KEY) for specific trade recommendations.`,
    source: "rules",
    scannedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function scanForOpportunities(
  events: EconomicEvent[],
  articles: NewsArticle[],
  assetFilter?: string
): Promise<ScanResult> {
  const aiResult = await scanWithClaude(events, articles, assetFilter);
  if (aiResult && aiResult.opportunities.length > 0) return aiResult;
  return scanWithRules(events, articles);
}
