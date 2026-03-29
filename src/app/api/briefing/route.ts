import { NextResponse } from "next/server";
import { getFlags, getHypotheses, getTestsForFlag, getDataSource } from "@/services/flag-engine";
import { getCalendarProvider } from "@/services/calendar";
import type { MarketFlag, Hypothesis, TestScenario, EconomicEvent } from "@/types";

export const dynamic = "force-dynamic";

interface BriefingSuggestion {
  flag: MarketFlag;
  hypothesisCount: number;
  topHypothesis: string | null;
  topHypothesisDirection: string | null;
  testsPassed: number;
  testsTotal: number;
  verdict: "explore" | "monitor" | "wait";
  verdictReason: string;
}

function computeVerdict(
  convictionScore: number,
  testsPassed: number,
  testsTotal: number
): { verdict: "explore" | "monitor" | "wait"; reason: string } {
  const passRate = testsTotal > 0 ? testsPassed / testsTotal : 0;
  if (convictionScore >= 70 && passRate >= 0.6) {
    return { verdict: "explore", reason: "Strong signals — worth a closer look" };
  }
  if (convictionScore >= 50 || passRate >= 0.4) {
    return { verdict: "monitor", reason: "Promising but needs more confirmation" };
  }
  return { verdict: "wait", reason: "Not enough evidence yet" };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const focusAssetsParam = searchParams.get("focusAssets"); // comma-separated symbols
  const focusAssets = focusAssetsParam ? focusAssetsParam.split(",") : [];

  try {
    const [flags, dataSource, economicEvents] = await Promise.all([
      getFlags(),
      getDataSource(),
      getCalendarProvider().getUpcomingEvents(3), // next 3 days of events
    ]);

    // Filter flags to user's focus universe if provided
    let filteredFlags = flags;
    if (focusAssets.length > 0) {
      filteredFlags = flags.filter(flag =>
        flag.affectedAssets.some(asset =>
          focusAssets.some(fa =>
            fa === asset.symbol ||
            asset.symbol.includes(fa) ||
            fa.includes(asset.symbol)
          )
        )
      );
      // If filtering removes everything, fall back to all flags
      if (filteredFlags.length === 0) filteredFlags = flags;
    }

    // Build suggestions with intel
    const suggestions: BriefingSuggestion[] = await Promise.all(
      filteredFlags.map(async (flag) => {
        const hypotheses = await getHypotheses(flag.id);
        const tests = await getTestsForFlag(flag.id);
        const testsPassed = tests.filter(t => t.result === "pass").length;
        const topHyp = hypotheses.sort((a, b) => b.confidenceScore - a.confidenceScore)[0];
        const { verdict, reason } = computeVerdict(flag.convictionScore, testsPassed, tests.length);

        return {
          flag,
          hypothesisCount: hypotheses.length,
          topHypothesis: topHyp?.title ?? null,
          topHypothesisDirection: topHyp?.direction ?? null,
          testsPassed,
          testsTotal: tests.length,
          verdict,
          verdictReason: reason,
        };
      })
    );

    // Sort: explore first, then monitor, then wait
    const order = { explore: 0, monitor: 1, wait: 2 };
    suggestions.sort((a, b) => order[a.verdict] - order[b.verdict]);

    // Filter events to user's focus (simplified — show all for now)
    const relevantEvents = economicEvents.slice(0, 6);

    return NextResponse.json({
      suggestions,
      events: relevantEvents,
      dataSource,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/briefing] Error:", error);
    return NextResponse.json({ error: "Failed to generate briefing" }, { status: 500 });
  }
}
