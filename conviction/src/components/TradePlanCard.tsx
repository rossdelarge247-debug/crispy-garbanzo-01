import { cn, formatCurrency, getDirectionLabel } from "@/lib/utils";
import type { TradePlan } from "@/types";

interface TradePlanCardProps {
  plan: TradePlan;
}

const modeStyles: Record<string, string> = {
  watch: "text-text-secondary bg-text-secondary/10",
  paper: "text-conviction-medium bg-conviction-medium/10",
  live: "text-conviction-high bg-conviction-high/10",
  autonomous: "text-accent-glow bg-accent-glow/10",
};

const statusStyles: Record<string, string> = {
  draft: "text-text-muted",
  pending_approval: "text-conviction-caution",
  approved: "text-conviction-high",
  active: "text-accent-glow",
  closed: "text-text-secondary",
  cancelled: "text-conviction-danger",
};

export default function TradePlanCard({ plan }: TradePlanCardProps) {
  const arrow =
    plan.direction === "long"
      ? "↑"
      : plan.direction === "short"
        ? "↓"
        : "→";

  const directionColor =
    plan.direction === "long"
      ? "text-conviction-high"
      : plan.direction === "short"
        ? "text-conviction-danger"
        : "text-conviction-low";

  return (
    <article
      className={cn(
        "rounded-2xl border border-surface-border bg-surface-raised p-5",
        "transition-all duration-200 font-sans"
      )}
    >
      {/* Header: asset + direction + mode + status */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className={cn("text-lg font-bold", directionColor)}>{arrow}</span>
          <span className="text-sm font-semibold text-text-primary">{plan.asset}</span>
          <span className="text-xs text-text-muted capitalize">
            {getDirectionLabel(plan.direction)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
              modeStyles[plan.executionMode] || "text-text-secondary"
            )}
          >
            {plan.executionMode}
          </span>
          <span
            className={cn(
              "text-xs font-medium capitalize",
              statusStyles[plan.status] || "text-text-muted"
            )}
          >
            {plan.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Two-column number grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4">
        <div>
          <span className="block text-xs text-text-muted mb-0.5">Entry</span>
          <span className="text-sm font-medium text-text-primary">
            {formatCurrency(plan.entryPrice)}
            {plan.entryRangeHigh && (
              <span className="text-text-muted"> – {formatCurrency(plan.entryRangeHigh)}</span>
            )}
          </span>
        </div>
        <div>
          <span className="block text-xs text-text-muted mb-0.5">Stop Loss</span>
          <span className="text-sm font-medium text-conviction-danger">
            {formatCurrency(plan.stopLoss)}
          </span>
        </div>
        <div>
          <span className="block text-xs text-text-muted mb-0.5">Targets</span>
          <div className="flex flex-wrap gap-1.5">
            {plan.takeProfitTargets.map((target, i) => (
              <span key={i} className="text-sm font-medium text-conviction-high">
                {formatCurrency(target)}
              </span>
            ))}
          </div>
        </div>
        <div>
          <span className="block text-xs text-text-muted mb-0.5">Risk</span>
          <span className="text-sm font-medium text-text-primary">
            {plan.riskPercent}%
          </span>
        </div>
      </div>

      {/* Footer details */}
      <div className="flex items-center gap-4 pt-3 border-t border-surface-border text-xs text-text-muted">
        <span className="capitalize">{plan.entryType} order</span>
        <span>Size: {plan.suggestedSize}</span>
        <span>Hold: {plan.maxHoldingPeriod}</span>
      </div>
    </article>
  );
}
