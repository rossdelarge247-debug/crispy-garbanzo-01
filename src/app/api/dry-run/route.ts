import { NextResponse } from "next/server";
import { runDrySimulation, type DryRunConfig } from "@/services/dry-run";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const config: DryRunConfig = await request.json();

    if (!config.asset || !config.direction || !config.entryPrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const fullConfig: DryRunConfig = {
      ...config,
      stopLossPercent: config.stopLossPercent || 2,
      takeProfitPercent: config.takeProfitPercent || 3,
      maxHoldBars: config.maxHoldBars || 20,
      simulations: Math.min(config.simulations || 10, 50),
      tradeAmount: config.tradeAmount || 1000,
      leverage: config.leverage || 10,
    };

    const result = runDrySimulation(fullConfig);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/dry-run] Error:", error);
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}
