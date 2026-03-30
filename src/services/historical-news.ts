/**
 * Historical News — fetches news articles from a specific date in the past.
 *
 * Uses GDELT DOC 2.0 API which has a massive historical archive.
 * Given a date + keywords, returns what headlines were running that day.
 *
 * This enables narrative-matching: when a backtest scenario from
 * March 2025 matches today's price conditions, we can also check
 * if the news catalyst was similar — making the match much stronger.
 */

export interface HistoricalHeadline {
  title: string;
  source: string;
  date: string;
  url: string;
}

export interface NarrativeMatch {
  historicalHeadlines: HistoricalHeadline[];
  currentHeadlines: string[];
  matchingKeywords: string[];
  narrativeScore: number;    // 0-100: how similar the news narrative is
  narrativeSummary: string;  // "Both periods feature OPEC supply concerns"
}

// Keyword sets per asset for historical news search
const ASSET_KEYWORDS: Record<string, string[]> = {
  "BTC-USD": ["bitcoin", "crypto", "btc"],
  "ETH-USD": ["ethereum", "crypto", "eth"],
  "SOL-USD": ["solana", "crypto"],
  "BZ=F": ["brent", "crude oil", "opec"],
  "CL=F": ["crude oil", "wti", "opec"],
  "GC=F": ["gold", "precious metals"],
  "SI=F": ["silver", "precious metals"],
  "EUR-USD": ["euro", "ecb", "eurozone"],
  "GBP-USD": ["pound", "sterling", "bank of england"],
  "USD-JPY": ["yen", "japan", "bank of japan"],
  "SPY": ["s&p 500", "wall street", "stock market"],
  "NVDA": ["nvidia", "semiconductor", "AI chip"],
  "DXY": ["dollar", "federal reserve", "fed rate"],
};

/**
 * Fetch headlines from GDELT for a specific date range + asset.
 */
async function fetchGdeltHistorical(
  keywords: string[],
  dateStr: string, // YYYY-MM-DD
  windowDays: number = 2
): Promise<HistoricalHeadline[]> {
  const startDate = new Date(dateStr);
  startDate.setDate(startDate.getDate() - windowDays);
  const endDate = new Date(dateStr);
  endDate.setDate(endDate.getDate() + windowDays);

  const startStr = startDate.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const endStr = endDate.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const query = keywords.join(" OR ");

  try {
    const params = new URLSearchParams({
      query,
      mode: "ArtList",
      format: "json",
      maxrecords: "10",
      sort: "DateDesc",
      startdatetime: startStr,
      enddatetime: endStr,
    });

    const res = await fetch(
      `https://api.gdeltproject.org/api/v2/doc/doc?${params}`,
      { signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } } // cache 1hr (historical data doesn't change)
    );

    if (!res.ok) return [];

    const data = await res.json();
    if (!data.articles || !Array.isArray(data.articles)) return [];

    return data.articles
      .filter((a: { language?: string }) => !a.language || a.language === "English")
      .slice(0, 6)
      .map((a: { title: string; domain: string; seendate: string; url: string }) => ({
        title: a.title,
        source: a.domain?.split(".")[0] ?? "Unknown",
        date: a.seendate ? parseGdeltDate(a.seendate) : dateStr,
        url: a.url,
      }));
  } catch {
    return [];
  }
}

function parseGdeltDate(seendate: string): string {
  if (seendate.length < 8) return "";
  return `${seendate.slice(0, 4)}-${seendate.slice(4, 6)}-${seendate.slice(6, 8)}`;
}

/**
 * Compare historical headlines with current headlines using keyword overlap.
 */
function computeNarrativeMatch(
  historicalHeadlines: HistoricalHeadline[],
  currentHeadlines: string[],
  assetKeywords: string[]
): { matchingKeywords: string[]; score: number; summary: string } {
  if (historicalHeadlines.length === 0 || currentHeadlines.length === 0) {
    return { matchingKeywords: [], score: 0, summary: "No historical news data available for comparison" };
  }

  const historicalText = historicalHeadlines.map(h => h.title.toLowerCase()).join(" ");
  const currentText = currentHeadlines.map(h => h.toLowerCase()).join(" ");

  // Extract significant words (longer than 4 chars, not common words)
  const COMMON = new Set(["about", "after", "again", "being", "between", "could", "during", "every", "first", "found", "going", "great", "might", "never", "other", "right", "since", "still", "their", "there", "these", "think", "those", "under", "until", "where", "which", "while", "world", "would", "years", "market", "markets", "price", "prices", "trade", "trading", "stock", "stocks", "says", "report", "according"]);

  function extractWords(text: string): Set<string> {
    return new Set(
      text.split(/\W+/)
        .filter(w => w.length > 4 && !COMMON.has(w))
    );
  }

  const histWords = extractWords(historicalText);
  const currWords = extractWords(currentText);

  const matching = [...histWords].filter(w => currWords.has(w));
  const matchingWithAsset = [...matching, ...assetKeywords.filter(kw => historicalText.includes(kw) && currentText.includes(kw))];
  const uniqueMatching = [...new Set(matchingWithAsset)];

  // Score: based on keyword overlap relative to total vocabulary
  const totalUnique = new Set([...histWords, ...currWords]).size;
  const overlapRatio = totalUnique > 0 ? uniqueMatching.length / Math.min(histWords.size, currWords.size) : 0;
  const score = Math.min(Math.round(overlapRatio * 100 * 2), 100); // scale up, cap at 100

  // Summary
  let summary: string;
  if (score >= 60) {
    summary = `Strong narrative match — both periods feature: ${uniqueMatching.slice(0, 4).join(", ")}`;
  } else if (score >= 30) {
    summary = `Partial narrative overlap — shared themes: ${uniqueMatching.slice(0, 3).join(", ")}`;
  } else if (uniqueMatching.length > 0) {
    summary = `Weak narrative match — some shared keywords: ${uniqueMatching.slice(0, 2).join(", ")}`;
  } else {
    summary = "Different news environment — the catalysts then were different from now";
  }

  return { matchingKeywords: uniqueMatching.slice(0, 6), score, summary };
}

/**
 * For a backtest scenario, fetch historical news and compare with current.
 */
export async function getScenarioNarrativeMatch(
  symbol: string,
  entryDate: string,
  currentHeadlines: string[]
): Promise<NarrativeMatch> {
  const keywords = ASSET_KEYWORDS[symbol] ?? [symbol.replace(/[-=]/g, " ")];
  const historicalHeadlines = await fetchGdeltHistorical(keywords, entryDate);

  const { matchingKeywords, score, summary } = computeNarrativeMatch(
    historicalHeadlines,
    currentHeadlines,
    keywords
  );

  return {
    historicalHeadlines,
    currentHeadlines,
    matchingKeywords,
    narrativeScore: score,
    narrativeSummary: summary,
  };
}

/**
 * Batch: fetch narrative matches for multiple scenarios.
 * Rate-limited to avoid hammering GDELT.
 */
export async function batchNarrativeMatch(
  symbol: string,
  entryDates: string[],
  currentHeadlines: string[],
  maxScenarios: number = 5
): Promise<Map<string, NarrativeMatch>> {
  const results = new Map<string, NarrativeMatch>();
  const toFetch = entryDates.slice(0, maxScenarios);

  // Fetch sequentially with small delay to be respectful to GDELT
  for (const date of toFetch) {
    const match = await getScenarioNarrativeMatch(symbol, date, currentHeadlines);
    results.set(date, match);
    // Small delay between requests
    await new Promise(r => setTimeout(r, 200));
  }

  return results;
}
