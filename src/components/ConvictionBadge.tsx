"use client";

import { formatConviction } from "@/lib/utils";

interface ConvictionBadgeProps {
  score: number;
  size?: "sm" | "md";
}

export default function ConvictionBadge({ score, size = "md" }: ConvictionBadgeProps) {
  const bg =
    score >= 70
      ? "bg-conviction-high text-white"
      : score >= 50
        ? "bg-conviction-medium text-white"
        : "bg-conviction-low text-white";

  return (
    <span
      className={`inline-flex items-center font-black uppercase tracking-wide ${bg} ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
    >
      {formatConviction(score)}
    </span>
  );
}
