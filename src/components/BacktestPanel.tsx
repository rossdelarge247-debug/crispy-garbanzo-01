"use client";

/**
 * BacktestPanel — multi-select AI suggestions, batch re-test, ranked results,
 * Grok second opinion, history/revert, finalise flow.
 */

import { useState, useEffect } from "react";
import { getGrokTradeOpinion } from "@/services/grok-client";
import type { FinalisedPlan } from "@/components/BacktestPanelTypes";

// Re-export for parent
export type { FinalisedPlan };

interface Scenario {
  entryDate: string; exitDate: string; entryPrice: number; exitPrice: number;
  exitReason: "target" | "stop" | "time"; returnPercent: number; daysHeld: number;
  won: boolean; similarity: number; matchReason: string; narrative: string;
  pricePathPercent: number[];
}

interface Summary {
  scenarioCount: number; wins: number; losses: number; winRate: number;
  avgReturn: number; avgDaysHeld: number; bestReturn: number; worstReturn: number;
  profitFactor: number;
}

interface AISuggestion {
  title: string; rationale: string; action: string; expectedImpact: string;
  confidence: "high" | "medium" | "low";
  selected?: boolean;
}

interface AIAdvice {
  analysis: string; suggestions: AISuggestion[];
  overallAssessment: string; source: "ai" | "rules";
}

interface BacktestResult {
  symbol: string; direction: string; dataPoints: number;
  dateRange: { from: string; to: string };
  summary: Summary; scenarios: Scenario[]; recommendation: string;
  aiAdvice?: AIAdvice;
}

interface GrokOpinion {
  opinion: string; agrees: boolean; caveat: string;
}

interface HistoryEntry {
  id: number; params: { sl: number; tp: number; hold: number };
  summary: Summary; label: string; appliedSuggestions?: string[];
}

interface Props {
  symbol: string;
  direction: "long" | "short";
  setupType?: string;
  onFinalise?: (plan: FinalisedPlan) => void;
}

function fp(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

function MiniPath({ path, won }: { path: number[]; won: boolean }) {
  if (path.length < 2) return null;
  const w = 64; const h = 20;
  const min = Math.min(...path); const max = Math.max(...path); const range = max - min || 1;
  const pts = path.map((v, i) => `${(i / (path.length - 1)) * w},${h - 1 - ((v - min) / range) * (h - 2)}`).join(" ");
  return <svg width={w} height={h} className="shrink-0"><polyline points={pts} fill="none" stroke={won ? "var(--green)" : "var(--red)"} strokeWidth={1.5} strokeLinecap="round" /></svg>;
}

function WinLossBar({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses; if (!total) return null;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-3 rounded-full overflow-hidden flex" style={{ background: "var(--surface-hover)" }}>
        <div className="h-full rounded-l-full" style={{ width: `${(wins/total)*100}%`, background: "var(--green)" }} />
        <div className="h-full rounded-r-full" style={{ width: `${(losses/total)*100}%`, background: "var(--red)" }} />
      </div>
      <span className="micro" style={{ color: "var(--green)" }}>{wins}W</span>
      <span className="micro" style={{ color: "var(--red)" }}>{losses}L</span>
    </div>
  );
}

export default function BacktestPanel({ symbol, direction, setupType, onFinalise }: Props) {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [autoRan, setAutoRan] = useState(false);
  const [finalised, setFinalised] = useState(false);
  const [grok, setGrok] = useState<GrokOpinion | null>(null);
  const [grokLoading, setGrokLoading] = useState(false);

  const [sl, setSl] = useState(2);
  const [tp, setTp] = useState(3);
  const [hold, setHold] = useState(10);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResults, setBatchResults] = useState<{ label: string; params: { sl: number; tp: number; hold: number }; summary: Summary }[]>([]);

  async function runBacktest(overrideSl?: number, overrideTp?: number, overrideHold?: number) {
    const useSl = overrideSl ?? sl;
    const useTp = overrideTp ?? tp;
    const useHold = overrideHold ?? hold;

    setLoading(true); setError(null); setShowAll(false); setFinalised(false); setGrok(null); setBatchResults([]);
    try {
      const res = await fetch("/api/backtest-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, direction, stopLossPercent: useSl, takeProfitPercent: useTp, maxHoldDays: useHold, setupType, includeAIAdvice: true }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || e.error || "Failed"); }
      const data: BacktestResult = await res.json();
      setResult(data);
      setSelectedSuggestions(new Set());

      setHistory(prev => [{ id: Date.now(), params: { sl: useSl, tp: useTp, hold: useHold }, summary: data.summary, label: `Stop ${useSl}% · Target ${useTp}% · ${useHold}d` }, ...prev].slice(0, 10));
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    setLoading(false);
  }

  // Batch run selected suggestions
  async function runSelectedSuggestions() {
    if (!result?.aiAdvice?.suggestions) return;
    const selected = result.aiAdvice.suggestions.filter((_, i) => selectedSuggestions.has(i));
    if (selected.length === 0) return;

    setBatchRunning(true);
    const results: typeof batchResults = [];

    for (const sug of selected) {
      let testSl = sl; let testTp = tp; let testHold = hold;
      const stopM = sug.action.match(/stop.*?(\d+\.?\d*)%/i);
      const targetM = sug.action.match(/target.*?(\d+\.?\d*)%/i);
      const holdM = sug.action.match(/(\d+)\s*days/i);
      if (stopM) testSl = parseFloat(stopM[1]);
      if (targetM) testTp = parseFloat(targetM[1]);
      if (holdM) testHold = parseInt(holdM[1]);

      try {
        const res = await fetch("/api/backtest-setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol, direction, stopLossPercent: testSl, takeProfitPercent: testTp, maxHoldDays: testHold, setupType, includeAIAdvice: false }),
        });
        if (res.ok) {
          const data = await res.json();
          results.push({ label: sug.title, params: { sl: testSl, tp: testTp, hold: testHold }, summary: data.summary });
        }
      } catch {}
    }

    // Sort by win rate descending
    results.sort((a, b) => b.summary.winRate - a.summary.winRate);
    setBatchResults(results);
    setBatchRunning(false);
  }

  // Fetch Grok second opinion
  async function fetchGrokOpinion() {
    if (!result) return;
    setGrokLoading(true);
    try {
      // Client-side Grok via Puter.js — no API key needed
      const opinion = await getGrokTradeOpinion(
        symbol, direction,
        result.scenarios[0]?.narrative ?? result.recommendation ?? "",
        result.summary.winRate,
        result.summary.profitFactor
      );
      if (opinion) setGrok(opinion);
    } catch {}
    setGrokLoading(false);
  }

  function applyBatchResult(r: typeof batchResults[0]) {
    setSl(r.params.sl); setTp(r.params.tp); setHold(r.params.hold);
    setTimeout(() => runBacktest(r.params.sl, r.params.tp, r.params.hold), 50);
  }

  function revertTo(entry: HistoryEntry) {
    setSl(entry.params.sl); setTp(entry.params.tp); setHold(entry.params.hold);
    setTimeout(() => runBacktest(entry.params.sl, entry.params.tp, entry.params.hold), 50);
  }

  function handleFinalise() {
    if (!result) return;
    setFinalised(true);
    onFinalise?.({
      symbol, direction, stopLoss: sl, takeProfit: tp, maxHold: hold,
      winRate: result.summary.winRate, scenarioCount: result.summary.scenarioCount,
      profitFactor: result.summary.profitFactor, avgReturn: result.summary.avgReturn,
      avgDaysHeld: result.summary.avgDaysHeld, bestReturn: result.summary.bestReturn,
      worstReturn: result.summary.worstReturn,
    });
  }

  useEffect(() => { if (!autoRan) { setAutoRan(true); runBacktest(); } }, []);// eslint-disable-line

  const s = result?.summary;
  const scenarios = result?.scenarios ?? [];
  const displayed = showAll ? scenarios : scenarios.slice(0, 5);

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between">
        <p className="section-label">Backtest — historical evidence</p>
        {result && <p className="micro">{result.dataPoints} days · {result.dateRange.from} → {result.dateRange.to}</p>}
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid var(--accent)", borderTopColor: "transparent" }} /><span className="caption">Testing against 365 days...</span></div>
          {[1,2,3].map(i => <div key={i} className="h-12 rounded-lg skeleton" />)}
        </div>
      )}

      {error && (
        <div className="py-3 px-4 rounded-lg" style={{ background: "var(--red-soft)" }}>
          <p className="caption" style={{ color: "var(--red)" }}>{error}</p>
          <button onClick={() => runBacktest()} className="micro mt-1" style={{ color: "var(--accent)" }}>Retry</button>
        </div>
      )}

      {s && (
        <>
          {/* Hero stats */}
          <div className="flex gap-3">
            {[
              { val: `${s.winRate}%`, label: "Win rate", color: s.winRate >= 55 ? "var(--green)" : s.winRate >= 45 ? "var(--amber)" : "var(--red)" },
              { val: `${s.scenarioCount}`, label: "Scenarios", color: "var(--text)" },
              { val: `${s.profitFactor}:1`, label: "Profit factor", color: "var(--text)" },
              { val: `${s.avgReturn > 0 ? "+" : ""}${s.avgReturn}%`, label: "Avg return", color: s.avgReturn >= 0 ? "var(--green)" : "var(--red)" },
            ].map((stat, i) => (
              <div key={i} className="flex-1 text-center"><p className="stat-large" style={{ color: stat.color }}>{stat.val}</p><p className="micro">{stat.label}</p></div>
            ))}
          </div>

          <WinLossBar wins={s.wins} losses={s.losses} />

          {/* History */}
          {history.length > 1 && (
            <div>
              <p className="section-label mb-2">Run history</p>
              {history.slice(0, 5).map((h, i) => {
                const isCurrent = i === 0;
                const wrDelta = isCurrent ? null : h.summary.winRate - history[0].summary.winRate;
                return (
                  <div key={h.id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg" style={{ background: isCurrent ? "var(--accent-soft)" : "transparent" }}>
                    <span className="micro font-semibold" style={{ color: isCurrent ? "var(--accent)" : "var(--text-muted)", width: 20 }}>{isCurrent ? "▸" : `#${history.length-i}`}</span>
                    <span className="caption flex-1" style={{ color: "var(--text-secondary)" }}>{h.label}</span>
                    <span className="micro font-bold" style={{ color: h.summary.winRate >= 55 ? "var(--green)" : "var(--red)" }}>{h.summary.winRate}%</span>
                    {wrDelta !== null && <span className="micro" style={{ color: wrDelta > 0 ? "var(--green)" : wrDelta < 0 ? "var(--red)" : "var(--text-muted)" }}>{wrDelta > 0 ? "+" : ""}{wrDelta.toFixed(1)}</span>}
                    {!isCurrent && <button onClick={() => revertTo(h)} className="micro font-semibold" style={{ color: "var(--accent)" }}>Revert</button>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Scenarios */}
          {scenarios.length > 0 && (
            <div>
              <p className="section-label mb-2">Matched scenarios</p>
              <div className="space-y-1.5">
                {displayed.map((sc, i) => (
                  <div key={i} className="rounded-lg py-2 px-3 flex items-center gap-3" style={{ background: "var(--surface-hover)" }}>
                    <MiniPath path={sc.pricePathPercent} won={sc.won} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="caption font-medium" style={{ color: "var(--text)" }}>{sc.entryDate} → {sc.exitDate}</span>
                        <span className="caption font-bold" style={{ color: sc.won ? "var(--green)" : "var(--red)" }}>{sc.returnPercent >= 0 ? "+" : ""}{sc.returnPercent}%</span>
                        <span className="micro" style={{ color: sc.exitReason === "target" ? "var(--green)" : sc.exitReason === "stop" ? "var(--red)" : "var(--text-muted)" }}>{sc.exitReason === "target" ? "Target" : sc.exitReason === "stop" ? "Stop" : "Time"}</span>
                      </div>
                      <p className="micro">{sc.similarity}% match · {sc.daysHeld}d</p>
                    </div>
                  </div>
                ))}
              </div>
              {scenarios.length > 5 && <button onClick={() => setShowAll(!showAll)} className="micro mt-2" style={{ color: "var(--accent)" }}>{showAll ? "Show fewer" : `Show all ${scenarios.length}`}</button>}
            </div>
          )}

          {/* AI suggestions — multi-select */}
          {result.aiAdvice && result.aiAdvice.suggestions.length > 0 && (
            <div>
              <p className="section-label mb-1">AI suggestions — select to test</p>
              <p className="micro mb-2" style={{ color: "var(--text-muted)" }}>Select one or more, then run them all. Results ranked by improvement.</p>
              <div className="space-y-2">
                {result.aiAdvice.suggestions.map((sug, i) => (
                  <label key={i} className="flex items-start gap-3 rounded-lg py-3 px-3 cursor-pointer" style={{ background: selectedSuggestions.has(i) ? "var(--accent-soft)" : "var(--surface-hover)" }}>
                    <input type="checkbox" checked={selectedSuggestions.has(i)} onChange={() => {
                      setSelectedSuggestions(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
                    }} className="mt-0.5 rounded" style={{ accentColor: "var(--accent)" }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{sug.title}</span>
                        <span className="pill" style={{ border: `1px solid ${sug.confidence === "high" ? "var(--green)" : "var(--amber)"}`, color: sug.confidence === "high" ? "var(--green)" : "var(--amber)", background: "transparent", fontSize: 9, padding: "1px 6px" }}>{sug.confidence}</span>
                      </div>
                      <p className="caption">{sug.rationale}</p>
                      <p className="micro font-semibold mt-0.5" style={{ color: "var(--accent)" }}>{sug.action}</p>
                    </div>
                  </label>
                ))}
              </div>
              {selectedSuggestions.size > 0 && (
                <button onClick={runSelectedSuggestions} disabled={batchRunning}
                  className="w-full py-2.5 text-sm font-semibold mt-3" style={{ borderRadius: "var(--radius)", background: "var(--accent)", color: "white", opacity: batchRunning ? 0.6 : 1 }}>
                  {batchRunning ? `Testing ${selectedSuggestions.size} variations...` : `Test ${selectedSuggestions.size} selected suggestion${selectedSuggestions.size > 1 ? "s" : ""}`}
                </button>
              )}
            </div>
          )}

          {/* Batch results — ranked */}
          {batchResults.length > 0 && (
            <div>
              <p className="section-label mb-2">Results — ranked by win rate</p>
              <div className="space-y-1.5">
                {batchResults.map((r, i) => {
                  const delta = r.summary.winRate - (s?.winRate ?? 0);
                  const improved = delta > 0;
                  return (
                    <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: improved ? "var(--green-soft)" : "var(--red-soft)" }}>
                      <span className="micro font-bold" style={{ width: 20, color: improved ? "var(--green)" : "var(--red)" }}>#{i+1}</span>
                      <div className="flex-1">
                        <span className="caption font-medium" style={{ color: "var(--text)" }}>{r.label}</span>
                        <span className="micro ml-2">Stop {r.params.sl}% · Target {r.params.tp}% · {r.params.hold}d</span>
                      </div>
                      <span className="stat-medium" style={{ color: improved ? "var(--green)" : "var(--red)" }}>{r.summary.winRate}%</span>
                      <span className="micro font-bold" style={{ color: improved ? "var(--green)" : "var(--red)" }}>{delta > 0 ? "+" : ""}{delta.toFixed(1)}</span>
                      <button onClick={() => applyBatchResult(r)} className="micro font-semibold" style={{ color: "var(--accent)" }}>Apply</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grok second opinion */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="section-label">Second opinion</p>
              <span className="pill" style={{ background: "var(--surface-hover)", color: "var(--text-muted)", fontSize: 9, padding: "1px 6px" }}>Grok</span>
            </div>
            {grok ? (
              <div className="rounded-lg py-3 px-3" style={{ background: "var(--surface-hover)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="pill" style={{ background: grok.agrees ? "var(--green-soft)" : "var(--red-soft)", color: grok.agrees ? "var(--green)" : "var(--red)", fontSize: 10 }}>
                    {grok.agrees ? "Agrees" : "Disagrees"}
                  </span>
                </div>
                <p className="body-text mb-1">{grok.opinion}</p>
                <p className="caption" style={{ color: "var(--amber)" }}>{grok.caveat}</p>
              </div>
            ) : (
              <button onClick={fetchGrokOpinion} disabled={grokLoading}
                className="py-2 px-4 text-sm font-medium rounded-lg" style={{ background: "var(--surface-hover)", color: "var(--text-secondary)" }}>
                {grokLoading ? "Asking Grok..." : "Get Grok's take"}
              </button>
            )}
          </div>

          {/* Adjust + re-run */}
          <div>
            <p className="section-label mb-2">Adjust parameters</p>
            <div className="flex gap-3 mb-3">
              {[{ label: "Stop %", val: sl, set: setSl, step: 0.5 }, { label: "Target %", val: tp, set: setTp, step: 0.5 }, { label: "Hold (days)", val: hold, set: setHold, step: 1 }].map((p, i) => (
                <div key={i} className="flex-1"><p className="micro mb-1">{p.label}</p><input type="number" step={p.step} min={p.step} value={p.val} onChange={e => p.set(+e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg" style={{ background: "var(--surface-hover)", color: "var(--text)" }} /></div>
              ))}
            </div>
            <button onClick={() => runBacktest()} className="w-full py-2.5 text-sm font-semibold" style={{ borderRadius: "var(--radius)", background: "var(--surface-hover)", color: "var(--text-secondary)" }}>Re-run backtest</button>
          </div>

          {/* Finalise */}
          {!finalised ? (
            <button onClick={handleFinalise} className="w-full py-3 text-sm font-semibold" style={{ borderRadius: "var(--radius)", background: "var(--accent)", color: "white" }}>
              Finalise trade plan with these parameters
            </button>
          ) : (
            <div className="text-center py-3 rounded-lg" style={{ background: "var(--green-soft)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--green)" }}>Trade plan finalised</p>
              <p className="micro">Stop {sl}% · Target {tp}% · Hold {hold}d · {s.winRate}% win rate</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
