/**
 * Data Feeds Status API — /api/feeds
 *
 * Returns the health status of all data feeds: what's live, what's stale,
 * what's broken, when each was last updated, and any issues.
 */

import { NextResponse } from "next/server";
import { getAllFeedHealth, getFeedSummary } from "@/services/feed-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const feeds = getAllFeedHealth();
  const summary = getFeedSummary();

  // Group feeds by source for cleaner display
  const bySource: Record<string, typeof feeds> = {};
  for (const feed of feeds) {
    if (!bySource[feed.source]) bySource[feed.source] = [];
    bySource[feed.source].push(feed);
  }

  // Provider-level status (aggregate per source)
  const providers = Object.entries(bySource).map(([source, sourceFeeds]) => {
    const liveCount = sourceFeeds.filter(f => f.status === "live").length;
    const staleCount = sourceFeeds.filter(f => f.status === "stale").length;
    const errorCount = sourceFeeds.filter(f => f.status === "error").length;
    const total = sourceFeeds.length;

    const status = errorCount > 0 ? "error" : staleCount > 0 ? "stale" : liveCount > 0 ? "live" : "unknown";
    const lastUpdate = sourceFeeds
      .map(f => f.lastSuccessAt)
      .filter(Boolean)
      .sort()
      .pop() ?? null;

    const rateLimit = sourceFeeds[0]?.rateLimit ?? null;

    return {
      source,
      status,
      feedCount: total,
      live: liveCount,
      stale: staleCount,
      error: errorCount,
      lastUpdate,
      rateLimit,
      feeds: sourceFeeds,
    };
  });

  return NextResponse.json({
    summary,
    providers,
    feeds,
    checkedAt: new Date().toISOString(),
  });
}
