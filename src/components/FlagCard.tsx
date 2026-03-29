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
  "flag-oil-geo": "#00a63e",
  "flag-crypto-sentiment": "#ff8800",
  "flag-usd-strength": "#00a63e",
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
      return "bg-conviction-high text-white";
    case "monitor":
      return "bg-conviction-medium text-white";
    case "wait":
      return "bg-conviction-low text-white";
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

export default function FlagCard({ flag, intel }: FlagCardProps) {
  return (
    <Link href={`/flags/${flag.id}`} className="block group">
      <article className="relative flex flex-col border-2 border-black bg-white h-full transition-all duration-100 hover:bg-surface-raised hover:-translate-y-px">
        {/* Top accent bar */}
        <div
          className="h-1"
          style={{
            backgroundColor:
              flag.convictionScore >= 70
                ? "#00a63e"
                : flag.convictionScore >= 50
                  ? "#ff8800"
                  : "#888888",
          }}
        />

        {/* Sparkline */}
        {sparklineData[flag.id] && (
          <div className="px-4 pt-3">
            <MiniSparkline
              data={sparklineData[flag.id]}
              width={320}
              height={40}
              color={sparklineColors[flag.id] || "#000"}
            />
          </div>
        )}

        {/* Content */}
        <div className="p-4 pt-2 flex flex-col flex-1">
          {/* Category + status */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
              {flag.category}
            </span>
            <StatusBadge status={flag.status} />
          </div>

          {/* Title */}
          <h3 className="text-base font-black text-black leading-tight mb-2 group-hover:text-accent-glow transition-colors duration-100">
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
            <div className="border-t-2 border-black pt-3 mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                  {intel.hypothesisCount} scenarios
                </span>
                <span className="text-xs font-bold">
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
                  className={`inline-flex items-center px-2 py-0.5 text-xs font-black uppercase tracking-wide ${getVerdictStyle(intel.verdict)}`}
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
          <div className="mt-auto pt-3 border-t border-black/10 flex flex-wrap gap-1">
            {flag.affectedAssets.slice(0, 3).map((asset) => (
              <span
                key={asset.symbol}
                className="text-xs font-bold text-text-secondary uppercase tracking-wide"
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
