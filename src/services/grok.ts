/**
 * Grok AI Service — second opinion via Puter.com's free Grok API.
 *
 * Uses the OpenAI-compatible endpoint at api.puter.com.
 * Provides: sentiment analysis + alternative trade analysis.
 * No xAI key needed — just PUTER_AUTH_TOKEN.
 *
 * Endpoint: https://api.puter.com/puterai/openai/v1/chat/completions
 * Model: grok-4-1-fast
 */

const PUTER_BASE = "https://api.puter.com/puterai/openai/v1/chat/completions";

async function callGrok(prompt: string, maxTokens = 800): Promise<string | null> {
  const token = process.env.PUTER_AUTH_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(PUTER_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: "grok-4-1-fast",
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

/**
 * Grok sentiment analysis — independent from Claude's assessment.
 */
export async function getGrokSentiment(
  symbol: string,
  direction: string,
  newsHeadlines: string[]
): Promise<{ sentiment: string; alignment: string; reasoning: string } | null> {
  const headlineText = newsHeadlines.slice(0, 5).join("\n");

  const prompt = `You are a market sentiment analyst. Given these recent headlines about ${symbol} and a proposed ${direction} trade, assess sentiment alignment.

Headlines:
${headlineText || "No recent headlines available."}

Reply in JSON only:
{"sentiment":"bullish" or "bearish" or "neutral","alignment":"aligned" or "divergent" or "neutral","reasoning":"One sentence explaining your assessment"}`;

  const raw = await callGrok(prompt);
  if (!raw) return null;

  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch { return null; }
}

/**
 * Grok trade analysis — second opinion on a trade setup.
 */
export async function getGrokTradeOpinion(
  symbol: string,
  direction: string,
  thesis: string,
  winRate: number,
  profitFactor: number
): Promise<{ opinion: string; agrees: boolean; caveat: string } | null> {
  const prompt = `You are an experienced trader giving a second opinion.

Trade: ${direction} ${symbol}
Thesis: ${thesis}
Backtest: ${winRate}% win rate, ${profitFactor}:1 profit factor

Reply in JSON only:
{"opinion":"1-2 sentences — your honest take on this trade","agrees":true or false,"caveat":"One key risk or consideration the trader should know"}`;

  const raw = await callGrok(prompt);
  if (!raw) return null;

  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch { return null; }
}
