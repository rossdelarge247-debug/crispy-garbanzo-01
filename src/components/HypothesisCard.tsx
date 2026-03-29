"use client";

import Link from "next/link";
import { getDirectionLabel } from "@/lib/utils";
import type { Hypothesis } from "@/types";
import ProgressBar from "./ProgressBar";
import ExpandableSection from "./ExpandableSection";

interface HypothesisCardProps {
  hypothesis: Hypothesis;
  flagId: string;
}

export default function HypothesisCard({ hypothesis, flagId }: HypothesisCardProps) {
  const arrow =
    hypothesis.direction === "long"
      ? "↑"
      : hypothesis.direction === "short"
        ? "↓"
        : "→";

  const dirColor =
    hypothesis.direction === "long"
      ? "text-conviction-high"
      : hypothesis.direction === "short"
        ? "text-conviction-danger"
        : "text-conviction-low";

  const confidenceColor =
    hypothesis.confidenceScore >= 70
      ? "bg-conviction-high"
      : hypothesis.confidenceScore >= 50
        ? "bg-conviction-medium"
        : "bg-conviction-low";

  return (
    <article className="bg-surface-raised rounded-2xl shadow-soft">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-2 min-w-0">
            <span className={`text-xl font-extrabold ${dirColor}`}>{arrow}</span>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-text-primary leading-tight">
                {hypothesis.title}
              </h4>
              <span className="text-xs font-bold text-text-muted">
                {hypothesis.status} · {getDirectionLabel(hypothesis.direction)}
              </span>
            </div>
          </div>
        </div>

        <p className="text-sm text-text-secondary leading-snug mb-3">
          {hypothesis.summary}
        </p>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-text-muted">Confidence</span>
            <span className="text-xs font-bold text-text-primary">{hypothesis.confidenceScore}%</span>
          </div>
          <ProgressBar value={hypothesis.confidenceScore} color={confidenceColor} size="sm" />
        </div>

        <ExpandableSection title="Invalidation" defaultOpen={false}>
          <p className="text-xs text-text-secondary leading-relaxed">
            {hypothesis.invalidation}
          </p>
        </ExpandableSection>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-border">
          <span className="text-xs text-text-muted">{hypothesis.suggestedAction}</span>
          <Link
            href={`/flags/${flagId}/test-runner`}
            className="text-xs font-bold text-accent-dark hover:text-accent transition-colors duration-300"
          >
            Run tests →
          </Link>
        </div>
      </div>
    </article>
  );
}
