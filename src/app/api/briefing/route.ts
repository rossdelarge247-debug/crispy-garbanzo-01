import { NextResponse } from "next/server";
import { getValidatedIdeas, getDataSource } from "@/services/flag-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [ideas, dataSource] = await Promise.all([
      getValidatedIdeas(),
      getDataSource(),
    ]);

    let headline: string;
    let detail: string;

    if (ideas.length > 1) {
      headline = `${ideas.length} trade ideas for this week`;
      detail = `Calendar events, news flow, and market conditions analysed. ${ideas.length} setups identified.`;
    } else if (ideas.length === 1) {
      headline = "One idea worth your attention";
      detail = ideas[0].recommendation.summary;
    } else {
      headline = "Nothing clears the bar right now";
      detail = "Markets analysed. No setups meet the confidence threshold. Check back soon.";
    }

    return NextResponse.json({
      headline,
      detail,
      idea: ideas[0] ?? null,
      otherIdeas: ideas.slice(1),
      dataSource,
      totalAnalysed: ideas.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/briefing] Error:", error);
    return NextResponse.json({ error: "Briefing failed" }, { status: 500 });
  }
}
