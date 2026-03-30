/**
 * AI Backtest Advisor — Claude analyses backtest outcomes and suggests
 * specific, intelligent modifications grounded in the data.
 *
 * Unlike the rules-based advisor that just tries different numbers,
 * this reads the actual scenario outcomes and reasons about:
 * - Why winners won and losers lost
 * - What patterns emerge in timing, entry conditions, exits
 * - What parameter changes would address the specific failure modes
 * - Whether the setup type is appropriate for current conditions
 */

interface ScenarioForAI {
  entryDate: string;
  exitDate: string;
  returnPercent: number;
  daysHeld: number;
  won: boolean;
  exitReason: "target" | "stop" | "time";
  similarity: number;
  narrative: string;
}

interface BacktestSummaryForAI {
  winRate: number;
  scenarioCount: number;
  profitFactor: number;
  avgReturn: number;
  avgDaysHeld: number;
  bestReturn: number;
  worstReturn: number;
}

export interface AIAdvisorSuggestion {
  title: string;
  rationale: string;
  action: string;           // "Widen stop to 3%" or "Reduce hold to 5 days"
  expectedImpact: string;   // "Could improve win rate by ~10%"
  confidence: "high" | "medium" | "low";
}

export interface AIAdvisorResult {
  analysis: string;          // paragraph explaining what the data shows
  suggestions: AIAdvisorSuggestion[];
  overallAssessment: string; // "This is a solid setup" / "Needs work" / "Consider skipping"
  source: "ai" | "rules";
}

export async function analyseBacktestWithAI(
  symbol: string,
  direction: string,
  setupType: string,
  currentParams: { stopLoss: number; takeProfit: number; maxHold: number },
  summary: BacktestSummaryForAI,
  scenarios: ScenarioForAI[]
): Promise<AIAdvisorResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || scenarios.length < 3) {
    return buildRulesBasedAdvice(summary, scenarios, currentParams);
  }

  const scenarioText = scenarios.slice(0, 15).map((s, i) =>
    `${i + 1}. ${s.entryDate}→${s.exitDate}: ${s.won ? "WIN" : "LOSS"} ${s.returnPercent > 0 ? "+" : ""}${s.returnPercent}% (${s.exitReason}, ${s.daysHeld}d, ${s.similarity}% match) — ${s.narrative}`
  ).join("\n");

  const prompt = `You are an experienced quant trader reviewing backtest results. Be concise and specific.

SETUP: ${direction} ${symbol} (${setupType})
PARAMS: Stop ${currentParams.stopLoss}%, Target ${currentParams.takeProfit}%, Max hold ${currentParams.maxHold} days

RESULTS:
Win rate: ${summary.winRate}% | Scenarios: ${summary.scenarioCount} | PF: ${summary.profitFactor}:1
Avg return: ${summary.avgReturn}% | Avg hold: ${summary.avgDaysHeld}d
Best: +${summary.bestReturn}% | Worst: ${summary.worstReturn}%

SCENARIOS:
${scenarioText}

Return raw JSON:
{
  "analysis": "2-3 sentences. What pattern do you see? Why did winners win and losers lose? Be specific about the data.",
  "suggestions": [
    {
      "title": "Short title",
      "rationale": "Why this change, based on the specific scenarios above",
      "action": "Specific change: 'Widen stop to 3%' or 'Enter only when similarity >70%'",
      "expectedImpact": "Concrete: 'Would have saved scenarios 3 and 7, improving win rate to ~70%'",
      "confidence": "high" or "medium" or "low"
    }
  ],
  "overallAssessment": "One sentence: is this setup worth trading with modifications, or should the trader look elsewhere?"
}

Max 3-4 suggestions. Each must reference specific scenarios by number. No generic advice.`;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .filter(block => block.type === "text")
      .map(block => ("text" in block ? block.text : ""))
      .join("");

    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      analysis: parsed.analysis || "",
      suggestions: (parsed.suggestions || []).slice(0, 4).map((s: AIAdvisorSuggestion) => ({
        title: s.title || "",
        rationale: s.rationale || "",
        action: s.action || "",
        expectedImpact: s.expectedImpact || "",
        confidence: s.confidence || "medium",
      })),
      overallAssessment: parsed.overallAssessment || "",
      source: "ai",
    };
  } catch {
    return buildRulesBasedAdvice(summary, scenarios, currentParams);
  }
}

function buildRulesBasedAdvice(
  summary: BacktestSummaryForAI,
  scenarios: ScenarioForAI[],
  params: { stopLoss: number; takeProfit: number; maxHold: number }
): AIAdvisorResult {
  const suggestions: AIAdvisorSuggestion[] = [];

  const stops = scenarios.filter(s => s.exitReason === "stop").length;
  const timeouts = scenarios.filter(s => s.exitReason === "time").length;
  const winners = scenarios.filter(s => s.won);
  const avgWinDays = winners.length > 0 ? winners.reduce((s, r) => s + r.daysHeld, 0) / winners.length : 0;

  if (stops > scenarios.length * 0.35) {
    suggestions.push({
      title: "Widen stop loss",
      rationale: `${stops} of ${scenarios.length} scenarios hit the stop. Some may have recovered if given more room.`,
      action: `Try ${(params.stopLoss * 1.5).toFixed(1)}% stop instead of ${params.stopLoss}%`,
      expectedImpact: "Could recover 1-2 losing scenarios",
      confidence: "medium",
    });
  }

  if (timeouts > scenarios.length * 0.25) {
    suggestions.push({
      title: "Extend hold period",
      rationale: `${timeouts} scenarios timed out without hitting target or stop.`,
      action: `Try ${Math.min(params.maxHold + 5, 20)} days instead of ${params.maxHold}`,
      expectedImpact: "Some timed-out scenarios may reach target with more time",
      confidence: "medium",
    });
  }

  if (avgWinDays > 0 && avgWinDays < params.maxHold * 0.5) {
    suggestions.push({
      title: "Tighten hold period",
      rationale: `Winners resolve in ${avgWinDays.toFixed(1)} days on average — well before the ${params.maxHold}-day limit.`,
      action: `Try ${Math.max(Math.ceil(avgWinDays * 1.5), 3)} days`,
      expectedImpact: "Reduces time exposed to risk without losing winners",
      confidence: "high",
    });
  }

  if (summary.winRate < 50 && summary.profitFactor < 1) {
    suggestions.push({
      title: "Reconsider this setup",
      rationale: `${summary.winRate}% win rate with ${summary.profitFactor}:1 profit factor — the maths doesn't favour this trade.`,
      action: "Try the opposite direction or a different setup type",
      expectedImpact: "May find a better edge",
      confidence: "high",
    });
  }

  return {
    analysis: `${summary.scenarioCount} scenarios tested. ${summary.winRate}% won. ${stops} hit stops, ${timeouts} timed out. Winners resolved in ${avgWinDays.toFixed(1)} days on average.`,
    suggestions,
    overallAssessment: summary.winRate >= 60 && summary.profitFactor >= 1.3
      ? "Solid setup — worth trading with current or suggested parameters."
      : summary.winRate >= 45
        ? "Marginal setup — consider the suggested improvements before committing."
        : "Weak setup — the historical data doesn't support this trade as configured.",
    source: "rules",
  };
}
