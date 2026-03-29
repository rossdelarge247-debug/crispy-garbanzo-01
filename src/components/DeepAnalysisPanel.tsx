"use client";

import { useState, useEffect } from "react";
import { ANALYSIS_FRAMEWORKS } from "@/services/ai-analysis";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";
import ExpandableSection from "./ExpandableSection";

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
  // Get the first meaningful line as a summary
  const lines = content.split("\n").filter(l => l.trim() && !l.startsWith("##") && !l.startsWith("---") && !l.startsWith("*"));
  const first = lines[0] || "";
  // Strip markdown bold
  return first.replace(/\*\*/g, "").replace(/^- /, "").replace(/^→ /, "").slice(0, 150);
}

function getFrameworkIcon(type: string): string {
  const fw = ANALYSIS_FRAMEWORKS.find(f => f.type === type);
  return fw?.icon || "📊";
}

function RenderMarkdown({ content }: { content: string }) {
  return (
    <div className="space-y-1">
      {content.split("\n").map((line, i) => {
        if (line.startsWith("## ")) {
          return <h2 key={i} className="text-sm font-bold text-text-primary mt-4 mb-2 pb-1 border-b border-surface-border first:mt-0">{line.replace("## ", "")}</h2>;
        }
        if (line.startsWith("### ")) {
          return <h3 key={i} className="text-sm font-bold text-text-primary mt-3 mb-1">{line.replace("### ", "")}</h3>;
        }
        if (line.startsWith("- **")) {
          const m = line.match(/^- \*\*(.+?)\*\*(.*)$/);
          if (m) return <p key={i} className="text-sm text-text-secondary pl-3">→ <span className="font-bold text-text-primary">{m[1]}</span>{m[2]}</p>;
        }
        if (line.startsWith("- ")) {
          return <p key={i} className="text-sm text-text-secondary pl-3">→ {line.replace("- ", "")}</p>;
        }
        if (line.startsWith("---")) return <hr key={i} className="border-t border-surface-border my-3" />;
        if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) {
          return <p key={i} className="text-xs text-text-muted italic mt-2">{line.replace(/^\*|\*$/g, "")}</p>;
        }
        if (line.trim() === "") return <div key={i} className="h-1" />;
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={i} className="text-sm text-text-secondary leading-relaxed">
            {parts.map((part, j) => part.startsWith("**") && part.endsWith("**")
              ? <span key={j} className="font-bold text-text-primary">{part.replace(/\*\*/g, "")}</span>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customLoading, setCustomLoading] = useState(false);
  const [customResult, setCustomResult] = useState<AnalysisResult | null>(null);

  // Auto-run all analyses on mount
  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/analyze-all?flagId=${flagId}`);
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const data = await res.json();
        const map: Record<string, AnalysisResult> = {};
        for (const r of data.results) {
          map[r.type] = r;
        }
        setResults(map);
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
    } catch {
      // silently fail
    }
    setCustomLoading(false);
  }

  if (loading) {
    return <LoadingState title="Running all analyses..." subtitle="Evaluating narrative, opportunities, risk, scenarios, frameworks, and correlations" />;
  }

  if (error) {
    return <ErrorState title="Analysis couldn't load" description={error} onRetry={() => window.location.reload()} />;
  }

  const frameworkResults = ANALYSIS_FRAMEWORKS.map(fw => ({
    framework: fw,
    result: results[fw.type],
  })).filter(r => r.result);

  return (
    <div className="space-y-3">
      {/* Analysis cards — scorecard style */}
      {frameworkResults.map(({ framework, result }) => {
        const isExpanded = expandedCard === framework.type;
        const topLine = extractTopLine(result.content);

        return (
          <div key={framework.type} className="bg-surface-raised rounded-2xl shadow-soft overflow-hidden">
            <button
              onClick={() => setExpandedCard(isExpanded ? null : framework.type)}
              className="w-full text-left p-4 hover:bg-surface-hover transition-colors duration-300"
            >
              <div className="flex items-start gap-3">
                <span className="text-lg shrink-0 mt-0.5">{framework.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-text-primary">{framework.title}</span>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      result.source === "ai" ? "bg-accent/15 text-accent-dark" : "bg-surface-overlay text-text-muted"
                    }`}>
                      {result.source === "ai" ? "AI" : "Auto"}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-2">{topLine}</p>
                </div>
                <span className="text-text-muted shrink-0 text-sm transition-transform duration-300" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 pt-0 border-t border-surface-border">
                <div className="pt-3">
                  <RenderMarkdown content={result.content} />
                </div>
                <p className="text-xs text-text-muted mt-3">
                  Generated {new Date(result.generatedAt).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Custom question */}
      <div className="bg-surface-raised rounded-2xl shadow-soft p-4">
        <form onSubmit={handleCustomSubmit} className="flex gap-2">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Ask a specific question about this situation..."
            className="flex-1 border border-surface-border rounded-full px-4 py-2.5 text-sm bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-300"
          />
          <button
            type="submit"
            disabled={!customPrompt.trim() || customLoading}
            className="px-5 py-2.5 bg-accent text-accent-dark text-sm font-bold rounded-full hover:shadow-lift transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
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
