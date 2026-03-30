/**
 * AI Backtest Advisor — thinks like a real trader, not a parameter grid search.
 *
 * A real trader optimising a setup would:
 * 1. Look at WHY losses happened — was it noise stopping them out,
 *    or genuine trend reversal?
 * 2. Check if high-similarity matches perform better than weak matches
 * 3. Look at timing — do winners resolve quickly while losers linger?
 * 4. Consider asymmetry — wider stop + tighter target may work better
 * 5. Filter by volume confirmation
 * 6. Suggest entirely different approaches if parameters can't fix it
 */

interface ScenarioForAI {
  entryDate: string; exitDate: string; returnPercent: number; daysHeld: number;
  won: boolean; exitReason: "target" | "stop" | "time"; similarity: number; narrative: string;
}

interface SummaryForAI {
  winRate: number; scenarioCount: number; profitFactor: number;
  avgReturn: number; avgDaysHeld: number; bestReturn: number; worstReturn: number;
}

export interface AIAdvisorSuggestion {
  title: string;
  approach: string;         // what to change (not just "widen stop" but the reasoning)
  params: { sl?: number; tp?: number; hold?: number }; // concrete values to test
  expectedImprovement: string;
  confidence: "high" | "medium" | "low";
}

export interface AIAdvisorResult {
  analysis: string;
  suggestions: AIAdvisorSuggestion[];
  overallAssessment: string;
  source: "ai" | "rules";
}

export async function analyseBacktestWithAI(
  symbol: string, direction: string, setupType: string,
  currentParams: { stopLoss: number; takeProfit: number; maxHold: number },
  summary: SummaryForAI, scenarios: ScenarioForAI[]
): Promise<AIAdvisorResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || scenarios.length < 3) return buildSmartAdvice(summary, scenarios, currentParams);

  const scenarioText = scenarios.slice(0, 15).map((s, i) =>
    `${i+1}. ${s.entryDate}→${s.exitDate}: ${s.won?"WIN":"LOSS"} ${s.returnPercent>0?"+":""}${s.returnPercent}% (${s.exitReason}, ${s.daysHeld}d, ${s.similarity}% match)`
  ).join("\n");

  const prompt = `You are an experienced day trader reviewing backtest results. Think about what a REAL trader would change — not just stop/target numbers, but the approach.

SETUP: ${direction} ${symbol} (${setupType})
PARAMS: Stop ${currentParams.stopLoss}%, Target ${currentParams.takeProfit}%, Max hold ${currentParams.maxHold}d
RESULTS: ${summary.winRate}% WR, ${summary.scenarioCount} scenarios, ${summary.profitFactor}:1 PF, avg ${summary.avgReturn}%

SCENARIOS:
${scenarioText}

Think about:
- Are losses from stop-outs (noise) or genuine reversals? If noise → widen stop.
- Do high-similarity matches (>70%) perform better? If yes → suggest filtering.
- Do winners resolve quickly but losers linger? If yes → tighten hold period.
- Would asymmetric R:R work? Sometimes 3% stop + 2% target (1:0.67) beats 2%/3% (1:1.5) if win rate jumps.
- Is volume a factor in the narratives?

Return JSON only, max 3 suggestions. Each must have concrete params to test:
{"analysis":"2-3 sentences about the pattern you see in wins vs losses",
"suggestions":[{"title":"Short title","approach":"Why this change works — reference specific scenarios","params":{"sl":3,"tp":2,"hold":7},"expectedImprovement":"Specific: scenarios X and Y would flip","confidence":"high"}],
"overallAssessment":"One sentence — is this fixable or should they look elsewhere?"}`;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 800, messages: [{ role: "user", content: prompt }] });
    const text = msg.content.filter(b => b.type === "text").map(b => "text" in b ? b.text : "").join("");
    const parsed = JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    return {
      analysis: parsed.analysis || "",
      suggestions: (parsed.suggestions || []).slice(0, 3).map((s: AIAdvisorSuggestion) => ({
        title: s.title || "", approach: s.approach || "", params: s.params || {},
        expectedImprovement: s.expectedImprovement || "", confidence: s.confidence || "medium",
      })),
      overallAssessment: parsed.overallAssessment || "",
      source: "ai",
    };
  } catch { return buildSmartAdvice(summary, scenarios, currentParams); }
}

function buildSmartAdvice(summary: SummaryForAI, scenarios: ScenarioForAI[], params: { stopLoss: number; takeProfit: number; maxHold: number }): AIAdvisorResult {
  const suggestions: AIAdvisorSuggestion[] = [];
  const winners = scenarios.filter(s => s.won);
  const losers = scenarios.filter(s => !s.won);
  const stops = scenarios.filter(s => s.exitReason === "stop");
  const timeouts = scenarios.filter(s => s.exitReason === "time");
  const avgWinDays = winners.length > 0 ? winners.reduce((s, r) => s + r.daysHeld, 0) / winners.length : 0;
  const avgLossDays = losers.length > 0 ? losers.reduce((s, r) => s + r.daysHeld, 0) / losers.length : 0;

  // High-similarity filter
  const highSim = scenarios.filter(s => s.similarity >= 70);
  const highSimWR = highSim.length >= 3 ? highSim.filter(s => s.won).length / highSim.length * 100 : null;

  // Stop-out analysis
  if (stops.length > scenarios.length * 0.3) {
    const nearMisses = stops.filter(s => Math.abs(s.returnPercent) < params.stopLoss * 0.7);
    if (nearMisses.length > 0) {
      suggestions.push({
        title: "Widen stop to reduce noise exits",
        approach: `${stops.length} scenarios hit the stop. ${nearMisses.length} were close — the price reversed near the stop level, suggesting noise rather than genuine reversal.`,
        params: { sl: +(params.stopLoss * 1.5).toFixed(1), tp: params.takeProfit, hold: params.maxHold },
        expectedImprovement: `Could recover ${nearMisses.length} scenarios`,
        confidence: nearMisses.length >= 2 ? "high" : "medium",
      });
    }
  }

  // Timing analysis
  if (avgWinDays > 0 && avgWinDays < params.maxHold * 0.4 && avgLossDays > avgWinDays * 2) {
    suggestions.push({
      title: "Cut hold period — winners are fast, losers linger",
      approach: `Winners resolve in ${avgWinDays.toFixed(1)}d but losers take ${avgLossDays.toFixed(1)}d. Cutting the hold period traps less capital in losing positions.`,
      params: { sl: params.stopLoss, tp: params.takeProfit, hold: Math.max(3, Math.ceil(avgWinDays * 1.5)) },
      expectedImprovement: "Reduces time exposed without losing winners",
      confidence: "high",
    });
  }

  // Asymmetric R:R
  if (summary.winRate < 55 && stops.length > timeouts.length) {
    suggestions.push({
      title: "Try asymmetric R:R — wider stop, tighter target",
      approach: "When win rate is low and stops dominate, flipping the ratio (wider stop, tighter target) often increases win rate enough to compensate for smaller wins.",
      params: { sl: +(params.stopLoss * 1.5).toFixed(1), tp: +(params.takeProfit * 0.7).toFixed(1), hold: params.maxHold },
      expectedImprovement: "Fewer stop-outs may push win rate above 60%",
      confidence: "medium",
    });
  }

  // High-similarity filter suggestion
  if (highSimWR !== null && highSimWR > summary.winRate + 10) {
    suggestions.push({
      title: "Only trade high-confidence matches",
      approach: `Scenarios with ≥70% similarity have ${highSimWR.toFixed(0)}% win rate vs ${summary.winRate}% overall. Filtering to strong matches improves quality.`,
      params: { sl: params.stopLoss, tp: params.takeProfit, hold: params.maxHold },
      expectedImprovement: `Win rate jumps to ~${highSimWR.toFixed(0)}% (fewer trades but better quality)`,
      confidence: "high",
    });
  }

  // Timeout analysis
  if (timeouts.length > scenarios.length * 0.3) {
    suggestions.push({
      title: "Extend hold or tighten target",
      approach: `${timeouts.length} scenarios timed out — the move needed more time or the target was too ambitious.`,
      params: { sl: params.stopLoss, tp: +(params.takeProfit * 0.75).toFixed(1), hold: Math.min(params.maxHold + 5, 20) },
      expectedImprovement: "Some timeouts become target hits",
      confidence: "medium",
    });
  }

  // Only return suggestions that would materially help
  const material = suggestions.filter(s => s.confidence === "high" || suggestions.length <= 2);

  return {
    analysis: `${summary.scenarioCount} scenarios: ${summary.winRate}% won. ${stops.length} stopped out, ${timeouts.length} timed out. Winners took ${avgWinDays.toFixed(1)}d avg, losers ${avgLossDays.toFixed(1)}d.${highSimWR !== null ? ` High-similarity matches: ${highSimWR.toFixed(0)}% WR.` : ""}`,
    suggestions: material.slice(0, 3),
    overallAssessment: summary.winRate >= 60 && summary.profitFactor >= 1.3
      ? "Solid setup — the suggestions above are optimisations, not fixes."
      : summary.winRate >= 45
        ? "Marginal — the modifications above could make this tradeable."
        : "Weak setup — parameter changes alone may not fix this. Consider a different entry approach or direction.",
    source: "rules",
  };
}
