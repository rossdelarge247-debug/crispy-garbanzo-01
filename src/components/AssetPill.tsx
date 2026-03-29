import type { Direction } from "@/types";

interface AssetPillProps {
  symbol: string;
  direction: Direction;
  impact: "primary" | "secondary";
}

export default function AssetPill({ symbol, direction, impact }: AssetPillProps) {
  const arrow =
    direction === "long" ? "↑" : direction === "short" ? "↓" : "→";

  const arrowColor =
    direction === "long"
      ? "text-conviction-high"
      : direction === "short"
        ? "text-conviction-danger"
        : "text-conviction-low";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
        impact === "primary"
          ? "bg-accent/15 text-accent-dark"
          : "bg-surface-overlay text-text-secondary"
      }`}
    >
      <span className={arrowColor}>{arrow}</span>
      {symbol}
    </span>
  );
}
