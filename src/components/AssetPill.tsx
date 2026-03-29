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
      className={`inline-flex items-center gap-1 border px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${
        impact === "primary"
          ? "border-black bg-black text-white"
          : "border-black text-black"
      }`}
    >
      <span className={impact === "primary" ? "text-white" : arrowColor}>{arrow}</span>
      {symbol}
    </span>
  );
}
