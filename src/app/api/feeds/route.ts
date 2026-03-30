import { NextResponse } from "next/server";
import { getAllFeedHealth, getFeedSummary } from "@/services/feed-cache";

export const dynamic = "force-dynamic";

// What each data source does and the impact if it's down
const SOURCE_META: Record<string, { role: string; impactIfDown: string; fallback: string | null }> = {
  polygon:        { role: "Real-time & historical prices", impactIfDown: "Prices delayed or from Yahoo Finance fallback", fallback: "Yahoo Finance" },
  gdelt:          { role: "News articles & headlines", impactIfDown: "No real news — AI analysis quality reduced", fallback: "Cached articles" },
  newsapi:        { role: "News (premium source)", impactIfDown: "Falls back to GDELT free tier", fallback: "GDELT" },
  reddit:         { role: "Social sentiment (Reddit)", impactIfDown: "Social signal missing from Reddit", fallback: null },
  stocktwits:     { role: "Social sentiment (StockTwits)", impactIfDown: "Trader sentiment unavailable", fallback: null },
  "alternative.me": { role: "Crypto Fear & Greed Index", impactIfDown: "Crypto sentiment score unavailable", fallback: null },
  alpha_vantage:  { role: "AI-scored news sentiment", impactIfDown: "Using keyword-based sentiment instead", fallback: "Keyword analysis" },
  forex_factory:  { role: "Economic calendar", impactIfDown: "Calendar using generated events — may not reflect real schedule", fallback: "Generated calendar" },
  anthropic:      { role: "AI analysis (Claude)", impactIfDown: "Using rules-based analysis — insights less nuanced", fallback: "Rules engine" },
};

export async function GET() {
  const feeds = getAllFeedHealth();
  const summary = getFeedSummary();

  const bySource: Record<string, typeof feeds> = {};
  for (const feed of feeds) {
    if (!bySource[feed.source]) bySource[feed.source] = [];
    bySource[feed.source].push(feed);
  }

  const providers = Object.entries(bySource).map(([source, sourceFeeds]) => {
    const liveCount = sourceFeeds.filter(f => f.status === "live").length;
    const staleCount = sourceFeeds.filter(f => f.status === "stale").length;
    const errorCount = sourceFeeds.filter(f => f.status === "error").length;
    const total = sourceFeeds.length;

    const status = errorCount > 0 ? "error" : staleCount > 0 ? "stale" : liveCount > 0 ? "live" : "unknown";
    const lastUpdate = sourceFeeds.map(f => f.lastSuccessAt).filter(Boolean).sort().pop() ?? null;
    const rateLimit = sourceFeeds[0]?.rateLimit ?? null;
    const meta = SOURCE_META[source] ?? { role: source, impactIfDown: "Unknown impact", fallback: null };

    return {
      source, status, feedCount: total, live: liveCount, stale: staleCount, error: errorCount,
      lastUpdate, rateLimit,
      role: meta.role,
      impactIfDown: meta.impactIfDown,
      fallback: meta.fallback,
    };
  });

  // Generate impact warnings for anything not live
  const warnings: string[] = [];
  for (const p of providers) {
    if (p.status === "error") {
      warnings.push(`${p.role}: offline${p.fallback ? ` → using ${p.fallback}` : ""} — ${p.impactIfDown}`);
    } else if (p.status === "stale") {
      warnings.push(`${p.role}: data is stale${p.fallback ? ` → ${p.fallback} attempted` : ""}`);
    }
  }

  return NextResponse.json({
    summary: { ...summary, warnings },
    providers,
    feeds,
    checkedAt: new Date().toISOString(),
  });
}
