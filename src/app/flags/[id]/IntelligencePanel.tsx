"use client";

/**
 * IntelligencePanel — fetches and renders the full conviction breakdown
 * for a flag detail page. Client component so it can lazy-load after the
 * main page renders, keeping Time-to-First-Byte fast.
 */

import { useEffect, useState } from "react";
import ConvictionMeter from "@/components/ConvictionMeter";

interface IntelligenceData {
  confidence: {
    finalScore: number;
    grade: "A" | "B" | "C" | "D" | "F";
    summaryLine: string;
    topPositive: string;
    topNegative: string | null;
    dimensions: Array<{
      name: string;
      score: number;
      label: string;
      positive: boolean;
    }>;
    label: string;
    subtext: string;
  };
  regime: {
    badge: string;
    color: string;
    explanation: string;
  };
  changepoint: {
    hasSignal: boolean;
    badge: string | null;
    explanation: string;
  };
  anomaly: {
    shouldWarn: boolean;
    warningBadge: string | null;
    warningColor: string;
    warningText: string | null;
  };
  filter: {
    verdict: string;
    verdictReason: string;
    tradeabilityWarning: string | null;
    isSupressed: boolean;
  };
}

interface Props {
  flagId: string;
}

export default function IntelligencePanel({ flagId }: Props) {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/intelligence/${flagId}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [flagId]);

  if (loading) {
    return (
      <div className="bg-surface-raised rounded-xl border border-surface-border p-5 animate-pulse">
        <div className="h-4 bg-surface-overlay rounded w-32 mb-3" />
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-surface-overlay" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-surface-overlay rounded w-3/4" />
            <div className="h-3 bg-surface-overlay rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { confidence, regime, changepoint, anomaly, filter } = data;

  return (
    <div className="bg-surface-raised rounded-xl border border-surface-border p-5 space-y-5">
      {/* Top row: meter + regime badge */}
      <div className="flex items-start gap-6">
        <ConvictionMeter
          score={confidence.finalScore}
          grade={confidence.grade}
          label={confidence.label}
          subtext={confidence.subtext}
          dimensions={confidence.dimensions}
          showBreakdown
          size="md"
        />

        <div className="flex-1 space-y-3 pt-1">
          {/* Summary line */}
          <p className="text-sm text-text-primary leading-relaxed font-medium">
            {confidence.summaryLine}
          </p>

          {/* Regime badge */}
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${regime.color}`}>
              {regime.badge}
            </span>
            {changepoint.hasSignal && changepoint.badge && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full text-accent bg-accent/10">
                {changepoint.badge}
              </span>
            )}
          </div>

          {/* Regime explanation */}
          <p className="text-xs text-text-secondary leading-relaxed">
            {regime.explanation}
          </p>

          {/* Tradeability warning */}
          {filter.tradeabilityWarning && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-400/5 border border-amber-400/20">
              <span className="text-amber-400 text-sm shrink-0">!</span>
              <p className="text-xs text-amber-300 leading-relaxed">{filter.tradeabilityWarning}</p>
            </div>
          )}

          {/* Anomaly warning */}
          {anomaly.shouldWarn && anomaly.warningText && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-400/5 border border-orange-400/20">
              <span className="text-orange-400 text-sm shrink-0">⚠</span>
              <p className="text-xs text-orange-300 leading-relaxed">{anomaly.warningText}</p>
            </div>
          )}

          {/* Top positive / negative */}
          <div className="space-y-1">
            {confidence.topPositive && (
              <p className="text-xs text-text-muted">
                <span className="text-emerald-400 font-medium">Best signal: </span>
                {confidence.topPositive}
              </p>
            )}
            {confidence.topNegative && (
              <p className="text-xs text-text-muted">
                <span className="text-orange-400 font-medium">Main risk: </span>
                {confidence.topNegative}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
