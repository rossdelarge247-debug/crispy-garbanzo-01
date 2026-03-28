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

interface FlagCardProps {
  flag: MarketFlag;
}

export default function FlagCard({ flag }: FlagCardProps) {
  return (
    <Link href={`/flags/${flag.id}`} className="block group">
      <article
        className={cn(
          "relative rounded-2xl border border-surface-border bg-surface-raised p-6",
          "transition-all duration-200 ease-out",
          "hover:border-surface-hover hover:bg-surface-overlay hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5",
          "animate-slide-up font-sans"
        )}
      >
        {/* Top row: category tag + time + status */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-muted bg-surface-DEFAULT rounded-full px-2.5 py-0.5 border border-surface-border">
              {flag.category}
            </span>
            <span className="text-xs text-text-muted">
              {timeAgo(flag.updatedAt)}
            </span>
          </div>
          <StatusBadge status={flag.status} />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-text-primary mb-2 leading-snug group-hover:text-accent-glow transition-colors duration-200">
          {flag.title}
        </h3>

        {/* Summary — 2 lines max */}
        <p className="text-sm text-text-secondary leading-relaxed mb-4 line-clamp-2">
          {flag.summary}
        </p>

        {/* Conviction + sparkline + time horizon */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ConvictionBadge score={flag.convictionScore} size="sm" />
            <span className="text-xs text-text-muted capitalize">
              {flag.timeHorizon}
            </span>
          </div>
          {sparklineData[flag.id] && (
            <MiniSparkline
              data={sparklineData[flag.id]}
              width={96}
              height={28}
              color={sparklineColors[flag.id] || "#1a1a2e"}
            />
          )}
        </div>

        {/* Affected assets */}
        {flag.affectedAssets.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {flag.affectedAssets.map((asset) => (
              <AssetPill
                key={asset.symbol}
                symbol={asset.symbol}
                direction={asset.direction}
                impact={asset.impact}
              />
            ))}
          </div>
        )}

        {/* Suggested action */}
        <div className="pt-3 border-t border-surface-border">
          <span className="text-xs font-medium text-accent-dim group-hover:text-accent transition-colors duration-200">
            {flag.suggestedAction}
          </span>
        </div>
      </article>
    </Link>
  );
}
