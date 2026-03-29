import type { FlagStatus } from "@/types";

interface StatusBadgeProps {
  status: FlagStatus;
}

const statusStyles: Record<FlagStatus, string> = {
  emerging: "bg-accent/10 text-accent",
  active: "bg-conviction-high/10 text-conviction-high",
  maturing: "bg-conviction-medium/10 text-conviction-medium",
  volatile: "bg-conviction-caution/10 text-conviction-caution",
  invalidated: "bg-conviction-low/10 text-conviction-low",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
