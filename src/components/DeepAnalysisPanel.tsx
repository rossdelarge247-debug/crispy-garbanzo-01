"use client";

import { useState, useEffect } from "react";
import { ANALYSIS_FRAMEWORKS } from "@/services/ai-analysis";
import type { SynthesizedHypothesis } from "@/services/hypothesis-synthesizer";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";
import ExpandableSection from "./ExpandableSection";
import ProgressBar from "./ProgressBar";

interface DeepAnalysisPanelProps {
  flagId: string;
}

interface AnalysisResult {
  type: string;
  title: string;
  content: string;
  source: "ai" | "rules";
  generatedAt: string;
}

function extractTopLine(content: string): string {
  const lines = content.split("\n").filter(l => l.trim() && !l.startsWith("##") && !l.startsWith("---") && !l.startsWith("*"));
  const first = lines[0] || "";
  return first.replace(/\*\*/g, "").replace(/^- /, "").replace(/^→ /, "").slice(0, 150);
}

function RenderMarkdown({ content }: { content: string }) {
  return (
    <div className="space-y-1">
      {content.split("\n").map((line, i) => {
        if (line.startsWith("## ")) return <h2 key={i} className="text-sm font-semibold text-text-primary mt-4 mb-2 pb-1 border-b border-surface-border first:mt-0">{line.replace("## ", "")}</h2>;
        if (line.startsWith("### ")) return <h3 key={i} className="text-sm font-semibold text-text-primary mt-3 mb-1">{line.replace("### ", "")}</h3>;
        if (line.startsWith("- **")) {
          const m = line.match(/^- \*\*(.+?)\*\*(.*)$/);
          if (m) return <p key={i} className="text-sm text-text-secondary pl-3">→ <span className="font-semibold text-text-primary">{m[1]}</span>{m[2]}</p>;
        }
        if (line.startsWith("- ")) return <p key={i} className="text-sm text-text-secondary pl-3">→ {line.replace("- ", "")}</p>;
        if (line.startsWith("---")) return <hr key={i} className="border-t border-surface-border my-3" />;
        if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) return <p key={i} className="text-xs text-text-muted italic mt-2">{line.replace(/^\*|\*$/g, "")}</p>;
        if (line.trim() === "") return <div key={i} className="h-1" />;
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={i} className="text-sm text-text-secondary leading-relaxed">
            {parts.map((part, j) => part.startsWith("**") && part.endsWith("**")
              ? <span key={j} className="font-semibold text-text-primary">{part.replace(/\*\*/g, "")}</span>
              : part
            )}
          </p>
        );
      })}
    </div>
  );
}

export default function DeepAnalysisPanel({ flagId }: DeepAnalysisPanelProps) {
  const [results, setResults] = useState<Record<string, AnalysisResult>>({});
  const [synthesized, setSynthesized] = useState<SynthesizedHypothesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customLoading, setCustomLoading] = useState(false);
  const [customResult, setCustomResult] = useState<AnalysisResult | null>(null);

  // Auto-run synthesis (which also runs all analyses)
  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/synthesize?flagId=${flagId}`);
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const data = await res.json();

        // Map analysis results
        const map: Record<string, AnalysisResult> = {};
        for (const r of data.analysisResults) {
          map[r.type] = r;
        }
        setResults(map);
        setSynthesized(data.hypotheses || []);
      } catch (err) {
        setError(String(err));
      }
      setLoading(false);
    }
    loadAll();
  }, [flagId]);

  async function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    setCustomLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagId, analysisType: "custom", customPrompt: customPrompt.trim() }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setCustomResult(await res.json());
    } catch { /* silently fail */ }
    setCustomLoading(false);
  }

  if (loading) {
    return <LoadingState title="Analyzing market situation..." subtitle="Running 6 frameworks, synthesizing trade hypotheses from news, sentiment, and social data" />;
  }

  if (error) {
    return <ErrorState title="Analysis couldn't load" description={error} onRetry={() => window.location.reload()} />;
  }

  const frameworkResults = ANALYSIS_FRAMEWORKS.map(fw => ({
    framework: fw,
    result: results[fw.type],
  })).filter(r => r.result);

  const dayTrades = synthesized.filter(h => h.horizon === "day_trade");
  const swingTrades = synthesized.filter(h => h.horizon === "swing_trade");
  const positionTrades = synthesized.filter(h => h.horizon === "position_trade");

  return (
    <div className="space-y-6">
      {/* ============================================================
          SYNTHESIZED TRADE IDEAS
          ============================================================ */}
      {synthesized.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-text-primary mb-3">
            Trade ideas from analysis
          </h3>
          <p className="text-sm text-text-muted mb-4">
            Generated by cross-referencing {frameworkResults.length} analysis frameworks with news sentiment and social signals.
          </p>

          {dayTrades.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium rounded-lg px-2.5 py-0.5 bg-conviction-danger/10 text-conviction-danger">Day trades</span>
                <span className="text-xs text-text-muted">Hours to 1 day</span>
              </div>
              <div className="space-y-2">
                {dayTrades.map(h => <SynthHypothesisCard key={h.id} h={h} />)}
              </div>
            </div>
          )}

          {swingTrades.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium rounded-lg px-2.5 py-0.5 bg-conviction-medium/10 text-conviction-medium">Swing trades</span>
                <span className="text-xs text-text-muted">2-7 days</span>
              </div>
              <div className="space-y-2">
                {swingTrades.map(h => <SynthHypothesisCard key={h.id} h={h} />)}
              </div>
            </div>
          )}

          {positionTrades.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium rounded-lg px-2.5 py-0.5 bg-conviction-high/10 text-conviction-high">Position trades</span>
                <span className="text-xs text-text-muted">1-4 weeks</span>
              </div>
              <div className="space-y-2">
                {positionTrades.map(h => <SynthHypothesisCard key={h.id} h={h} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          ANALYSIS FRAMEWORK CARDS — scorecard style
          ============================================================ */}
      <div>
        <h3 className="text-base font-semibold text-text-primary mb-3">
          Analysis frameworks
        </h3>
        <div className="space-y-2">
          {frameworkResults.map(({ framework, result }) => {
            const isExpanded = expandedCard === framework.type;
            const topLine = extractTopLine(result.content);

            return (
              <div key={framework.type} className="bg-surface-raised rounded-xl border border-surface-border shadow-soft overflow-hidden">
                <button
                  onClick={() => setExpandedCard(isExpanded ? null : framework.type)}
                  className="w-full text-left p-4 hover:bg-surface-overlay transition-colors duration-200"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">{framework.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-text-primary">{framework.title}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${
                          result.source === "ai" ? "bg-accent/10 text-accent" : "bg-surface-overlay text-text-muted"
                        }`}>
                          {result.source === "ai" ? "AI" : "Auto"}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary line-clamp-2">{topLine}</p>
                    </div>
                    <span className="text-text-muted shrink-0 text-sm transition-transform duration-200" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-surface-border pt-3">
                    <RenderMarkdown content={result.content} />
                    <p className="text-xs text-text-muted mt-3">Generated {new Date(result.generatedAt).toLocaleTimeString()}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================
          CUSTOM Q&A
          ============================================================ */}
      <div className="bg-surface-raised rounded-xl border border-surface-border shadow-soft p-4">
        <form onSubmit={handleCustomSubmit} className="flex gap-2">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Ask a specific question about this situation..."
            className="flex-1 border border-surface-border rounded-lg px-4 py-2.5 text-sm bg-surface-raised text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200"
          />
          <button
            type="submit"
            disabled={!customPrompt.trim() || customLoading}
            className="px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:shadow-card transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            {customLoading ? "..." : "Ask"}
          </button>
        </form>
        {customResult && (
          <div className="mt-3 pt-3 border-t border-surface-border">
            <RenderMarkdown content={customResult.content} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Synthesized hypothesis card
// ---------------------------------------------------------------------------

function SynthHypothesisCard({ h }: { h: SynthesizedHypothesis }) {
  const dirIcon = h.direction === "long" ? "↑" : h.direction === "short" ? "↓" : "→";
  const dirColor = h.direction === "long" ? "text-conviction-high" : h.direction === "short" ? "text-conviction-danger" : "text-conviction-medium";
  const confColor = h.confidence >= 65 ? "bg-conviction-high" : h.confidence >= 45 ? "bg-conviction-medium" : "bg-conviction-low";

  return (
    <div className="bg-surface-raised rounded-xl border border-surface-border shadow-soft p-4">
      <div className="flex items-start gap-3 mb-2">
        <span className={`text-lg font-bold ${dirColor} shrink-0`}>{dirIcon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-text-primary leading-tight">{h.title}</h4>
          <p className="text-xs text-text-muted mt-0.5">{h.thesis}</p>
        </div>
        <span className="text-xs font-semibold text-text-primary shrink-0">{h.confidence}%</span>
      </div>
      <ProgressBar value={h.confidence} color={confColor} size="sm" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs">
        <div>
          <span className="font-medium text-text-muted">Entry: </span>
          <span className="text-text-secondary">{h.entryLogic}</span>
        </div>
        <div>
          <span className="font-medium text-text-muted">Invalidation: </span>
          <span className="text-text-secondary">{h.invalidation}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-surface-border">
        <span className="text-xs text-text-muted">R/R: {h.riskReward}</span>
        <span className="text-xs text-text-muted">·</span>
        <span className="text-xs text-text-muted">Based on: {h.derivedFrom.join(", ")}</span>
      </div>
    </div>
  );
}
