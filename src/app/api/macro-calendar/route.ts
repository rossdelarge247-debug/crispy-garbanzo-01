import { NextResponse } from "next/server";
import { getMacroCalendar } from "@/services/macro-calendar";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? "14");

  try {
    const events = await getMacroCalendar(days);

    const withTrade = events.filter(e => e.topTrade);
    const headline = withTrade.length > 0
      ? `${withTrade.length} tradeable events this ${days <= 7 ? "week" : "fortnight"}`
      : "No high-conviction events right now";

    return NextResponse.json({
      events,
      aiBrief: { headline, detail: `${events.length} events scanned. ${withTrade.length} have clear trade setups.` },
      dataSource: "live",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/macro-calendar] Error:", error);
    return NextResponse.json({ error: "Calendar failed" }, { status: 500 });
  }
}
