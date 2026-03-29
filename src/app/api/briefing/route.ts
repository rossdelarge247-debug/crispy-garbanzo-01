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
        energy:  ["Geopolitical", "Energy", "geopolitical", "calendar"],
        crypto:  ["Crypto", "Sentiment", "crypto", "momentum"],
        fx:      ["Macro", "FX", "calendar", "cross-asset"],
        tech:    ["Technology", "AI", "tech", "momentum"],
        risk:    ["Risk", "Volatility", "mean-reversion", "cross-asset"],
      };
      const keywords = categoryMap[assetFilter] ?? [];
      if (keywords.length > 0) {
        filtered = ideas.filter(idea =>
          keywords.some(kw =>
            idea.flag.category.includes(kw) ||
            idea.flag.category.toLowerCase().includes(kw.toLowerCase())
          )
        );
        // If filter is too strict and removes everything, show all
        if (filtered.length === 0) filtered = ideas;
      }
    }

    const topIdea = filtered[0] ?? null;

    let headline: string;
    let detail: string;

    if (filtered.length > 1) {
      headline = `${filtered.length} opportunities identified`;
      detail = `I have analysed the calendar, news flow, and market conditions. ${filtered.length} setups meet the quality threshold.`;
    } else if (topIdea) {
      headline = "I found something worth your attention";
      detail = topIdea.recommendation.summary;
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
