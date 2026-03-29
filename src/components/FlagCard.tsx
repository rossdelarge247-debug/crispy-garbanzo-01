"use client";

import Link from "next/link";
import { cn, timeAgo } from "@/lib/utils";
import type { MarketFlag } from "@/types";
import ConvictionBadge from "./ConvictionBadge";
import StatusBadge from "./StatusBadge";
import AssetPill from "./AssetPill";
import MiniSparkline from "./MiniSparkline";

// Simple seeded sparkline data per flag
const sparklineData: Record<string, number[]> = {
  "flag-oil-geo": [82, 83, 84.5, 83.8, 85, 86.2, 85.5, 87, 87.5, 88, 87.8, 88.5, 89, 89.4],
  "flag-crypto-sentiment": [72000, 68000, 64000, 59000, 61000, 63500, 65000, 64200, 66000, 67000, 67800, 68200],
  "flag-usd-strength": [101.5, 102, 102.3, 102.8, 103, 103.5, 103.2, 103.8, 104, 104.3, 104.5, 104.8],
};

const sparklineColors: Record<string, string> = {
  "flag-oil-geo": "#0d7c3f",
  "flag-crypto-sentiment": "#b8860b",
  "flag-usd-strength": "#0d7c3f",
};

export interface FlagCardIntel {
  hypothesisCount: number;
  topHypothesis: string | null;
  testsPassed: number;
  testsTotal: number;
  verdict: "explore" | "monitor" | "wait";
  verdictReason: string;
}

interface FlagCardProps {
  flag: MarketFlag;
  intel?: FlagCardIntel;
}

function getVerdictStyle(verdict: "explore" | "monitor" | "wait") {
  switch (verdict) {
    case "explore":
      return "bg-conviction-high/10 text-conviction-high border-conviction-high/20";
    case "monitor":
      return "bg-conviction-medium/10 text-conviction-medium border-conviction-medium/20";
    case "wait":
      return "bg-text-muted/10 text-text-muted border-text-muted/20";
  }
}

function getVerdictLabel(verdict: "explore" | "monitor" | "wait") {
  switch (verdict) {
    case "explore":
      return "Explore Further";
    case "monitor":
      return "Monitor";
    case "wait":
      return "Wait & Watch";
  }
}

export default function FlagCard({ flag, intel }: FlagCardProps) {
  return (
    <Link href={`/flags/${flag.id}`} className="block group">
      <article
        className={cn(
          "relative flex flex-col rounded-2xl border border-surface-border bg-surface-raised",
          "transition-all duration-200 ease-out h-full",
          "hover:border-surface-hover hover:bg-surface-overlay hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5",
          "font-sans"
        )}
      >
        {/* Sparkline banner at top */}
        {sparklineData[flag.id] && (
          <div className="px-5 pt-4 pb-0">
            <MiniSparkline
              data={sparklineData[flag.id]}
              width={280}
              height={48}
              color={sparklineColors[flag.id] || "#1a1a2e"}
            />
          </div>
        )}

        {/* Content */}
        <div className="p-5 pt-3 flex flex-col flex-1">
          {/* Category + status row */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-medium text-text-muted truncate">
              {flag.category}
            </span>
            <StatusBadge status={flag.status} />
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold text-text-primary mb-2 leading-snug group-hover:text-accent-glow transition-colors duration-200 line-clamp-2">
            {flag.title}
          </h3>

          {/* Summary */}
          <p className="text-xs text-text-secondary leading-relaxed mb-3 line-clamp-3">
            {flag.summary}
          </p>

          {/* Conviction + time */}
          <div className="flex items-center gap-2 mb-3">
            <ConvictionBadge score={flag.convictionScore} size="sm" />
            <span className="text-xs text-text-muted capitalize">
              {flag.timeHorizon} · {timeAgo(flag.updatedAt)}
            </span>
          </div>

          {/* Intel section — test results + verdict */}
          {intel && (
            <div className="rounded-lg border border-surface-border bg-surface-DEFAULT p-3 mb-3">
              {/* Test results row */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-muted">
                  {intel.hypothesisCount} scenario{intel.hypothesisCount !== 1 ? "s" : ""}
                </span>
                <span className="text-xs font-medium text-text-secondary">
                  <span className="text-conviction-high">{intel.testsPassed}</span>
                  <span className="text-text-muted">/{intel.testsTotal} tests passed</span>
                </span>
              </div>

              {/* Top hypothesis */}
              {intel.topHypothesis && (
                <p className="text-xs text-text-secondary leading-relaxed mb-2 line-clamp-1">
                  Lead: {intel.topHypothesis}
                </p>
              )}

              {/* Verdict badge */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
                    getVerdictStyle(intel.verdict)
                  )}
                >
                  {getVerdictLabel(intel.verdict)}
                </span>
                <span className="text-xs text-text-muted truncate ml-2 max-w-[60%] text-right">
                  {intel.verdictReason}
                </span>
              </div>
            </div>
          )}

          {/* Assets — pushed to bottom */}
          <div className="mt-auto">
            {flag.affectedAssets.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-3 border-t border-surface-border">
                {flag.affectedAssets.slice(0, 3).map((asset) => (
                  <AssetPill
                    key={asset.symbol}
                    symbol={asset.symbol}
                    direction={asset.direction}
                    impact={asset.impact}
                  />
                ))}
                {flag.affectedAssets.length > 3 && (
                  <span className="text-xs text-text-muted self-center">
                    +{flag.affectedAssets.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
