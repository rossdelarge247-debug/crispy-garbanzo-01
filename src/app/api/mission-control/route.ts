import { NextResponse } from "next/server";
import { getMissionControlData } from "@/services/instrument-engine";
import type { WatchedInstrument } from "@/types/mission-control";

export const dynamic = "force-dynamic";

// Default instruments if none specified
const DEFAULT_INSTRUMENTS: WatchedInstrument[] = [
  { symbol: "BTC-USD", name: "Bitcoin", assetClass: "crypto" },
  { symbol: "GBP-USD", name: "GBP/USD", assetClass: "fx" },
  { symbol: "EUR-USD", name: "EUR/USD", assetClass: "fx" },
  { symbol: "BZ=F", name: "Brent Crude", assetClass: "commodity" },
  { symbol: "GC=F", name: "Gold", assetClass: "commodity" },
  { symbol: "SPY", name: "S&P 500", assetClass: "equity" },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get("symbols");

    let instruments: WatchedInstrument[];
    if (symbolsParam) {
      instruments = symbolsParam.split(",").map(s => {
        const sym = s.trim();
        const def = DEFAULT_INSTRUMENTS.find(d => d.symbol === sym);
        return def ?? { symbol: sym, name: sym, assetClass: "equity" as const };
      });
    } else {
      instruments = DEFAULT_INSTRUMENTS;
    }

    const data = await getMissionControlData(instruments);

    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (error) {
    console.error("[api/mission-control] Error:", error);
    return NextResponse.json({ error: "Mission control failed" }, { status: 500 });
  }
}
