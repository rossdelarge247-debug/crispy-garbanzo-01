/**
 * Opportunity Scanner — the brain of Trade Wizard
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

  const prompt = `You are a macro strategist. Find the best trades for the coming days. Be CONCISE — every word must earn its place.

${filterNote}

CALENDAR (next 7 days):
${calendarText || "None."}

NEWS (${articles.length} articles):
${articleText || "None."}

DATE: ${new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}

Return raw JSON (no markdown):
{
  "marketSummary": "1-2 sentences max. What matters this week.",
  "opportunities": [
    {
      "asset": "Ticker (EUR-USD, BTC-USD, BZ=F, NVDA, SPY etc)",
      "assetName": "Name",
      "direction": "long" or "short",
      "category": "calendar" or "geopolitical" or "momentum" or "mean-reversion" or "cross-asset",
      "title": "Punchy. 'Short EUR into ECB cut' not 'Potential opportunity in Euro'",
      "thesis": "1-2 sentences. What + why + expected outcome. No filler.",
      "catalyst": "The specific trigger. One line.",
      "timing": "When to enter. Be specific.",
      "entryCondition": "Level or condition",
      "stopLoss": "Level",
      "target": "Level",
      "holdPeriod": "Duration",
      "conviction": 0-100,
      "convictionRationale": "One sentence. Why this number.",
      "reasons": ["Short, specific reasons — max 3"],
      "risks": ["Short, specific risks — max 2"],
      "whatToWatch": "One thing to monitor",
      "relatedEvents": ["Event names"],
      "relatedHeadlines": ["Headlines"]
    }
  ]
}

CRITICAL: Be specific, not vague. "Brent $95 if Hormuz escort announced" not "oil could go up". Calendar events with known timing are the highest-conviction ideas. Order by conviction. 3-6 ideas.`;

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
      id: `cal-${asset.replace(/[^a-zA-Z0-9]/g, "-")}-${event.id}`,
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
