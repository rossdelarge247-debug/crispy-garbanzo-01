import { formatCurrency, getDirectionLabel } from "@/lib/utils";
import type { TradePlan } from "@/types";

interface TradePlanCardProps {
  plan: TradePlan;
}

export default function TradePlanCard({ plan }: TradePlanCardProps) {
  const arrow =
    plan.direction === "long" ? "↑" : plan.direction === "short" ? "↓" : "→";

  const dirColor =
    plan.direction === "long"
      ? "text-conviction-high"
      : plan.direction === "short"
        ? "text-conviction-danger"
        : "text-conviction-low";

  return (
    <article className="bg-white rounded-xl border border-surface-border shadow-soft">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${dirColor}`}>{arrow}</span>
            <span className="text-lg font-semibold text-text-primary">{plan.asset}</span>
            <span className="text-xs font-medium text-text-muted">
              {getDirectionLabel(plan.direction)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-lg bg-accent text-white">
              {plan.executionMode}
            </span>
            <span className="text-xs font-medium text-text-muted">
              {plan.status.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Numbers grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="block text-xs font-medium text-text-muted mb-0.5">Entry</span>
            <span className="text-base font-mono font-semibold text-text-primary">
              {formatCurrency(plan.entryPrice)}
            </span>
          </div>
          <div>
            <span className="block text-xs font-medium text-text-muted mb-0.5">Stop loss</span>
            <span className="text-base font-mono font-semibold text-conviction-danger">
              {formatCurrency(plan.stopLoss)}
            </span>
          </div>
          <div>
            <span className="block text-xs font-medium text-text-muted mb-0.5">Targets</span>
            <div className="flex gap-2">
              {plan.takeProfitTargets.map((target, i) => (
                <span key={i} className="text-base font-mono font-semibold text-conviction-high">
                  {formatCurrency(target)}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="block text-xs font-medium text-text-muted mb-0.5">Risk</span>
            <span className="text-base font-mono font-semibold text-text-primary">{plan.riskPercent}%</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 pt-3 border-t border-surface-border text-xs font-medium text-text-muted">
          <span>{plan.entryType} order</span>
          <span>Size: {plan.suggestedSize}</span>
          <span>Hold: {plan.maxHoldingPeriod}</span>
        </div>
      </div>
    </article>
  );
}
