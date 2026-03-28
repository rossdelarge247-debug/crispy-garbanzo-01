import { cn, getDirectionLabel } from "@/lib/utils";
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
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-surface-border px-2.5 py-0.5 text-xs font-medium font-sans transition-all duration-200",
        impact === "primary"
          ? "bg-surface-raised text-text-primary"
          : "bg-surface-DEFAULT text-text-secondary"
      )}
      title={`${symbol} — ${getDirectionLabel(direction)}`}
    >
      <span className={arrowColor}>{arrow}</span>
      {symbol}
    </span>
  );
}
