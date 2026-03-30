/**
 * Social Listen API — scans Reddit and social sources for clues about
 * an upcoming economic event. What are people expecting? Any rumours?
 */

import { NextResponse } from "next/server";
import { getSocialSentiment } from "@/services/social-sentiment";
import { getNewsProvider } from "@/services/news";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventTitle = searchParams.get("event") ?? "";
  const asset = searchParams.get("asset") ?? "";

  if (!eventTitle) return NextResponse.json({ error: "event param required" }, { status: 400 });

  try {
    // Fetch social sentiment for the primary asset
    const social = asset ? await getSocialSentiment(asset).catch(() => null) : null;

    // Fetch recent news mentioning the event
    const newsProvider = getNewsProvider();
    const keywords = eventTitle.split(/\s+/).slice(0, 3).join(" ");
    const news = await newsProvider.getNews(keywords, 5).catch(() => []);

    // Extract "clues" — headlines that hint at expectations
    const clues = news.map(a => ({
      title: a.title,
      source: a.source,
      sentiment: a.sentiment > 0.1 ? "bullish" : a.sentiment < -0.1 ? "bearish" : "neutral",
    }));

    const socialSignals = social?.signals
      .filter(s => s.volume > 0 && s.source !== "composite")
      .map(s => ({
        source: s.source,
        label: s.label,
        score: s.score,
        volume: s.volume,
        topPost: s.samplePosts[0] ?? null,
      })) ?? [];

    const compositeLabel = social?.compositeLabel ?? "unavailable";
    const agreement = social?.agreement ?? 0;

    return NextResponse.json({
      compositeLabel,
      agreement,
      signals: socialSignals,
      clues,
      summary: socialSignals.length > 0
        ? `Social sentiment is ${compositeLabel} (${agreement}% agreement). ${clues.length} recent headlines found.`
        : `${clues.length} recent headlines found. Social sentiment data unavailable for this event.`,
    });
  } catch {
    return NextResponse.json({ compositeLabel: "unavailable", agreement: 0, signals: [], clues: [], summary: "Unable to fetch social data." });
  }
}
