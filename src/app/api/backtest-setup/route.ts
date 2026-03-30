/**
 * Backtest Setup API — runs a backtest for a specific instrument + direction.
 * Uses real historical data from Yahoo/Polygon/CoinGecko.
 */

import { NextResponse } from "next/server";
import { getMarketDataProvider } from "@/services/market-data";
import { runBacktest } from "@/services/backtest";
import { analyseBacktestWithAI } from "@/services/ai-backtest-advisor";
import { batchNarrativeMatch } from "@/services/historical-news";
import { getNewsProvider } from "@/services/news";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { symbol, direction, stopLossPercent = 2, takeProfitPercent = 3, maxHoldDays = 10, setupType = "unknown", includeAIAdvice = false } = await request.json();

    if (!symbol || !direction) {
      return NextResponse.json({ error: "symbol and direction required" }, { status: 400 });
    }

    const provider = getMarketDataProvider();
    const historical = await provider.getHistorical(symbol, 420); // 365 trading days + buffer for signal window

    const prices = historical.map(d => d.price);
    const volumes = historical.map(d => d.volume ?? 0);
    const dates = historical.map(d => d.timestamp.split("T")[0]);

    if (prices.length < 30) {
      return NextResponse.json({ error: "Insufficient data", detail: `${prices.length} bars available, need 30+` }, { status: 422 });
    }

    const entryPrice = prices[prices.length - 1];

    const result = runBacktest(
      { asset: symbol, direction, entryPrice, stopLossPercent, takeProfitPercent, maxHoldDays, lookbackMonths: 12, tradeAmount: 1000, leverage: 1 },
      prices, volumes, dates,
      { articleCount: 0, avgSentiment: 0, sentimentLabel: "neutral", topHeadline: null, socialScore: 0, socialAgreement: 0 }
    );

    // Fetch current headlines + historical narrative for top scenarios
    const newsProvider = getNewsProvider();
    const currentNews = await newsProvider.getNewsBySymbol(symbol, 5).catch(() => []);
    const currentHeadlines = currentNews.map(a => a.title).filter(Boolean);

    const entryDates = result.scenarios.slice(0, 5).map(s => s.entryDate);
    const narrativeMatches = await batchNarrativeMatch(symbol, entryDates, currentHeadlines, 5).catch(() => new Map());

    const response = {
      symbol,
      direction,
      dataPoints: prices.length,
      dateRange: { from: dates[0], to: dates[dates.length - 1] },
      summary: result.summary,
      scenarios: result.scenarios.map(s => {
        const nm = narrativeMatches.get(s.entryDate);
        return {
          entryDate: s.entryDate, exitDate: s.exitDate, entryPrice: s.entryPrice,
          exitPrice: s.exitPrice, exitReason: s.exitReason, returnPercent: s.returnPercent,
          daysHeld: s.daysHeld, won: s.won, similarity: s.similarity,
          matchReason: s.matchReason, narrative: s.narrative, pricePathPercent: s.pricePathPercent,
          // Historical news cross-reference
          narrativeMatch: nm ? {
            score: nm.narrativeScore,
            summary: nm.narrativeSummary,
            matchingKeywords: nm.matchingKeywords,
            historicalHeadlines: nm.historicalHeadlines.slice(0, 3).map((h: { title: string }) => h.title),
          } : null,
        };
      }),
      thesis: result.thesis,
      recommendation: result.recommendation,
    };

    if (includeAIAdvice) {
      const scenariosForAI = result.scenarios.map(s => ({
        entryDate: s.entryDate, exitDate: s.exitDate, returnPercent: s.returnPercent,
        daysHeld: s.daysHeld, won: s.won, exitReason: s.exitReason,
        similarity: s.similarity, narrative: s.narrative,
      }));
      const aiAdvice = await analyseBacktestWithAI(
        symbol, direction, setupType,
        { stopLoss: stopLossPercent, takeProfit: takeProfitPercent, maxHold: maxHoldDays },
        result.summary, scenariosForAI
      );
      return NextResponse.json({ ...response, aiAdvice });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[api/backtest-setup] Error:", error);
    return NextResponse.json({ error: "Backtest failed" }, { status: 500 });
  }
}
