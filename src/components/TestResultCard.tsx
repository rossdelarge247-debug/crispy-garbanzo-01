"use client";

import type { TestScenario } from "@/types";
import ExpandableSection from "./ExpandableSection";

interface TestResultCardProps {
  test: TestScenario;
}

const resultStyles: Record<string, string> = {
  pass: "bg-conviction-high/10 text-conviction-high",
  mixed: "bg-conviction-medium/10 text-conviction-medium",
  weak: "bg-conviction-caution/10 text-conviction-caution",
  fail: "bg-conviction-danger/10 text-conviction-danger",
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
    <article className="bg-white rounded-xl border border-surface-border shadow-soft">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4 className="text-sm font-semibold text-text-primary leading-tight">
            {test.name}
          </h4>
          <span className="shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-lg bg-surface-overlay text-text-secondary">
            {test.type}
          </span>
        </div>

        {/* Result + impact */}
        <div className="flex items-center gap-3 mb-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-lg ${
              resultStyles[test.result] || "bg-conviction-low/10 text-conviction-low"
            }`}
          >
            {test.result}
          </span>
          <span className={`text-xs font-medium ${impactColor}`}>
            {impactSign}{test.confidenceImpact}% confidence
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-text-secondary leading-relaxed mb-3">
          {test.description}
        </p>

        {/* Details */}
        <ExpandableSection title="Details" defaultOpen={false}>
          <p className="text-xs text-text-secondary leading-relaxed mb-2">
            {test.details}
          </p>
          {test.metrics && Object.keys(test.metrics).length > 0 && (
            <div className="grid grid-cols-2 gap-1 mt-2">
              {Object.entries(test.metrics).map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs border-b border-surface-border py-1">
                  <span className="text-text-muted font-medium">{key}</span>
                  <span className="text-text-primary font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}
        </ExpandableSection>
      </div>
    </article>
  );
}
