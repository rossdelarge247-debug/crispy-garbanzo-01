"use client";

import Link from "next/link";
import { cn, timeAgo } from "@/lib/utils";
import type { MarketFlag } from "@/types";
import ConvictionBadge from "./ConvictionBadge";
import StatusBadge from "./StatusBadge";
import AssetPill from "./AssetPill";

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
          "hover:border-surface-hover hover:bg-surface-overlay hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20",
          "animate-in slide-in-from-bottom-2 fade-in font-sans"
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

        {/* Conviction + time horizon */}
        <div className="flex items-center gap-3 mb-4">
          <ConvictionBadge score={flag.convictionScore} size="sm" />
          <span className="text-xs text-text-muted capitalize">
            {flag.timeHorizon}
          </span>
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
