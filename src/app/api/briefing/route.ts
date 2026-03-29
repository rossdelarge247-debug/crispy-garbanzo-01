import { NextResponse } from "next/server";
import { getValidatedIdeas, getDataSource } from "@/services/flag-engine";
import { getCalendarProvider } from "@/services/calendar";
import { getSessionInfo } from "@/lib/session";
import type { ValidatedIdea, EconomicEvent } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [ideas, dataSource, events] = await Promise.all([
      getValidatedIdeas(),
      getDataSource(),
      getCalendarProvider().getUpcomingEvents(3),
    ]);

    const session = getSessionInfo();
    const topIdea = ideas[0] ?? null;

    // Today assessment — driven entirely by whether a quality idea exists
    let headline: string;
    let detail: string;
    let status: "yes" | "no";

    if (topIdea) {
      status = "yes";
      headline = "I found something worth your attention";
      const asset = topIdea.flag.affectedAssets[0]?.name ?? topIdea.flag.title;
      const wr = topIdea.backtestSummary.winRate;
      const sc = topIdea.backtestSummary.scenarioCount;
      detail = `${asset} — tested against ${sc} similar historical conditions, ${wr}% were profitable. ${topIdea.recommendation.summary}`;
    } else {
      status = "no";
      headline = "The markets are quiet";
      detail = "I have checked everything. Nothing clears the bar right now. Patience — I will tell you when something does.";
    }

    // Filter events to high/medium impact
    const relevantEvents = events
      .filter(e => e.impact === "high" || e.impact === "medium")
      .slice(0, 5);

    return NextResponse.json({
      todayAssessment: {
        status,
        headline,
        detail,
        sessionState: session.state,
        sessionLabel: session.label,
      },
      idea: topIdea,
      otherIdeas: ideas.slice(1),   // usually empty
      events: relevantEvents,
      dataSource,
      ideasChecked: ideas.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/briefing] Error:", error);
    return NextResponse.json({ error: "Briefing failed" }, { status: 500 });
  }
}
