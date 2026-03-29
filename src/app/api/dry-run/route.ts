import { NextResponse } from "next/server";
import { runDrySimulation, type DryRunConfig } from "@/services/dry-run";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const config: DryRunConfig = await request.json();

    if (!config.asset || !config.direction || !config.entryPrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Apply defaults
    const fullConfig: DryRunConfig = {
      ...config,
      stopLossPercent: config.stopLossPercent || 2,
      takeProfitPercent: config.takeProfitPercent || 3,
      maxHoldBars: config.maxHoldBars || 20,
      simulations: Math.min(config.simulations || 10, 50), // cap at 50
    };

    const result = runDrySimulation(fullConfig);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/dry-run] Error:", error);
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}
