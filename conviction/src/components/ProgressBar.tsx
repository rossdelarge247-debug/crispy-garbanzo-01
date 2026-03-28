import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  color: string;
  size?: "sm" | "md";
}

export default function ProgressBar({ value, color, size = "md" }: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn(
        "w-full rounded-full bg-surface-overlay overflow-hidden",
        size === "sm" ? "h-1" : "h-1.5"
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500 ease-out", color)}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}
