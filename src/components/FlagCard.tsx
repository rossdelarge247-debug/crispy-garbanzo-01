"use client";

import Link from "next/link";
import type { MarketFlag } from "@/types";
import ConvictionBadge from "./ConvictionBadge";
import StatusBadge from "./StatusBadge";
import MiniSparkline from "./MiniSparkline";

const sparklineData: Record<string, number[]> = {
  "flag-oil-geo": [82, 83, 84.5, 83.8, 85, 86.2, 85.5, 87, 87.5, 88, 87.8, 88.5, 89, 89.4],
  "flag-crypto-sentiment": [72000, 68000, 64000, 59000, 61000, 63500, 65000, 64200, 66000, 67000, 67800, 68200],
  "flag-usd-strength": [101.5, 102, 102.3, 102.8, 103, 103.5, 103.2, 103.8, 104, 104.3, 104.5, 104.8],
};

const sparklineColors: Record<string, string> = {
  "flag-oil-geo": "#34d399",
  "flag-crypto-sentiment": "#fbbf24",
  "flag-usd-strength": "#34d399",
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
      return "bg-conviction-high/10 text-conviction-high";
    case "monitor":
      return "bg-conviction-medium/10 text-conviction-medium";
    case "wait":
      return "bg-conviction-low/10 text-conviction-low";
  }
}

function getVerdictLabel(verdict: "explore" | "monitor" | "wait") {
  switch (verdict) {
    case "explore":
      return "Explore";
    case "monitor":
      return "Monitor";
    case "wait":
      return "Wait";
  }
}

function getAccentColor(score: number) {
  if (score >= 70) return "bg-conviction-high";
  if (score >= 50) return "bg-conviction-medium";
  return "bg-conviction-low";
}

export default function FlagCard({ flag, intel }: FlagCardProps) {
  return (
    <Link href={`/flags/${flag.id}`} className="block group">
      <article className="relative flex flex-col bg-surface-raised rounded-xl border border-surface-border shadow-soft h-full transition-all duration-200 hover:shadow-card hover:border-accent/30 overflow-hidden">
        {/* Top accent bar */}
        <div className={`h-0.5 ${getAccentColor(flag.convictionScore)}`} />

        {/* Sparkline */}
        {sparklineData[flag.id] && (
          <div className="px-4 pt-3">
            <MiniSparkline
              data={sparklineData[flag.id]}
              width={320}
              height={40}
              color={sparklineColors[flag.id] || "#6366f1"}
            />
          </div>
        )}

        {/* Content */}
        <div className="p-4 pt-3 flex flex-col flex-1">
          {/* Category + status */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-text-muted">
              {flag.category}
            </span>
            <StatusBadge status={flag.status} />
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold text-text-primary leading-tight mb-2 group-hover:text-accent transition-colors duration-200">
            {flag.title}
          </h3>

          {/* Summary */}
          <p className="text-sm text-text-secondary leading-snug mb-3 line-clamp-2">
            {flag.summary}
          </p>

          {/* Conviction */}
          <div className="mb-3">
            <ConvictionBadge score={flag.convictionScore} size="sm" />
          </div>

          {/* Intel block */}
          {intel && (
            <div className="border-t border-surface-border pt-3 mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-text-secondary">
                  {intel.hypothesisCount} scenarios
                </span>
                <span className="text-xs font-medium">
                  <span className="text-conviction-high">{intel.testsPassed}</span>
                  <span className="text-text-muted">/{intel.testsTotal} passed</span>
                </span>
              </div>

              {intel.topHypothesis && (
                <p className="text-xs text-text-secondary mb-2 line-clamp-1">
                  → {intel.topHypothesis}
                </p>
              )}

              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-lg ${getVerdictStyle(intel.verdict)}`}
                >
                  {getVerdictLabel(intel.verdict)}
                </span>
                <span className="text-xs text-text-muted truncate">
                  {intel.verdictReason}
                </span>
              </div>
            </div>
          )}

          {/* Assets — bottom */}
          <div className="mt-auto pt-3 border-t border-surface-border flex flex-wrap gap-1.5">
            {flag.affectedAssets.slice(0, 3).map((asset) => (
              <span
                key={asset.symbol}
                className="font-mono text-xs text-text-secondary bg-surface-overlay rounded-md px-2 py-0.5"
              >
                {asset.symbol}
              </span>
            ))}
          </div>
        </div>
      </article>
    </Link>
  );
}
