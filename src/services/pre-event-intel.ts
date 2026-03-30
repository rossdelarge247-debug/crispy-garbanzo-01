/**
 * Pre-Event Intelligence — the features that make this worth paying for.
 *
 * 1. Positioning Detector: has the market already priced in the expected outcome?
 * 2. AI Pre-Event Briefing: 3 scenarios with specific trade actions
 *
 * These use real price data to compute pre-event drift, then Claude
 * synthesizes everything into actionable intelligence.
 */

import { getMarketDataProvider } from "@/services/market-data";
import type { MacroEvent } from "@/types/macro-trader";

// ---------------------------------------------------------------------------
// Positioning detector — is the trade already crowded?
// ---------------------------------------------------------------------------

export interface PositioningAnalysis {
  asset: string;
  assetName: string;
  preEventDrift: number;     // 5-day % move into the event
  driftDirection: "bullish" | "bearish" | "neutral";
  percentile: number;        // where this drift sits vs historical (0-100)
  crowded: boolean;
  implication: string;       // "Pre-positioned for a beat. Miss reactions likely amplified."
}

export async function analysePositioning(
  symbol: string,
  assetName: string,
  direction: "long" | "short"
): Promise<PositioningAnalysis | null> {
  try {
    const provider = getMarketDataProvider();
    const history = await provider.getHistorical(symbol, 30);
    if (history.length < 6) return null;

    const prices = history.map(d => d.price);
    const current = prices[prices.length - 1];
    const fiveDaysAgo = prices[Math.max(0, prices.length - 6)];
    const drift = fiveDaysAgo > 0 ? ((current - fiveDaysAgo) / fiveDaysAgo) * 100 : 0;

    // Compute historical 5-day drifts to find percentile
    const drifts: number[] = [];
    for (let i = 5; i < prices.length; i++) {
      drifts.push(((prices[i] - prices[i - 5]) / prices[i - 5]) * 100);
    }
    drifts.sort((a, b) => a - b);
    const percentile = drifts.length > 0
      ? Math.round(drifts.filter(d => d <= drift).length / drifts.length * 100)
      : 50;

    const driftDirection: PositioningAnalysis["driftDirection"] =
      drift > 0.3 ? "bullish" : drift < -0.3 ? "bearish" : "neutral";

    const isLong = direction === "long";
    const prePosForBeat = (isLong && drift > 0.5) || (!isLong && drift < -0.5);
    const crowded = prePosForBeat && (percentile > 70 || percentile < 30);

    let implication: string;
    if (crowded) {
      implication = `${assetName} has moved ${drift > 0 ? "+" : ""}${drift.toFixed(2)}% in the last 5 days (${percentile}th percentile). The market appears pre-positioned for the expected outcome. A surprise in the opposite direction would likely produce an outsized move.`;
    } else if (Math.abs(drift) > 0.3) {
      implication = `${assetName} has drifted ${drift > 0 ? "+" : ""}${drift.toFixed(2)}% into this event. Moderate pre-positioning detected — reaction may be partially muted in the expected direction.`;
    } else {
      implication = `${assetName} is flat into this event. No significant pre-positioning — clean setup for a directional trade.`;
    }

    return { asset: symbol, assetName, preEventDrift: +drift.toFixed(2), driftDirection, percentile, crowded, implication };
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// AI Pre-Event Briefing — the killer feature
// ---------------------------------------------------------------------------

export interface PreEventScenario {
  title: string;
  probability: number;
  condition: string;       // "CPI > 3.5% YoY"
  tradeAction: string;     // "Buy Gold, sell EUR/USD"
  entry: string;           // "Wait 15min post-release"
  risk: string;            // "FOMC tomorrow could reverse"
}

export interface PreEventBriefing {
  context: string;         // 2-3 sentence setup
  scenarios: PreEventScenario[];
  keyRisk: string;
  source: "ai" | "rules";
}

export async function generatePreEventBriefing(
  event: MacroEvent,
  positioning: PositioningAnalysis | null,
  socialSummary: string,
  playbookStats: { beats: number; misses: number; total: number; beatWinRate: number } | null
): Promise<PreEventBriefing> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return buildRulesBriefing(event, positioning, playbookStats);
  }

  const prompt = `You are a macro trading strategist. Generate a pre-event briefing for a trader.

EVENT: ${event.title}
COUNTRY: ${event.country}
FORECAST: ${event.forecast ?? "not available"}
PREVIOUS: ${event.previous ?? "not available"}
CATEGORY: ${event.category}

POSITIONING: ${positioning ? `${positioning.assetName} has moved ${positioning.preEventDrift}% in 5 days (${positioning.percentile}th percentile). ${positioning.crowded ? "CROWDED." : "Not crowded."}` : "No positioning data."}

SOCIAL SENTIMENT: ${socialSummary || "Not available."}

HISTORICAL PLAYBOOK: ${playbookStats ? `${playbookStats.total} instances. ${playbookStats.beats} beats, ${playbookStats.misses} misses. Beat win rate: ${playbookStats.beatWinRate}%.` : "No historical data."}

AFFECTED ASSETS: ${event.affectedAssets.map(a => `${a.direction} ${a.name}: ${a.reasoning}`).join(". ")}

Return JSON only:
{"context":"2-3 sentences setting up today's situation. Reference positioning and sentiment.","scenarios":[{"title":"Scenario name","probability":percent,"condition":"What number/outcome triggers this","tradeAction":"Specific: Buy X, sell Y","entry":"When to enter","risk":"Key risk for this scenario"}],"keyRisk":"The single biggest risk across all scenarios"}

3 scenarios. Probabilities sum to ~100. Be specific about entry timing and levels. Reference the positioning data.`;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 800, messages: [{ role: "user", content: prompt }] });
    const text = msg.content.filter(b => b.type === "text").map(b => "text" in b ? b.text : "").join("");
    const parsed = JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    return { ...parsed, source: "ai" };
  } catch {
    return buildRulesBriefing(event, positioning, playbookStats);
  }
}

function buildRulesBriefing(
  event: MacroEvent,
  positioning: PositioningAnalysis | null,
  stats: { beats: number; misses: number; total: number; beatWinRate: number } | null
): PreEventBriefing {
  const posNote = positioning
    ? `${positioning.assetName} has ${positioning.crowded ? "significantly " : ""}drifted ${positioning.preEventDrift > 0 ? "higher" : "lower"} into this event.`
    : "";
  const statsNote = stats ? `Historically, this event has beaten consensus ${stats.beats} of ${stats.total} times.` : "";

  return {
    context: `${event.title} is due ${event.forecast ? `with consensus at ${event.forecast} (previous: ${event.previous})` : "soon"}. ${posNote} ${statsNote}`.trim(),
    scenarios: [
      {
        title: "Consensus beat",
        probability: stats ? Math.round(stats.beats / stats.total * 100) : 45,
        condition: event.forecast ? `Above ${event.forecast}` : "Above expectations",
        tradeAction: event.affectedAssets[0] ? `${event.affectedAssets[0].direction === "long" ? "Buy" : "Sell"} ${event.affectedAssets[0].name}` : "Trade in expected direction",
        entry: "15 minutes after release for confirmation",
        risk: positioning?.crowded ? "Market already positioned — beat may produce muted reaction" : "Reversal risk if follow-through is weak",
      },
      {
        title: "Inline with consensus",
        probability: stats ? Math.round((stats.total - stats.beats - stats.misses) / stats.total * 100) : 30,
        condition: event.forecast ? `At ${event.forecast}` : "In line with expectations",
        tradeAction: "No trade — muted reaction expected",
        entry: "Stand aside",
        risk: "Whipsaw in both directions before settling",
      },
      {
        title: "Surprise miss",
        probability: stats ? Math.round(stats.misses / stats.total * 100) : 25,
        condition: event.forecast ? `Below ${event.forecast}` : "Below expectations",
        tradeAction: event.affectedAssets[0] ? `${event.affectedAssets[0].direction === "long" ? "Sell" : "Buy"} ${event.affectedAssets[0].name}` : "Trade against expected direction",
        entry: "At release — miss reactions tend to be sharp and immediate",
        risk: "V-shaped recovery if the miss is seen as temporary",
      },
    ],
    keyRisk: positioning?.crowded
      ? "The market is pre-positioned. Even a correct call may not produce the expected return."
      : "Event risk: unexpected outcomes produce sharp, fast moves. Size appropriately.",
    source: "rules",
  };
}
