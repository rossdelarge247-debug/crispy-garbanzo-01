import type { FlagStatus } from "@/types";

interface StatusBadgeProps {
  status: FlagStatus;
}

const statusStyles: Record<FlagStatus, string> = {
  emerging: "bg-accent/15 text-accent-dark",
  active: "bg-conviction-high/10 text-conviction-high",
  maturing: "bg-conviction-medium/10 text-conviction-medium",
  volatile: "bg-conviction-caution/10 text-conviction-caution",
  invalidated: "bg-conviction-low/10 text-conviction-low",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
