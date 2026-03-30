"use client";

/**
 * BacktestPanel — historical backtest with AI advisor, run history,
 * compare, revert, and finalise-to-trade-plan flow.
 */

import { useState, useEffect } from "react";

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

interface AIAdvisorSuggestion {
  title: string; rationale: string; action: string; expectedImpact: string;
  confidence: "high" | "medium" | "low";
}

interface AIAdvice {
  analysis: string; suggestions: AIAdvisorSuggestion[];
  overallAssessment: string; source: "ai" | "rules";
}

interface BacktestResult {
  symbol: string; direction: string; dataPoints: number;
  dateRange: { from: string; to: string };
  summary: Summary; scenarios: Scenario[]; recommendation: string;
  aiAdvice?: AIAdvice;
}

interface HistoryEntry {
  id: number;
  params: { sl: number; tp: number; hold: number };
  summary: Summary;
  label: string;
}

export interface FinalisedPlan {
  symbol: string;
  direction: string;
  stopLoss: number;
  takeProfit: number;
  maxHold: number;
  winRate: number;
  scenarioCount: number;
  profitFactor: number;
  avgReturn: number;
  avgDaysHeld: number;
  bestReturn: number;
  worstReturn: number;
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
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" stroke={won ? "var(--green)" : "var(--red)"} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function WinLossBar({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses; if (total === 0) return null;
  const winPct = (wins / total) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-3 rounded-full overflow-hidden flex" style={{ background: "var(--surface-hover)" }}>
        <div className="h-full rounded-l-full" style={{ width: `${winPct}%`, background: "var(--green)" }} />
        <div className="h-full rounded-r-full" style={{ width: `${100 - winPct}%`, background: "var(--red)" }} />
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

  const [sl, setSl] = useState(2);
  const [tp, setTp] = useState(3);
  const [hold, setHold] = useState(10);

  // Run history for compare/revert
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [compareIdx, setCompareIdx] = useState<number | null>(null);

  async function runBacktest() {
    setLoading(true); setError(null); setShowAll(false); setFinalised(false);
    try {
      const res = await fetch("/api/backtest-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, direction, stopLossPercent: sl, takeProfitPercent: tp, maxHoldDays: hold, setupType, includeAIAdvice: true }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || e.error || "Failed"); }
      const data: BacktestResult = await res.json();
      setResult(data);

      // Add to history
      const entry: HistoryEntry = {
        id: Date.now(),
        params: { sl, tp, hold },
        summary: data.summary,
        label: `Stop ${sl}% · Target ${tp}% · ${hold}d`,
      };
      setHistory(prev => [entry, ...prev].slice(0, 10));
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    setLoading(false);
  }

  function revertTo(entry: HistoryEntry) {
    setSl(entry.params.sl); setTp(entry.params.tp); setHold(entry.params.hold);
    setTimeout(runBacktest, 50);
  }

  function handleFinalise() {
    if (!result) return;
    const plan: FinalisedPlan = {
      symbol, direction,
      stopLoss: sl, takeProfit: tp, maxHold: hold,
      winRate: result.summary.winRate, scenarioCount: result.summary.scenarioCount,
      profitFactor: result.summary.profitFactor, avgReturn: result.summary.avgReturn,
      avgDaysHeld: result.summary.avgDaysHeld, bestReturn: result.summary.bestReturn,
      worstReturn: result.summary.worstReturn,
    };
    setFinalised(true);
    onFinalise?.(plan);
  }

  useEffect(() => { if (!autoRan) { setAutoRan(true); runBacktest(); } }, []);// eslint-disable-line

  const s = result?.summary;
  const scenarios = result?.scenarios ?? [];
  const displayed = showAll ? scenarios : scenarios.slice(0, 5);
  const comparing = compareIdx !== null ? history[compareIdx] : null;

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between">
        <p className="section-label">Backtest — historical evidence</p>
        {result && <p className="micro">{result.dataPoints} days · {result.dateRange.from} → {result.dateRange.to}</p>}
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid var(--accent)", borderTopColor: "transparent" }} />
            <span className="caption">Testing against 365 days of data...</span>
          </div>
          {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg skeleton" />)}
        </div>
      )}

      {error && (
        <div className="py-3 px-4 rounded-lg" style={{ background: "var(--red-soft)" }}>
          <p className="caption" style={{ color: "var(--red)" }}>{error}</p>
          <button onClick={runBacktest} className="micro mt-1" style={{ color: "var(--accent)" }}>Retry</button>
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
              <div key={i} className="flex-1 text-center">
                <p className="stat-large" style={{ color: stat.color }}>{stat.val}</p>
                <p className="micro">{stat.label}</p>
              </div>
            ))}
          </div>

          <WinLossBar wins={s.wins} losses={s.losses} />

          {/* Compare with previous run */}
          {history.length > 1 && (
            <div>
              <p className="section-label mb-2">Run history — compare &amp; revert</p>
              <div className="space-y-1">
                {history.map((h, i) => {
                  const isCurrent = i === 0;
                  const isComparing = compareIdx === i;
                  const wrDelta = isCurrent ? null : h.summary.winRate - history[0].summary.winRate;
                  return (
                    <div key={h.id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg"
                      style={{ background: isCurrent ? "var(--accent-soft)" : isComparing ? "var(--surface-hover)" : "transparent" }}>
                      <span className="micro font-semibold" style={{ color: isCurrent ? "var(--accent)" : "var(--text-muted)", width: 20 }}>
                        {isCurrent ? "▸" : `#${history.length - i}`}
                      </span>
                      <span className="caption flex-1" style={{ color: "var(--text-secondary)" }}>{h.label}</span>
                      <span className="micro font-bold" style={{ color: h.summary.winRate >= 55 ? "var(--green)" : "var(--red)" }}>
                        {h.summary.winRate}%
                      </span>
                      {wrDelta !== null && (
                        <span className="micro" style={{ color: wrDelta > 0 ? "var(--green)" : wrDelta < 0 ? "var(--red)" : "var(--text-muted)" }}>
                          {wrDelta > 0 ? "+" : ""}{wrDelta.toFixed(1)}
                        </span>
                      )}
                      {!isCurrent && (
                        <button onClick={() => revertTo(h)} className="micro font-semibold" style={{ color: "var(--accent)" }}>
                          Revert
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scenarios */}
          {scenarios.length > 0 && (
            <div>
              <p className="section-label mb-2">Matched scenarios</p>
              <div className="space-y-1.5">
                {displayed.map((sc, i) => (
                  <div key={i} className="rounded-lg py-2 px-3" style={{ background: "var(--surface-hover)" }}>
                    <div className="flex items-center gap-3">
                      <MiniPath path={sc.pricePathPercent} won={sc.won} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="caption font-medium" style={{ color: "var(--text)" }}>{sc.entryDate} → {sc.exitDate}</span>
                          <span className="caption font-bold" style={{ color: sc.won ? "var(--green)" : "var(--red)" }}>
                            {sc.returnPercent >= 0 ? "+" : ""}{sc.returnPercent}%
                          </span>
                          <span className="micro" style={{ color: sc.exitReason === "target" ? "var(--green)" : sc.exitReason === "stop" ? "var(--red)" : "var(--text-muted)" }}>
                            {sc.exitReason === "target" ? "Target" : sc.exitReason === "stop" ? "Stop" : "Time"}
                          </span>
                        </div>
                        <p className="micro">{sc.similarity}% match · {sc.daysHeld}d</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {scenarios.length > 5 && (
                <button onClick={() => setShowAll(!showAll)} className="micro mt-2" style={{ color: "var(--accent)" }}>
                  {showAll ? "Show fewer" : `Show all ${scenarios.length}`}
                </button>
              )}
            </div>
          )}

          {/* AI Advisor */}
          {result.aiAdvice && (
            <div>
              <p className="section-label mb-2">
                AI analysis
                {result.aiAdvice.source === "ai" && <span className="ml-2 pill" style={{ background: "var(--accent-soft)", color: "var(--accent)", fontSize: 9, padding: "2px 6px" }}>Claude</span>}
              </p>
              <p className="body-text mb-3">{result.aiAdvice.analysis}</p>

              {result.aiAdvice.suggestions.length > 0 && (
                <div className="space-y-2 mb-3">
                  {result.aiAdvice.suggestions.map((sug, i) => (
                    <div key={i} className="rounded-lg py-3 px-3" style={{ background: "var(--surface-hover)" }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{sug.title}</span>
                        <span className="pill" style={{ border: `1px solid ${sug.confidence === "high" ? "var(--green)" : "var(--amber)"}`, color: sug.confidence === "high" ? "var(--green)" : "var(--amber)", background: "transparent", fontSize: 9, padding: "1px 6px" }}>
                          {sug.confidence}
                        </span>
                      </div>
                      <p className="caption mb-1">{sug.rationale}</p>
                      <p className="micro font-semibold" style={{ color: "var(--accent)" }}>{sug.action}</p>
                      <p className="micro" style={{ color: "var(--green)" }}>{sug.expectedImpact}</p>
                      <button
                        onClick={() => {
                          const stopM = sug.action.match(/stop.*?(\d+\.?\d*)%/i);
                          const targetM = sug.action.match(/target.*?(\d+\.?\d*)%/i);
                          const holdM = sug.action.match(/(\d+)\s*days/i);
                          if (stopM) setSl(parseFloat(stopM[1]));
                          if (targetM) setTp(parseFloat(targetM[1]));
                          if (holdM) setHold(parseInt(holdM[1]));
                          setTimeout(runBacktest, 100);
                        }}
                        className="micro font-semibold mt-2" style={{ color: "var(--accent)" }}
                      >
                        Apply &amp; re-test →
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="caption font-medium" style={{ color: s.winRate >= 55 ? "var(--green)" : "var(--amber)" }}>
                {result.aiAdvice.overallAssessment}
              </p>
            </div>
          )}

          {/* Adjust params */}
          <div>
            <p className="section-label mb-2">Adjust parameters</p>
            <div className="flex gap-3 mb-3">
              {[
                { label: "Stop %", val: sl, set: setSl, step: 0.5 },
                { label: "Target %", val: tp, set: setTp, step: 0.5 },
                { label: "Hold (days)", val: hold, set: setHold, step: 1 },
              ].map((p, i) => (
                <div key={i} className="flex-1">
                  <p className="micro mb-1">{p.label}</p>
                  <input type="number" step={p.step} min={p.step} value={p.val}
                    onChange={e => p.set(+e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg" style={{ background: "var(--surface-hover)", color: "var(--text)" }} />
                </div>
              ))}
            </div>
            <button onClick={runBacktest}
              className="w-full py-2.5 text-sm font-semibold" style={{ borderRadius: "var(--radius)", background: "var(--surface-hover)", color: "var(--text-secondary)" }}>
              Re-run backtest
            </button>
          </div>

          {/* Finalise */}
          {!finalised ? (
            <button onClick={handleFinalise}
              className="w-full py-3 text-sm font-semibold" style={{ borderRadius: "var(--radius)", background: "var(--accent)", color: "white" }}>
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
