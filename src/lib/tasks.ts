/**
 * Daily Task Model — Trade Daddy 2.0
 *
 * Generates a prioritized task list for the daily dashboard.
 * Tasks are actions the user should take, not passive information.
 */

import type { MarketFlag, EconomicEvent } from "@/types";

export type TaskType =
  | "trade_now"        // High confidence, dry run passed — do it
  | "watch_event"      // Economic event approaching — be ready
  | "run_dry_run"      // New opportunity — test it first
  | "review_dry_run"   // Dry run completed — check results
  | "monitor"          // Keep watching, not ready yet
  | "setup_developing" // Early signal, come back later

export type TaskPriority = "high" | "medium" | "low";

export interface DailyTask {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  title: string;
  subtitle: string;
  asset?: string;
  flagId?: string;
  eventTime?: string;
  action: string;      // CTA text
  actionUrl: string;   // where to go
  emoji: string;
}

export function generateDailyTasks(
  flags: MarketFlag[],
  events: EconomicEvent[],
  verdicts: Record<string, "explore" | "monitor" | "wait">
): DailyTask[] {
  const tasks: DailyTask[] = [];

  // 1. Trade recommendations (explore verdicts with high conviction)
  for (const flag of flags) {
    const verdict = verdicts[flag.id];
    if (verdict === "explore" && flag.convictionScore >= 70) {
      tasks.push({
        id: `trade-${flag.id}`,
        type: "trade_now",
        priority: "high",
        title: `Trade opportunity: ${flag.affectedAssets[0]?.symbol || "market"}`,
        subtitle: flag.title,
        asset: flag.affectedAssets[0]?.symbol,
        flagId: flag.id,
        action: "Review trade plan",
        actionUrl: `/flags/${flag.id}`,
        emoji: "🎯",
      });
    }
  }

  // 2. Economic events in next 24 hours
  const now = Date.now();
  const next24h = now + 24 * 60 * 60 * 1000;
  for (const event of events) {
    const eventTime = new Date(event.date).getTime();
    if (eventTime > now && eventTime < next24h && event.impact === "high") {
      const hoursUntil = Math.round((eventTime - now) / (60 * 60 * 1000));
      tasks.push({
        id: `event-${event.id}`,
        type: "watch_event",
        priority: "high",
        title: `${event.title} in ${hoursUntil}h`,
        subtitle: `${event.forecast ? `Forecast: ${event.forecast}` : ""}${event.forecast && event.previous ? " · " : ""}${event.previous ? `Previous: ${event.previous}` : ""}`.trim() || "High-impact event approaching",
        eventTime: event.date,
        action: "Set up watch",
        actionUrl: "/dashboard",
        emoji: "⏰",
      });
    }
  }

  // 3. Dry run suggestions (explore verdicts, not yet high enough for trade)
  for (const flag of flags) {
    const verdict = verdicts[flag.id];
    if (verdict === "explore" && flag.convictionScore < 70) {
      tasks.push({
        id: `dryrun-${flag.id}`,
        type: "run_dry_run",
        priority: "medium",
        title: `Test this setup: ${flag.affectedAssets[0]?.symbol || "opportunity"}`,
        subtitle: `Confidence ${flag.convictionScore}% — run a dry run to validate before committing`,
        asset: flag.affectedAssets[0]?.symbol,
        flagId: flag.id,
        action: "Start dry run",
        actionUrl: `/flags/${flag.id}`,
        emoji: "🧪",
      });
    }
  }

  // 4. Monitoring tasks (monitor verdicts)
  for (const flag of flags) {
    const verdict = verdicts[flag.id];
    if (verdict === "monitor") {
      tasks.push({
        id: `monitor-${flag.id}`,
        type: "monitor",
        priority: "low",
        title: `Keep watching: ${flag.affectedAssets[0]?.symbol || "situation"}`,
        subtitle: flag.title,
        asset: flag.affectedAssets[0]?.symbol,
        flagId: flag.id,
        action: "Check status",
        actionUrl: `/flags/${flag.id}`,
        emoji: "👀",
      });
    }
  }

  // Sort by priority
  const priorityOrder: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
  tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return tasks;
}
