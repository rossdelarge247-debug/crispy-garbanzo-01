import type { FlagStatus } from "@/types";

interface StatusBadgeProps {
  status: FlagStatus;
}

const statusStyles: Record<FlagStatus, string> = {
  emerging: "border-accent-glow text-accent-glow",
  active: "border-conviction-high text-conviction-high",
  maturing: "border-conviction-medium text-conviction-medium",
  volatile: "border-conviction-caution text-conviction-caution",
  invalidated: "border-conviction-low text-conviction-low",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center border-2 px-2 py-0.5 text-xs font-bold uppercase tracking-widest ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
