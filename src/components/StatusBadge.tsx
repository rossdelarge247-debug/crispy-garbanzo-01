import { cn, getStatusColor } from "@/lib/utils";
import type { FlagStatus } from "@/types";

interface StatusBadgeProps {
  status: FlagStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize font-sans transition-all duration-200",
        getStatusColor(status)
      )}
    >
      {status}
    </span>
  );
}
