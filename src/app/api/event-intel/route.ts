/**
 * Event Intelligence API — combines positioning, playbook stats,
 * social sentiment, and AI briefing into one response.
 */

import { NextResponse } from "next/server";
import { getMacroCalendar } from "@/services/macro-calendar";
import { buildEventPlaybook } from "@/services/event-playbook";
import { analysePositioning, generatePreEventBriefing } from "@/services/pre-event-intel";
import type { MacroEvent } from "@/types/macro-trader";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("id");
  if (!eventId) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const events = await getMacroCalendar(30);
    const event = events.find((e: MacroEvent) => e.id === eventId);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    // Run all intelligence in parallel
    const primaryAsset = event.affectedAssets[0];

    const [positioning, playbook, socialRes] = await Promise.all([
      primaryAsset ? analysePositioning(primaryAsset.symbol, primaryAsset.name, primaryAsset.direction === "short" ? "short" : "long") : Promise.resolve(null),
      buildEventPlaybook(event.title, 24).catch(() => null),
      primaryAsset ? fetch(`${request.url.split("/api/")[0]}/api/social-listen?event=${encodeURIComponent(event.title)}&asset=${primaryAsset.symbol}`).then(r => r.json()).catch(() => null) : Promise.resolve(null),
    ]);

    const playbookStats = playbook ? {
      beats: playbook.summary.beats,
      misses: playbook.summary.misses,
      total: playbook.summary.totalInstances,
      beatWinRate: playbook.summary.assetStats[0]?.beatWinRate4h ?? 50,
    } : null;

    const briefing = await generatePreEventBriefing(event, positioning, socialRes?.summary ?? "", playbookStats);

    return NextResponse.json({
      event,
      positioning,
      briefing,
      playbookStats,
      socialSummary: socialRes?.summary ?? null,
    });
  } catch (error) {
    console.error("[api/event-intel]", error);
    return NextResponse.json({ error: "Intelligence failed" }, { status: 500 });
  }
}
