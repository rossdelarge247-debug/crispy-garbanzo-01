"use client";

import { cn, formatConviction } from "@/lib/utils";

interface ConvictionBadgeProps {
  score: number;
  size?: "sm" | "md";
}

export default function ConvictionBadge({ score, size = "md" }: ConvictionBadgeProps) {
  const colorClass =
    score >= 70
      ? "bg-conviction-high/15 text-conviction-high border-conviction-high/25"
      : score >= 50
        ? "bg-conviction-medium/15 text-conviction-medium border-conviction-medium/25"
        : "bg-conviction-low/15 text-conviction-low border-conviction-low/25";

  const dotColor =
    score >= 70
      ? "bg-conviction-high"
      : score >= 50
        ? "bg-conviction-medium"
        : "bg-conviction-low";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium font-sans transition-all duration-200",
        colorClass,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      <span
        className={cn(
          "rounded-full shrink-0",
          dotColor,
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"
        )}
      />
      {formatConviction(score)}
    </span>
  );
}
