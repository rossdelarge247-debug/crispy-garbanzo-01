"use client";

import { useState } from "react";
import Link from "next/link";
import { cn, getDirectionLabel } from "@/lib/utils";
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

  const arrowColor =
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

  const statusColor =
    hypothesis.status === "confirmed"
      ? "text-conviction-high"
      : hypothesis.status === "weakening"
        ? "text-conviction-caution"
        : hypothesis.status === "invalidated"
          ? "text-conviction-danger"
          : "text-text-secondary";

  return (
    <article
      className={cn(
        "rounded-2xl border border-surface-border bg-surface-raised p-5",
        "transition-all duration-200 font-sans"
      )}
    >
      {/* Header: direction arrow + title + status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2 min-w-0">
          <span className={cn("text-lg mt-0.5 shrink-0", arrowColor)}>
            {arrow}
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-text-primary leading-snug">
              {hypothesis.title}
            </h4>
            <span className={cn("text-xs font-medium capitalize", statusColor)}>
              {hypothesis.status}
            </span>
          </div>
        </div>
        <span className="text-xs text-text-muted capitalize shrink-0">
          {getDirectionLabel(hypothesis.direction)}
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        {hypothesis.summary}
      </p>

      {/* Confidence score bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-text-muted">Confidence</span>
          <span className="text-xs font-medium text-text-primary">
            {hypothesis.confidenceScore}%
          </span>
        </div>
        <ProgressBar value={hypothesis.confidenceScore} color={confidenceColor} size="sm" />
      </div>

      {/* Invalidation condition (collapsed) */}
      <ExpandableSection title="Invalidation Condition" defaultOpen={false}>
        <p className="text-xs text-text-secondary leading-relaxed">
          {hypothesis.invalidation}
        </p>
      </ExpandableSection>

      {/* Suggested action + link to test runner */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-border">
        <span className="text-xs text-text-muted">{hypothesis.suggestedAction}</span>
        <Link
          href={`/flags/${flagId}/test-runner`}
          className="text-xs font-medium text-accent-dim hover:text-accent transition-colors duration-200"
        >
          Run Tests &rarr;
        </Link>
      </div>
    </article>
  );
}
