"use client";

import { cn } from "@/lib/utils";
import type { TestScenario } from "@/types";
import ExpandableSection from "./ExpandableSection";

interface TestResultCardProps {
  test: TestScenario;
}

const resultStyles: Record<string, string> = {
  pass: "text-conviction-high bg-conviction-high/10 border-conviction-high/20",
  mixed: "text-conviction-medium bg-conviction-medium/10 border-conviction-medium/20",
  weak: "text-conviction-caution bg-conviction-caution/10 border-conviction-caution/20",
  fail: "text-conviction-danger bg-conviction-danger/10 border-conviction-danger/20",
};

const typeStyles: Record<string, string> = {
  analog: "text-accent-glow bg-accent-glow/10",
  scenario: "text-conviction-medium bg-conviction-medium/10",
  sensitivity: "text-conviction-caution bg-conviction-caution/10",
  backtest: "text-conviction-high bg-conviction-high/10",
  simulation: "text-accent bg-accent/10",
};

export default function TestResultCard({ test }: TestResultCardProps) {
  const impactSign = test.confidenceImpact >= 0 ? "+" : "";
  const impactColor =
    test.confidenceImpact > 0
      ? "text-conviction-high"
      : test.confidenceImpact < 0
        ? "text-conviction-danger"
        : "text-text-muted";

  return (
    <article
      className={cn(
        "rounded-2xl border border-surface-border bg-surface-raised p-5",
        "transition-all duration-200 font-sans"
      )}
    >
      {/* Header: name + type badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h4 className="text-sm font-semibold text-text-primary leading-snug">
          {test.name}
        </h4>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
            typeStyles[test.type] || "text-text-secondary bg-surface-overlay"
          )}
        >
          {test.type}
        </span>
      </div>

      {/* Result + confidence impact */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
            resultStyles[test.result] || "text-text-secondary"
          )}
        >
          {test.result}
        </span>
        <span className={cn("text-xs font-medium", impactColor)}>
          {impactSign}{test.confidenceImpact}% confidence
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-text-secondary leading-relaxed mb-3">
        {test.description}
      </p>

      {/* Details (collapsed) */}
      <ExpandableSection title="Details" defaultOpen={false}>
        <p className="text-xs text-text-secondary leading-relaxed mb-2">
          {test.details}
        </p>
        {test.metrics && Object.keys(test.metrics).length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {Object.entries(test.metrics).map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-text-muted">{key}</span>
                <span className="text-text-primary font-medium">{value}</span>
              </div>
            ))}
          </div>
        )}
      </ExpandableSection>
    </article>
  );
}
