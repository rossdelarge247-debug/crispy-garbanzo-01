import { NextResponse } from "next/server";
import { getFlags, getHypotheses, getTestsForFlag, getDataSource } from "@/services/flag-engine";
import { getCalendarProvider } from "@/services/calendar";
import { getAssetName, getAssetDisplayName, getAssetShortName } from "@/lib/asset-names";
import type { MarketFlag, EconomicEvent } from "@/types";

export const dynamic = "force-dynamic";

interface BriefingSuggestion {
  flag: MarketFlag;
  assetDisplayName: string;     // "British Pound / US Dollar (Cable)"
  assetShortName: string;       // "GBP/USD"
  hypothesisCount: number;
  topHypothesis: string | null;
  topHypothesisDirection: string | null;
  testsPassed: number;
  testsTotal: number;
  verdict: "explore" | "monitor" | "wait";
  verdictReason: string;
}

interface EnrichedEvent extends EconomicEvent {
  tradeRelevance?: string; // why this event matters for trading
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

// "Does today matter?" assessment
function assessToday(suggestions: BriefingSuggestion[]): {
  status: "yes" | "maybe" | "no";
  headline: string;
  detail: string;
} {
  const explores = suggestions.filter(s => s.verdict === "explore");
  const monitors = suggestions.filter(s => s.verdict === "monitor");

  if (explores.length > 0) {
    const top = explores[0];
    return {
      status: "yes",
      headline: `There's a setup worth looking at today`,
      detail: `${top.assetDisplayName} — ${top.flag.title}`,
    };
  }
  if (monitors.length > 0) {
    return {
      status: "maybe",
      headline: `A few things are developing — worth keeping an eye on`,
      detail: `${monitors.length} situation${monitors.length > 1 ? "s" : ""} on the watchlist`,
    };
  }
  return {
    status: "no",
    headline: `Nothing strong today`,
    detail: `That's fine — Daddy will let you know when something comes up.`,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const focusAssetsParam = searchParams.get("focusAssets");
  const focusAssets = focusAssetsParam ? focusAssetsParam.split(",") : [];

  try {
    const [flags, dataSource, economicEvents] = await Promise.all([
      getFlags(),
      getDataSource(),
      getCalendarProvider().getUpcomingEvents(3),
    ]);

    let filteredFlags = flags;
    if (focusAssets.length > 0) {
      filteredFlags = flags.filter(flag =>
        flag.affectedAssets.some(asset =>
          focusAssets.some(fa =>
            fa === asset.symbol || asset.symbol.includes(fa) || fa.includes(asset.symbol)
          )
        )
      );
      if (filteredFlags.length === 0) filteredFlags = flags;
    }

    const suggestions: BriefingSuggestion[] = await Promise.all(
      filteredFlags.map(async (flag) => {
        const hypotheses = await getHypotheses(flag.id);
        const tests = await getTestsForFlag(flag.id);
        const testsPassed = tests.filter(t => t.result === "pass").length;
        const topHyp = hypotheses.sort((a, b) => b.confidenceScore - a.confidenceScore)[0];
        const { verdict, reason } = computeVerdict(flag.convictionScore, testsPassed, tests.length);

        const primaryAsset = flag.affectedAssets.find(a => a.impact === "primary");
        const symbol = primaryAsset?.symbol || flag.affectedAssets[0]?.symbol || "";

        return {
          flag,
          assetDisplayName: getAssetDisplayName(symbol),
          assetShortName: getAssetShortName(symbol),
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

    const order = { explore: 0, monitor: 1, wait: 2 };
    suggestions.sort((a, b) => order[a.verdict] - order[b.verdict]);

    // Enrich events with trade relevance
    const enrichedEvents: EnrichedEvent[] = economicEvents.slice(0, 6).map(event => ({
      ...event,
      tradeRelevance: event.impact === "high"
        ? `Could create a trading opportunity — ${event.forecast ? `forecast is ${event.forecast}, previous was ${event.previous || "unknown"}` : "watch for surprises"}`
        : undefined,
    }));

    const todayAssessment = assessToday(suggestions);

    return NextResponse.json({
      todayAssessment,
      suggestions,
      events: enrichedEvents,
      dataSource,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/briefing] Error:", error);
    return NextResponse.json({ error: "Failed to generate briefing" }, { status: 500 });
  }
}
