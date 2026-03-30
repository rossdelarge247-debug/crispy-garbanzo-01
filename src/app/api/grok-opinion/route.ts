import { NextResponse } from "next/server";
import { getGrokTradeOpinion } from "@/services/grok";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { symbol, direction, thesis, winRate, profitFactor } = await request.json();
    const opinion = await getGrokTradeOpinion(symbol, direction, thesis, winRate, profitFactor);
    if (!opinion) return NextResponse.json({ opinion: "Grok unavailable. Set PUTER_AUTH_TOKEN in environment.", agrees: true, caveat: "Second opinion requires Grok API connection." });
    return NextResponse.json(opinion);
  } catch {
    return NextResponse.json({ opinion: "Unable to reach Grok.", agrees: true, caveat: "" });
  }
}
