import { NextResponse } from "next/server";
import { getMarketDataProvider } from "@/services/market-data";
import { getNewsProvider } from "@/services/news";
import { getSocialSentiment } from "@/services/social-sentiment";
import { runBacktest, type BacktestConfig } from "@/services/backtest";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      asset,
      direction,
      entryPrice,
      stopLossPercent = 2,
      takeProfitPercent = 3,
      maxHoldDays = 10,
      lookbackMonths = 12,
      tradeAmount = 1000,
      leverage = 10,
      flagId,          // optional — used to fetch news context
    } = body;

    if (!asset || !direction || !entryPrice) {
      return NextResponse.json({ error: "Missing required fields: asset, direction, entryPrice" }, { status: 400 });
    }

    // Fetch historical price data, news, and sentiment in parallel
    const lookbackDays = lookbackMonths * 30 + 60;
    const provider = getMarketDataProvider();
    const newsProvider = getNewsProvider();

    const [historical, newsArticles, socialSentiment] = await Promise.all([
      provider.getHistorical(asset, lookbackDays),
      newsProvider.getNewsBySymbol(asset, 10).catch(() => []),
      getSocialSentiment(asset).catch(() => undefined),
    ]);

    const prices = historical.map(d => d.price);
    const volumes = historical.map(d => d.volume ?? 0);
    const dates = historical.map(d => d.timestamp.split("T")[0]);

    if (prices.length < 30) {
      return NextResponse.json({
        error: "Insufficient historical data",
        detail: `Only ${prices.length} data points available. Need at least 30 for meaningful analysis.`,
      }, { status: 422 });
    }

    // Extract news context for the thesis
    const newsHeadlines = newsArticles
      .filter(a => a.title)
      .slice(0, 5)
      .map(a => ({
        title: a.title,
        source: a.source,
        date: a.publishedAt,
        sentiment: a.sentiment,
      }));

    const newsSentimentAvg = newsArticles.length > 0
      ? newsArticles.reduce((sum, a) => sum + a.sentiment, 0) / newsArticles.length
      : 0;

    const socialContext = socialSentiment ? {
      compositeScore: socialSentiment.compositeScore,
      compositeLabel: socialSentiment.compositeLabel,
      agreement: socialSentiment.agreement,
      signals: socialSentiment.signals
        .filter(s => s.volume > 0 && s.source !== "composite")
        .map(s => ({
          source: s.source,
          label: s.label,
          score: s.score,
          volume: s.volume,
          topPost: s.samplePosts[0] ?? null,
        })),
    } : null;

    // Determine data source
    const isLiveData = !!process.env.POLYGON_API_KEY;

    const config: BacktestConfig = {
      asset,
      direction,
      entryPrice,
      stopLossPercent,
      takeProfitPercent,
      maxHoldDays,
      lookbackMonths,
      tradeAmount,
      leverage,
    };

    const result = runBacktest(config, prices, volumes, dates, {
      articleCount: newsArticles.length,
      avgSentiment: newsSentimentAvg,
      sentimentLabel: newsSentimentAvg > 0.15 ? "bullish" : newsSentimentAvg < -0.15 ? "bearish" : "neutral",
      topHeadline: newsHeadlines[0]?.title ?? null,
      socialScore: socialSentiment?.compositeScore ?? 0,
      socialAgreement: socialSentiment?.agreement ?? 0,
    });

    // Enrich result with real news/sentiment context
    const enriched = {
      ...result,
      newsContext: {
        headlines: newsHeadlines,
        articleCount: newsArticles.length,
        avgSentiment: +newsSentimentAvg.toFixed(2),
        sentimentLabel: newsSentimentAvg > 0.15 ? "bullish" : newsSentimentAvg < -0.15 ? "bearish" : "neutral",
      },
      socialContext,
      dataSource: {
        prices: isLiveData ? "polygon" : "demo",
        news: newsArticles.length > 0 && newsArticles[0]?.id?.startsWith("gdelt") ? "gdelt" : newsArticles.length > 0 ? "newsapi" : "demo",
        sentiment: socialContext ? "live" : "demo",
        priceBarCount: prices.length,
      },
    };

    return NextResponse.json(enriched, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (error) {
    console.error("[api/backtest] Error:", error);
    return NextResponse.json({ error: "Backtest failed" }, { status: 500 });
  }
}
