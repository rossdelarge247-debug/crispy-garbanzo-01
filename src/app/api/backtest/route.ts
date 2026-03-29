import { NextResponse } from "next/server";
import { getMarketDataProvider } from "@/services/market-data";
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
    } = body;

    if (!asset || !direction || !entryPrice) {
      return NextResponse.json({ error: "Missing required fields: asset, direction, entryPrice" }, { status: 400 });
    }

    // Fetch historical data — enough for lookback + signal computation window
    const lookbackDays = lookbackMonths * 30 + 60;
    const provider = getMarketDataProvider();
    const historical = await provider.getHistorical(asset, lookbackDays);

    const prices = historical.map(d => d.price);
    const volumes = historical.map(d => d.volume ?? 0);
    const dates = historical.map(d => d.timestamp.split("T")[0]);

    if (prices.length < 30) {
      return NextResponse.json({
        error: "Insufficient historical data",
        detail: `Only ${prices.length} data points available. Need at least 30 for meaningful analysis.`,
      }, { status: 422 });
    }

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

    const result = runBacktest(config, prices, volumes, dates);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (error) {
    console.error("[api/backtest] Error:", error);
    return NextResponse.json({ error: "Backtest failed" }, { status: 500 });
  }
}
