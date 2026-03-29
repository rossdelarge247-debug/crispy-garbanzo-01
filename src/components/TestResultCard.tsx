"use client";

import type { TestScenario } from "@/types";
import ExpandableSection from "./ExpandableSection";

interface TestResultCardProps {
  test: TestScenario;
}

const resultStyles: Record<string, string> = {
  pass: "bg-conviction-high text-white",
  mixed: "bg-conviction-medium text-white",
  weak: "bg-conviction-caution text-white",
  fail: "bg-conviction-danger text-white",
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
    <article className="border-2 border-black bg-white">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4 className="text-sm font-bold text-black leading-tight">
            {test.name}
          </h4>
          <span className="shrink-0 px-2 py-0.5 text-xs font-bold uppercase tracking-wide border-2 border-black text-black">
            {test.type}
          </span>
        </div>

        {/* Result + impact */}
        <div className="flex items-center gap-3 mb-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 text-xs font-black uppercase tracking-wide ${
              resultStyles[test.result] || "bg-conviction-low text-white"
            }`}
          >
            {test.result}
          </span>
          <span className={`text-xs font-bold ${impactColor}`}>
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
                <div key={key} className="flex justify-between text-xs border-b border-black/5 py-1">
                  <span className="text-text-muted uppercase tracking-wide font-bold">{key}</span>
                  <span className="text-black font-bold">{value}</span>
                </div>
              ))}
            </div>
          )}
        </ExpandableSection>
      </div>
    </article>
  );
}
