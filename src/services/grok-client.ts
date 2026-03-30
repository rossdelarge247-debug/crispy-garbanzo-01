/**
 * Grok AI — client-side via Puter.js. No API key needed.
 *
 * Uses the puter.ai.chat() function which handles auth automatically
 * through the Puter "User-Pays" model — free for developers.
 *
 * Must be called from a client component ("use client").
 */

let puterLoaded = false;
let puterPromise: Promise<void> | null = null;

/** Load puter.js script in the browser */
function ensurePuter(): Promise<void> {
  if (puterLoaded) return Promise.resolve();
  if (puterPromise) return puterPromise;

  puterPromise = new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(); return; }
    // Check if already loaded
    if ((window as unknown as Record<string, unknown>).puter) { puterLoaded = true; resolve(); return; }

    const script = document.createElement("script");
    script.src = "https://js.puter.com/v2/";
    script.onload = () => { puterLoaded = true; resolve(); };
    script.onerror = () => resolve(); // fail silently
    document.head.appendChild(script);
  });

  return puterPromise;
}

async function callGrok(prompt: string): Promise<string | null> {
  if (typeof window === "undefined") return null;

  await ensurePuter();

  const puter = (window as unknown as Record<string, unknown>).puter as {
    ai: { chat: (msg: string, opts: { model: string }) => Promise<{ message: { content: string } }> };
  } | undefined;

  if (!puter?.ai) return null;

  try {
    const response = await puter.ai.chat(prompt, { model: "x-ai/grok-4-1-fast" });
    return response?.message?.content ?? null;
  } catch {
    return null;
  }
}

/**
 * Get Grok's sentiment assessment — client-side, no API key.
 */
export async function getGrokSentiment(
  symbol: string,
  direction: string,
  newsHeadlines: string[]
): Promise<{ sentiment: string; alignment: string; reasoning: string } | null> {
  const headlineText = newsHeadlines.slice(0, 5).join("\n");
  const raw = await callGrok(
    `Market sentiment analyst. Headlines about ${symbol} for a ${direction} trade:\n${headlineText || "No headlines."}\nReply JSON only: {"sentiment":"bullish/bearish/neutral","alignment":"aligned/divergent/neutral","reasoning":"One sentence"}`
  );
  if (!raw) return null;
  try { return JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()); }
  catch { return null; }
}

/**
 * Get Grok's trade opinion — second opinion, client-side.
 */
export async function getGrokTradeOpinion(
  symbol: string,
  direction: string,
  thesis: string,
  winRate: number,
  profitFactor: number
): Promise<{ opinion: string; agrees: boolean; caveat: string } | null> {
  const raw = await callGrok(
    `Experienced trader second opinion. Trade: ${direction} ${symbol}. Thesis: ${thesis}. Backtest: ${winRate}% win rate, ${profitFactor}:1 PF. Reply JSON only: {"opinion":"1-2 sentences","agrees":true/false,"caveat":"One key risk"}`
  );
  if (!raw) return null;
  try { return JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()); }
  catch { return null; }
}
