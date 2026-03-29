"use client";

import { formatConviction } from "@/lib/utils";

interface ConvictionBadgeProps {
  score: number;
  size?: "sm" | "md";
}

export default function ConvictionBadge({ score, size = "md" }: ConvictionBadgeProps) {
  const style =
    score >= 70
      ? "bg-conviction-high/10 text-conviction-high"
      : score >= 50
        ? "bg-conviction-medium/10 text-conviction-medium"
        : "bg-conviction-low/10 text-conviction-low";

  const dotColor =
    score >= 70
      ? "bg-conviction-high"
      : score >= 50
        ? "bg-conviction-medium"
        : "bg-conviction-low";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-lg ${style} ${
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3.5 py-1 text-sm"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {formatConviction(score)}
    </span>
  );
}
