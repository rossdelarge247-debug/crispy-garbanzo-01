import { NextResponse } from "next/server";
import { getValidatedIdeas, getDataSource } from "@/services/flag-engine";
import { getCalendarProvider } from "@/services/calendar";
import type { ValidatedIdea } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assetFilter = searchParams.get("assets"); // "all" | "energy" | "crypto" | "fx" | "tech" | "risk"

  try {
    const [ideas, dataSource, events] = await Promise.all([
      getValidatedIdeas(),
      getDataSource(),
      getCalendarProvider().getUpcomingEvents(7),
    ]);

    // Filter ideas by asset category if specified
    let filtered = ideas;
    if (assetFilter && assetFilter !== "all") {
      const categoryMap: Record<string, string[]> = {
        energy:  ["Geopolitical", "Energy"],
        crypto:  ["Crypto", "Sentiment"],
        fx:      ["Macro", "FX"],
        tech:    ["Technology", "AI"],
        risk:    ["Risk", "Volatility"],
      };
      const keywords = categoryMap[assetFilter] ?? [];
      if (keywords.length > 0) {
        filtered = ideas.filter(idea =>
          keywords.some(kw => idea.flag.category.includes(kw))
        );
      }
    }

    const topIdea = filtered[0] ?? null;

    let headline: string;
    let detail: string;

    if (topIdea) {
      const asset = topIdea.flag.affectedAssets[0]?.name ?? topIdea.flag.title;
      const wr = topIdea.backtestSummary.winRate;
      const sc = topIdea.backtestSummary.scenarioCount;
      headline = "I found something worth your attention";
      detail = `${asset} — ${wr}% win rate across ${sc} similar historical setups. ${topIdea.recommendation.summary}`;
    } else {
      headline = "Nothing clears the bar";
      detail = "I have analysed the markets. Nothing meets the quality threshold right now. I will tell you when something does.";
    }

    const relevantEvents = events
      .filter(e => e.impact === "high" || e.impact === "medium")
      .slice(0, 5);

    return NextResponse.json({
      headline,
      detail,
      idea: topIdea,
      otherIdeas: filtered.slice(1),
      events: relevantEvents,
      dataSource,
      totalAnalysed: ideas.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/briefing] Error:", error);
    return NextResponse.json({ error: "Briefing failed" }, { status: 500 });
  }
}
