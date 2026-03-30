import { NextResponse } from "next/server";
import { getMacroCalendar } from "@/services/macro-calendar";

export const dynamic = "force-dynamic";

function generateBrief(events: Awaited<ReturnType<typeof getMacroCalendar>>): { headline: string; detail: string } {
  const withTrade = events.filter(e => e.topTrade);
  const highImpact = events.filter(e => e.impact === "high");
  const centralBank = events.filter(e => e.category === "central_bank");
  const inflation = events.filter(e => e.category === "inflation");

  // Build a narrative, not just stats
  const parts: string[] = [];

  if (centralBank.length > 0) {
    const names = centralBank.map(e => e.title.replace(/interest rate decision/i, "").replace(/rate decision/i, "").trim()).filter(Boolean);
    parts.push(`${names.length > 1 ? "Multiple central bank decisions" : names[0] || "Central bank decision"} ahead`);
  }

  if (inflation.length > 0) {
    parts.push(`inflation data due (${inflation.map(e => e.country).join(", ")})`);
  }

  const otherHigh = highImpact.filter(e => e.category !== "central_bank" && e.category !== "inflation");
  if (otherHigh.length > 0) {
    parts.push(`${otherHigh.length} other high-impact release${otherHigh.length > 1 ? "s" : ""}`);
  }

  const headline = parts.length > 0
    ? parts.join(", ") + `. ${withTrade.length} tradeable ${withTrade.length === 1 ? "opportunity" : "opportunities"} identified.`
    : withTrade.length > 0
      ? `${withTrade.length} tradeable opportunities across ${events.length} upcoming events.`
      : "Quiet calendar ahead. No high-conviction setups right now.";

  // Detail with more context
  const topEvent = withTrade.sort((a, b) => b.conviction - a.conviction)[0];
  let detail = `${events.length} economic events scanned across the next two weeks.`;
  if (topEvent?.topTrade) {
    detail += ` Highest conviction: ${topEvent.topTrade.direction === "long" ? "long" : "short"} ${topEvent.topTrade.assetName} into ${topEvent.title} (${topEvent.conviction}%).`;
  }
  if (highImpact.length > 0) {
    detail += ` ${highImpact.length} high-impact ${highImpact.length === 1 ? "event" : "events"} could move markets significantly.`;
  }

  return { headline, detail };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? "14");

  try {
    const events = await getMacroCalendar(days);
    const brief = generateBrief(events);

    return NextResponse.json({
      events,
      aiBrief: brief,
      dataSource: "live",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/macro-calendar] Error:", error);
    return NextResponse.json({ error: "Calendar failed" }, { status: 500 });
  }
}
