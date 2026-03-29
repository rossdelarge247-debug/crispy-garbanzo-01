"use client";

import { useState } from "react";
import { ANALYSIS_FRAMEWORKS } from "@/services/ai-analysis";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";

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

export default function DeepAnalysisPanel({ flagId }: DeepAnalysisPanelProps) {
  const [activeAnalysis, setActiveAnalysis] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, AnalysisResult>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");

  async function runAnalysis(type: string, prompt?: string) {
    setLoading(type);
    setError(null);
    setActiveAnalysis(type);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flagId,
          analysisType: type,
          customPrompt: prompt,
        }),
      });

      if (!res.ok) {
        throw new Error(`Analysis failed (${res.status})`);
      }

      const result: AnalysisResult = await res.json();
      setResults(prev => ({ ...prev, [type]: result }));
    } catch (err) {
      setError(String(err));
    }
    setLoading(null);
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (customPrompt.trim()) {
      runAnalysis("custom", customPrompt.trim());
    }
  }

  return (
    <div>
      {/* Framework selector grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {ANALYSIS_FRAMEWORKS.map((framework) => {
          const isActive = activeAnalysis === framework.type;
          const hasResult = results[framework.type];
          const isLoading = loading === framework.type;

          return (
            <button
              key={framework.type}
              onClick={() => hasResult ? setActiveAnalysis(framework.type) : runAnalysis(framework.type)}
              disabled={isLoading}
              className={`p-4 text-left rounded-2xl shadow-soft transition-all duration-300 hover:shadow-card ${
                isActive ? "bg-accent text-accent-dark" :
                hasResult ? "bg-surface-raised hover:bg-surface-overlay" :
                "bg-surface-raised hover:bg-surface-overlay"
              } ${isLoading ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{framework.icon}</span>
                <span className={`text-xs font-bold ${
                  isActive ? "text-accent-dark" : "text-text-primary"
                }`}>
                  {framework.title}
                </span>
              </div>
              <p className={`text-xs leading-relaxed ${
                isActive ? "text-accent-dark/60" : "text-text-muted"
              }`}>
                {framework.description}
              </p>
              {hasResult && !isActive && (
                <span className="inline-block mt-2 text-xs font-bold text-conviction-high">Done</span>
              )}
              {isLoading && (
                <span className="inline-block mt-2 text-xs font-bold text-text-muted animate-pulse">Running...</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom analysis input */}
      <form onSubmit={handleCustomSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Ask a specific question about this market situation..."
          className="flex-1 border border-surface-border rounded-full px-5 py-2.5 text-sm bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-300"
        />
        <button
          type="submit"
          disabled={!customPrompt.trim() || loading === "custom"}
          className="px-5 py-2.5 bg-accent text-accent-dark text-sm font-bold rounded-full hover:shadow-lift hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        >
          {loading === "custom" ? "..." : "Ask"}
        </button>
      </form>

      {/* Analysis result display */}
      {loading && !results[loading] && (
        <LoadingState
          title="Running analysis..."
          subtitle="Analyzing market data, news sentiment, and social signals"
        />
      )}

      {error && (
        <ErrorState
          title="Analysis failed"
          description={error}
          onRetry={() => activeAnalysis && runAnalysis(activeAnalysis)}
        />
      )}

      {activeAnalysis && results[activeAnalysis] && (
        <div className="bg-surface-raised rounded-2xl shadow-soft overflow-hidden">
          {/* Result header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-text-primary">
                {results[activeAnalysis].title}
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                results[activeAnalysis].source === "ai"
                  ? "bg-accent/15 text-accent-dark"
                  : "bg-surface-overlay text-text-muted"
              }`}>
                {results[activeAnalysis].source === "ai" ? "AI" : "Rules"}
              </span>
            </div>
            <button
              onClick={() => runAnalysis(activeAnalysis)}
              disabled={loading === activeAnalysis}
              className="text-xs font-bold text-text-muted hover:text-text-primary transition-colors duration-300 disabled:opacity-30"
            >
              {loading === activeAnalysis ? "Running..." : "Regenerate"}
            </button>
          </div>

          {/* Result content — rendered as markdown-like */}
          <div className="p-5">
            <div className="prose-analysis">
              {results[activeAnalysis].content.split("\n").map((line, i) => {
                if (line.startsWith("## ")) {
                  return (
                    <h2 key={i} className="text-base font-bold text-text-primary mt-6 mb-3 pb-2 border-b border-surface-border first:mt-0">
                      {line.replace("## ", "")}
                    </h2>
                  );
                }
                if (line.startsWith("### ")) {
                  return (
                    <h3 key={i} className="text-sm font-bold text-text-primary mt-4 mb-2">
                      {line.replace("### ", "")}
                    </h3>
                  );
                }
                if (line.startsWith("- **")) {
                  const boldMatch = line.match(/^- \*\*(.+?)\*\*(.*)$/);
                  if (boldMatch) {
                    return (
                      <p key={i} className="text-sm text-text-secondary mb-1 pl-4">
                        → <span className="font-bold text-text-primary">{boldMatch[1]}</span>{boldMatch[2]}
                      </p>
                    );
                  }
                }
                if (line.startsWith("- ")) {
                  return (
                    <p key={i} className="text-sm text-text-secondary mb-1 pl-4">
                      → {line.replace("- ", "")}
                    </p>
                  );
                }
                if (line.startsWith("**") && line.endsWith("**")) {
                  return (
                    <p key={i} className="text-sm font-bold text-text-primary mt-3 mb-1">
                      {line.replace(/\*\*/g, "")}
                    </p>
                  );
                }
                if (line.startsWith("---")) {
                  return <hr key={i} className="border-t border-surface-border my-4" />;
                }
                if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) {
                  return (
                    <p key={i} className="text-xs text-text-muted italic mt-3">
                      {line.replace(/^\*|\*$/g, "")}
                    </p>
                  );
                }
                if (line.trim() === "") {
                  return <div key={i} className="h-2" />;
                }
                // Handle inline bold
                const parts = line.split(/(\*\*.*?\*\*)/g);
                return (
                  <p key={i} className="text-sm text-text-secondary leading-relaxed mb-1">
                    {parts.map((part, j) => {
                      if (part.startsWith("**") && part.endsWith("**")) {
                        return <span key={j} className="font-bold text-text-primary">{part.replace(/\*\*/g, "")}</span>;
                      }
                      return part;
                    })}
                  </p>
                );
              })}
            </div>
          </div>

          {/* Timestamp */}
          <div className="px-5 py-2 border-t border-surface-border text-xs text-text-muted">
            Generated {new Date(results[activeAnalysis].generatedAt).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}
