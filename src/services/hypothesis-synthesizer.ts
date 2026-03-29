/**
 * Hypothesis Synthesizer
 *
 * Takes the output from all 6 deep analysis frameworks and synthesizes
 * them into actionable, categorized trade hypotheses. Each hypothesis
 * includes a specific asset, direction, timeframe, entry logic, and
 * invalidation condition — derived from the analysis, not guessed.
 *
 * Uses Claude API when ANTHROPIC_API_KEY is set for richer output.
 * Falls back to rules-based extraction when no key is available.
 */

import type {
  MarketFlagDetail,
  Hypothesis,
  Direction,
  TimeHorizon,
} from "@/types";
import type { CompositeSocialSentiment } from "@/services/social-sentiment";
import type { AnalysisResult } from "@/services/ai-analysis";

export interface SynthesizedHypothesis {
  id: string;
  flagId: string;
  title: string;
  asset: string;
  direction: Direction;
  horizon: "day_trade" | "swing_trade" | "position_trade";
  horizonLabel: string;
  confidence: number;
  thesis: string;
  entryLogic: string;
  invalidation: string;
  riskReward: string;
  derivedFrom: string[];   // which analysis frameworks contributed
  status: "active";
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Rules-based synthesis — extract hypotheses from analysis text
// ---------------------------------------------------------------------------

interface ExtractedIdea {
  asset: string;
  direction: Direction;
  reason: string;
  source: string;
}

function extractIdeasFromAnalysis(
  analysisResults: AnalysisResult[],
  flag: MarketFlagDetail
): ExtractedIdea[] {
  const ideas: ExtractedIdea[] = [];
  const primaryAsset = flag.affectedAssets.find(a => a.impact === "primary");

  for (const result of analysisResults) {
    const content = result.content.toLowerCase();

    // Look for directional signals in the text
    for (const asset of flag.affectedAssets) {
      const symbolLower = asset.symbol.toLowerCase();
      const nameLower = asset.name.toLowerCase();

      if (content.includes(symbolLower) || content.includes(nameLower)) {
        // Check for bullish signals
        const bullishSignals = ["long", "buy", "bullish", "upside", "rally", "higher", "climb", "strengthen", "opportunity to go long", "support"];
        const bearishSignals = ["short", "sell", "bearish", "downside", "decline", "lower", "weaken", "put", "hedge", "reduce exposure"];

        let bullCount = 0;
        let bearCount = 0;

        for (const signal of bullishSignals) {
          if (content.includes(signal)) bullCount++;
        }
        for (const signal of bearishSignals) {
          if (content.includes(signal)) bearCount++;
        }

        if (bullCount > bearCount && bullCount >= 2) {
          ideas.push({
            asset: asset.symbol,
            direction: "long",
            reason: `${result.title} analysis suggests upside potential for ${asset.name}`,
            source: result.type,
          });
        } else if (bearCount > bullCount && bearCount >= 2) {
          ideas.push({
            asset: asset.symbol,
            direction: "short",
            reason: `${result.title} analysis suggests downside risk for ${asset.name}`,
            source: result.type,
          });
        }
      }
    }

    // Look for volatility plays
    if (content.includes("volatility") && (content.includes("elevated") || content.includes("spike") || content.includes("expansion"))) {
      if (primaryAsset) {
        ideas.push({
          asset: primaryAsset.symbol,
          direction: "neutral",
          reason: `${result.title} highlights elevated volatility — potential for non-directional strategies`,
          source: result.type,
        });
      }
    }
  }

  return ideas;
}

function synthesizeFromRules(
  flag: MarketFlagDetail,
  analysisResults: AnalysisResult[],
  socialSentiment: CompositeSocialSentiment | null,
  existingHypotheses: Hypothesis[]
): SynthesizedHypothesis[] {
  const ideas = extractIdeasFromAnalysis(analysisResults, flag);
  const now = new Date().toISOString();

  // Deduplicate by asset+direction
  const seen = new Set<string>();
  const uniqueIdeas = ideas.filter(idea => {
    const key = `${idea.asset}-${idea.direction}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Check which ideas already exist as hypotheses
  const existingKeys = new Set(
    existingHypotheses.map(h => {
      const asset = flag.affectedAssets.find(a =>
        h.title.toLowerCase().includes(a.name.toLowerCase()) ||
        h.title.toLowerCase().includes(a.symbol.toLowerCase())
      );
      return asset ? `${asset.symbol}-${h.direction}` : h.title;
    })
  );

  // Build synthesized hypotheses
  const synthesized: SynthesizedHypothesis[] = [];

  for (const idea of uniqueIdeas) {
    const key = `${idea.asset}-${idea.direction}`;
    if (existingKeys.has(key)) continue; // skip duplicates of existing hypotheses

    const asset = flag.affectedAssets.find(a => a.symbol === idea.asset);
    if (!asset) continue;

    // Find all frameworks that support this idea
    const supportingFrameworks = ideas
      .filter(i => i.asset === idea.asset && i.direction === idea.direction)
      .map(i => i.source);

    // Calculate confidence from number of supporting frameworks + sentiment alignment
    let confidence = 30 + supportingFrameworks.length * 10;
    if (socialSentiment) {
      const sentimentAligned =
        (idea.direction === "long" && socialSentiment.compositeScore > 15) ||
        (idea.direction === "short" && socialSentiment.compositeScore < -15);
      if (sentimentAligned) confidence += 10;
      if (socialSentiment.agreement > 60) confidence += 5;
    }
    confidence = Math.min(85, Math.max(15, confidence));

    // Determine time horizon
    let horizon: SynthesizedHypothesis["horizon"];
    let horizonLabel: string;
    let timeHorizon: TimeHorizon;

    if (confidence >= 65 && flag.timeHorizonDays <= 7) {
      horizon = "day_trade";
      horizonLabel = "Day trade (hours to 1 day)";
      timeHorizon = "days";
    } else if (flag.timeHorizonDays > 14) {
      horizon = "position_trade";
      horizonLabel = "Position trade (1-4 weeks)";
      timeHorizon = "weeks";
    } else {
      horizon = "swing_trade";
      horizonLabel = "Swing trade (2-7 days)";
      timeHorizon = "days";
    }

    // Entry logic based on direction
    const entryLogic = idea.direction === "long"
      ? `Look for a pullback or consolidation in ${asset.symbol} as an entry point. Confirm with volume uptick and sentiment holding.`
      : idea.direction === "short"
        ? `Wait for a failed rally or breakdown below recent support in ${asset.symbol}. Confirm with rising volume on the down move.`
        : `Position for a volatility expansion in ${asset.symbol}. Consider straddles, strangles, or range breakout strategies.`;

    // Risk/reward estimate
    const riskReward = confidence >= 60
      ? "Estimated 2:1 or better based on current setup."
      : "Risk/reward is marginal — size small or wait for better entry.";

    const invalidation = idea.direction === "long"
      ? `Break below recent support or a sharp negative catalyst invalidates the long thesis.`
      : idea.direction === "short"
        ? `Break above recent resistance or a positive catalyst invalidates the short thesis.`
        : `Volatility compression or a strong directional move invalidates the non-directional setup.`;

    synthesized.push({
      id: `synth-${flag.id}-${idea.asset}-${idea.direction}-${synthesized.length}`,
      flagId: flag.id,
      title: `${idea.direction === "long" ? "Long" : idea.direction === "short" ? "Short" : "Vol play"} ${asset.name} (${asset.symbol})`,
      asset: asset.symbol,
      direction: idea.direction,
      horizon,
      horizonLabel,
      confidence,
      thesis: idea.reason + `. Supported by ${supportingFrameworks.length} analysis framework${supportingFrameworks.length !== 1 ? "s" : ""}.`,
      entryLogic,
      invalidation,
      riskReward,
      derivedFrom: [...new Set(supportingFrameworks)],
      status: "active",
      createdAt: now,
    });
  }

  return synthesized.sort((a, b) => b.confidence - a.confidence);
}

// ---------------------------------------------------------------------------
// AI-powered synthesis — uses Claude for richer output
// ---------------------------------------------------------------------------

async function synthesizeWithAI(
  flag: MarketFlagDetail,
  analysisResults: AnalysisResult[],
  socialSentiment: CompositeSocialSentiment | null,
  existingHypotheses: Hypothesis[]
): Promise<SynthesizedHypothesis[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return synthesizeFromRules(flag, analysisResults, socialSentiment, existingHypotheses);

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    const analysisContext = analysisResults
      .map(r => `[${r.title}]\n${r.content}`)
      .join("\n\n---\n\n");

    const existingContext = existingHypotheses
      .map(h => `- ${h.title} (${h.direction}, ${h.confidenceScore}%)`)
      .join("\n");

    const socialContext = socialSentiment
      ? `Social sentiment: ${socialSentiment.compositeLabel} (score: ${socialSentiment.compositeScore}, agreement: ${socialSentiment.agreement}%)`
      : "No social sentiment data";

    const prompt = `You are Trade Daddy's hypothesis generator. Based on the analysis below, generate specific trade hypotheses.

MARKET SITUATION: ${flag.title}
AFFECTED ASSETS: ${flag.affectedAssets.map(a => `${a.symbol} (${a.name}, ${a.assetClass})`).join(", ")}
${socialContext}

EXISTING HYPOTHESES (don't duplicate these):
${existingContext || "None"}

ANALYSIS OUTPUT:
${analysisContext}

Generate 3-6 NEW trade hypotheses NOT already covered by existing hypotheses. For each, respond in this exact JSON format:

[
  {
    "title": "Short descriptive title",
    "asset": "SYMBOL",
    "direction": "long" | "short" | "neutral",
    "horizon": "day_trade" | "swing_trade" | "position_trade",
    "confidence": 0-100,
    "thesis": "Why this trade makes sense in 1-2 sentences",
    "entryLogic": "Specific entry condition or trigger",
    "invalidation": "What would prove this wrong",
    "riskReward": "Estimated risk/reward assessment",
    "derivedFrom": ["framework_types_that_support_this"]
  }
]

Rules:
- Each hypothesis must reference a specific asset from the affected list
- Be specific about entry conditions, not vague
- Confidence should reflect how many frameworks support the idea
- Include at least one day trade, one swing trade, and one position trade if possible
- Keep explanations in plain English for non-traders
- Return ONLY valid JSON array, no other text`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .filter(block => block.type === "text")
      .map(block => ("text" in block ? block.text : ""))
      .join("");

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn("[hypothesis-synth] Could not parse AI response as JSON, falling back to rules");
      return synthesizeFromRules(flag, analysisResults, socialSentiment, existingHypotheses);
    }

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      title: string;
      asset: string;
      direction: Direction;
      horizon: "day_trade" | "swing_trade" | "position_trade";
      confidence: number;
      thesis: string;
      entryLogic: string;
      invalidation: string;
      riskReward: string;
      derivedFrom: string[];
    }>;

    const horizonLabels: Record<string, string> = {
      day_trade: "Day trade (hours to 1 day)",
      swing_trade: "Swing trade (2-7 days)",
      position_trade: "Position trade (1-4 weeks)",
    };

    return parsed.map((h, i) => ({
      id: `synth-ai-${flag.id}-${i}`,
      flagId: flag.id,
      title: h.title,
      asset: h.asset,
      direction: h.direction,
      horizon: h.horizon,
      horizonLabel: horizonLabels[h.horizon] || h.horizon,
      confidence: Math.min(90, Math.max(10, h.confidence)),
      thesis: h.thesis,
      entryLogic: h.entryLogic,
      invalidation: h.invalidation,
      riskReward: h.riskReward,
      derivedFrom: h.derivedFrom,
      status: "active" as const,
      createdAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.warn("[hypothesis-synth] AI synthesis failed, using rules:", error);
    return synthesizeFromRules(flag, analysisResults, socialSentiment, existingHypotheses);
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function synthesizeHypotheses(
  flag: MarketFlagDetail,
  analysisResults: AnalysisResult[],
  socialSentiment: CompositeSocialSentiment | null,
  existingHypotheses: Hypothesis[]
): Promise<SynthesizedHypothesis[]> {
  return synthesizeWithAI(flag, analysisResults, socialSentiment, existingHypotheses);
}
