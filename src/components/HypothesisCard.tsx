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
    <article className="border-2 border-black bg-white">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-2 min-w-0">
            <span className={`text-xl font-black ${dirColor}`}>{arrow}</span>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-black leading-tight">
                {hypothesis.title}
              </h4>
              <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
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
            <span className="text-xs font-bold uppercase tracking-wide text-text-muted">Confidence</span>
            <span className="text-xs font-black text-black">{hypothesis.confidenceScore}%</span>
          </div>
          <ProgressBar value={hypothesis.confidenceScore} color={confidenceColor} size="sm" />
        </div>

        <ExpandableSection title="Invalidation" defaultOpen={false}>
          <p className="text-xs text-text-secondary leading-relaxed">
            {hypothesis.invalidation}
          </p>
        </ExpandableSection>

        <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-black/10">
          <span className="text-xs text-text-muted">{hypothesis.suggestedAction}</span>
          <Link
            href={`/flags/${flagId}/test-runner`}
            className="text-xs font-bold uppercase tracking-wide text-black hover:text-accent-glow transition-colors"
          >
            Run Tests →
          </Link>
        </div>
      </div>
    </article>
  );
}
