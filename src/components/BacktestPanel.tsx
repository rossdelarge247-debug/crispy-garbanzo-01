"use client";

import { useState, useEffect } from "react";
import { getGrokTradeOpinion } from "@/services/grok-client";
import { getLeverage, calculateTradeSize } from "@/lib/leverage";
import type { FinalisedPlan } from "@/components/BacktestPanelTypes";
export type { FinalisedPlan };

interface Scenario { entryDate: string; exitDate: string; entryPrice: number; exitPrice: number; exitReason: "target"|"stop"|"time"; returnPercent: number; daysHeld: number; won: boolean; similarity: number; matchReason: string; narrative: string; pricePathPercent: number[]; }
interface Summary { scenarioCount: number; wins: number; losses: number; winRate: number; avgReturn: number; avgDaysHeld: number; bestReturn: number; worstReturn: number; profitFactor: number; }
interface AISuggestion { title: string; rationale: string; action: string; expectedImpact: string; confidence: "high"|"medium"|"low"; }
interface AIAdvice { analysis: string; suggestions: AISuggestion[]; overallAssessment: string; source: "ai"|"rules"; }
interface BacktestResult { symbol: string; direction: string; dataPoints: number; dateRange: { from: string; to: string }; summary: Summary; scenarios: Scenario[]; recommendation: string; aiAdvice?: AIAdvice; }
interface GrokOpinion { opinion: string; agrees: boolean; caveat: string; }
interface RunResult { id: number; params: { sl: number; tp: number; hold: number }; summary: Summary; label: string; delta: number; }

interface Props { symbol: string; direction: "long"|"short"; setupType?: string; onFinalise?: (plan: FinalisedPlan) => void; }

function fp(p: number): string { return p >= 1000 ? p.toLocaleString("en-US", { maximumFractionDigits: 0 }) : p >= 1 ? p.toFixed(2) : p.toFixed(4); }

function MiniPath({ path, won }: { path: number[]; won: boolean }) {
  if (path.length < 2) return null;
  const w = 64; const h = 20; const min = Math.min(...path); const max = Math.max(...path); const range = max - min || 1;
  return <svg width={w} height={h} className="shrink-0"><polyline points={path.map((v,i) => `${(i/(path.length-1))*w},${h-1-((v-min)/range)*(h-2)}`).join(" ")} fill="none" stroke={won ? "var(--green)" : "var(--red)"} strokeWidth={1.5} strokeLinecap="round" /></svg>;
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
  const [iteration, setIteration] = useState(0);
  const [rankedResults, setRankedResults] = useState<RunResult[]>([]);
  const [optimising, setOptimising] = useState(false);

  const lev = getLeverage(symbol);

  async function runBacktest(overSl?: number, overTp?: number, overHold?: number): Promise<BacktestResult | null> {
    const useSl = overSl ?? sl; const useTp = overTp ?? tp; const useHold = overHold ?? hold;
    setLoading(true); setError(null); setShowAll(false); setFinalised(false); setGrok(null); setRankedResults([]);
    try {
      const res = await fetch("/api/backtest-setup", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, direction, stopLossPercent: useSl, takeProfitPercent: useTp, maxHoldDays: useHold, setupType, includeAIAdvice: true }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Failed");
      const data: BacktestResult = await res.json();
      setResult(data);
      setLoading(false);
      return data;
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); setLoading(false); return null; }
  }

  // Run all AI recommendations automatically, rank results
  async function runRecommendedTests() {
    if (!result?.aiAdvice?.suggestions?.length) return;
    setOptimising(true);
    const baseWR = result.summary.winRate;
    const results: RunResult[] = [{ id: 0, params: { sl, tp, hold }, summary: result.summary, label: "Current", delta: 0 }];

    for (const sug of result.aiAdvice.suggestions) {
      let testSl = sl; let testTp = tp; let testHold = hold;
      const stopM = sug.action.match(/(\d+\.?\d*)%.*stop/i) || sug.action.match(/stop.*?(\d+\.?\d*)%/i);
      const targetM = sug.action.match(/(\d+\.?\d*)%.*target/i) || sug.action.match(/target.*?(\d+\.?\d*)%/i);
      const holdM = sug.action.match(/(\d+)\s*days/i);
      if (stopM) testSl = parseFloat(stopM[1]);
      if (targetM) testTp = parseFloat(targetM[1]);
      if (holdM) testHold = parseInt(holdM[1]);

      try {
        const res = await fetch("/api/backtest-setup", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol, direction, stopLossPercent: testSl, takeProfitPercent: testTp, maxHoldDays: testHold, setupType, includeAIAdvice: false }) });
        if (res.ok) {
          const data = await res.json();
          results.push({ id: Date.now() + Math.random(), params: { sl: testSl, tp: testTp, hold: testHold }, summary: data.summary, label: sug.title, delta: +(data.summary.winRate - baseWR).toFixed(1) });
        }
      } catch {}
    }

    results.sort((a, b) => b.summary.winRate - a.summary.winRate);
    setRankedResults(results);
    setOptimising(false);
    setIteration(prev => prev + 1);
  }

  // Apply the best result and re-run with AI advice for further iteration
  async function applyBest() {
    const best = rankedResults[0];
    if (!best) return;
    setSl(best.params.sl); setTp(best.params.tp); setHold(best.params.hold);
    setRankedResults([]);
    await runBacktest(best.params.sl, best.params.tp, best.params.hold);
  }

  function handleFinalise() {
    const best = rankedResults.length > 0 ? rankedResults[0] : null;
    const finalSl = best?.params.sl ?? sl;
    const finalTp = best?.params.tp ?? tp;
    const finalHold = best?.params.hold ?? hold;
    const s = best?.summary ?? result?.summary;
    if (!s) return;
    setFinalised(true);
    onFinalise?.({ symbol, direction, stopLoss: finalSl, takeProfit: finalTp, maxHold: finalHold, winRate: s.winRate, scenarioCount: s.scenarioCount, profitFactor: s.profitFactor, avgReturn: s.avgReturn, avgDaysHeld: s.avgDaysHeld, bestReturn: s.bestReturn, worstReturn: s.worstReturn });
  }

  async function fetchGrok() {
    if (!result) return;
    setGrokLoading(true);
    try { const o = await getGrokTradeOpinion(symbol, direction, result.scenarios[0]?.narrative ?? "", result.summary.winRate, result.summary.profitFactor); if (o) setGrok(o); } catch {}
    setGrokLoading(false);
  }

  useEffect(() => { if (!autoRan) { setAutoRan(true); runBacktest(); } }, []);// eslint-disable-line

  const s = result?.summary;
  const scenarios = result?.scenarios ?? [];
  const displayed = showAll ? scenarios : scenarios.slice(0, 4);
  const tradeSize = s ? calculateTradeSize(symbol, 1000, scenarios[0]?.entryPrice ?? 0, sl) : null;

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between">
        <p className="section-label">Backtest</p>
        {result && <p className="micro">{result.dataPoints} days · {lev.label} leverage</p>}
      </div>

      {loading && <div className="space-y-3"><div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid var(--accent)", borderTopColor: "transparent" }} /><span className="caption">Testing 365 days...</span></div>{[1,2,3].map(i => <div key={i} className="h-12 rounded-lg skeleton" />)}</div>}
      {error && <div className="py-3 px-4 rounded-lg" style={{ background: "var(--red-soft)" }}><p className="caption" style={{ color: "var(--red)" }}>{error}</p><button onClick={() => runBacktest()} className="micro mt-1" style={{ color: "var(--accent)" }}>Retry</button></div>}

      {s && (
        <>
          {/* Stats */}
          <div className="flex gap-3">
            {[{ val: `${s.winRate}%`, label: "Win rate", color: s.winRate >= 55 ? "var(--green)" : s.winRate >= 45 ? "var(--amber)" : "var(--red)" },
              { val: `${s.scenarioCount}`, label: "Scenarios", color: "var(--text)" },
              { val: `${s.profitFactor}:1`, label: "PF", color: "var(--text)" },
              { val: `${s.avgReturn > 0 ? "+" : ""}${s.avgReturn}%`, label: "Avg return", color: s.avgReturn >= 0 ? "var(--green)" : "var(--red)" },
            ].map((stat, i) => <div key={i} className="flex-1 text-center"><p className="stat-large" style={{ color: stat.color }}>{stat.val}</p><p className="micro">{stat.label}</p></div>)}
          </div>
          <WinLossBar wins={s.wins} losses={s.losses} />

          {/* Leverage + trade size */}
          {tradeSize && (
            <div className="flex gap-3 text-center">
              <div className="flex-1"><p className="caption font-semibold" style={{ color: "var(--text)" }}>{lev.label}</p><p className="micro">Leverage</p></div>
              <div className="flex-1"><p className="caption font-semibold" style={{ color: "var(--text)" }}>£{tradeSize.exposure.toLocaleString()}</p><p className="micro">Exposure (£1k)</p></div>
              <div className="flex-1"><p className="caption font-semibold" style={{ color: "var(--red)" }}>£{tradeSize.maxLoss}</p><p className="micro">Max loss</p></div>
              <div className="flex-1"><p className="caption font-semibold" style={{ color: "var(--text)" }}>{lev.marginPercent}%</p><p className="micro">Margin req</p></div>
            </div>
          )}
          {lev.warning && <p className="micro" style={{ color: "var(--amber)" }}>{lev.warning}</p>}

          {/* Scenarios */}
          {scenarios.length > 0 && (
            <div>
              <p className="section-label mb-2">Matched scenarios</p>
              <div className="space-y-1.5">{displayed.map((sc, i) => (
                <div key={i} className="rounded-lg py-2 px-3 flex items-center gap-3" style={{ background: "var(--surface-hover)" }}>
                  <MiniPath path={sc.pricePathPercent} won={sc.won} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="caption font-medium" style={{ color: "var(--text)" }}>{sc.entryDate} → {sc.exitDate}</span>
                      <span className="caption font-bold" style={{ color: sc.won ? "var(--green)" : "var(--red)" }}>{sc.returnPercent >= 0 ? "+" : ""}{sc.returnPercent}%</span>
                    </div>
                    <p className="micro">{sc.similarity}% match · {sc.daysHeld}d</p>
                  </div>
                </div>
              ))}</div>
              {scenarios.length > 4 && <button onClick={() => setShowAll(!showAll)} className="micro mt-2" style={{ color: "var(--accent)" }}>{showAll ? "Less" : `All ${scenarios.length}`}</button>}
            </div>
          )}

          {/* AI analysis + one-click optimise */}
          {result.aiAdvice && (
            <div>
              <p className="section-label mb-2">AI analysis {iteration > 0 && <span className="micro" style={{ color: "var(--accent)" }}>· iteration {iteration}</span>}</p>
              <p className="body-text mb-3">{result.aiAdvice.analysis}</p>
              {result.aiAdvice.suggestions.length > 0 && !optimising && rankedResults.length === 0 && (
                <button onClick={runRecommendedTests} className="w-full py-2.5 text-sm font-semibold" style={{ borderRadius: "var(--radius)", background: "var(--accent)", color: "white" }}>
                  Run {result.aiAdvice.suggestions.length} recommended tests
                </button>
              )}
              {optimising && <div className="flex items-center gap-2 py-3"><div className="w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid var(--accent)", borderTopColor: "transparent" }} /><span className="caption">Running {result.aiAdvice.suggestions.length} variations...</span></div>}
            </div>
          )}

          {/* Ranked results */}
          {rankedResults.length > 0 && (
            <div>
              <p className="section-label mb-2">Results — ranked</p>
              <div className="space-y-1.5">
                {rankedResults.map((r, i) => {
                  const improved = r.delta > 0;
                  const isBest = i === 0 && r.delta >= 0;
                  return (
                    <div key={r.id} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: isBest ? "var(--green-soft)" : r.delta < 0 ? "var(--red-soft)" : "var(--surface-hover)" }}>
                      <span className="micro font-bold" style={{ width: 20, color: isBest ? "var(--green)" : "var(--text-muted)" }}>#{i+1}</span>
                      <div className="flex-1"><span className="caption font-medium" style={{ color: "var(--text)" }}>{r.label}</span><span className="micro ml-2">S:{r.params.sl}% T:{r.params.tp}% H:{r.params.hold}d</span></div>
                      <span className="stat-medium" style={{ color: r.summary.winRate >= 55 ? "var(--green)" : "var(--red)" }}>{r.summary.winRate}%</span>
                      {r.delta !== 0 && <span className="micro font-bold" style={{ color: improved ? "var(--green)" : "var(--red)" }}>{r.delta > 0 ? "+" : ""}{r.delta}</span>}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-3">
                <button onClick={applyBest} className="flex-1 py-2.5 text-sm font-semibold" style={{ borderRadius: "var(--radius)", background: "var(--accent)", color: "white" }}>
                  Apply best &amp; iterate
                </button>
                <button onClick={handleFinalise} className="flex-1 py-2.5 text-sm font-semibold" style={{ borderRadius: "var(--radius)", background: "var(--green)", color: "white" }}>
                  Finalise best
                </button>
              </div>
            </div>
          )}

          {/* Grok */}
          <div>
            <div className="flex items-center gap-2 mb-2"><p className="section-label">Second opinion</p><span className="pill" style={{ background: "var(--surface-hover)", color: "var(--text-muted)", fontSize: 9 }}>Grok</span></div>
            {grok ? (
              <div className="rounded-lg py-3 px-3" style={{ background: "var(--surface-hover)" }}>
                <span className="pill mb-1" style={{ background: grok.agrees ? "var(--green-soft)" : "var(--red-soft)", color: grok.agrees ? "var(--green)" : "var(--red)", fontSize: 10 }}>{grok.agrees ? "Agrees" : "Disagrees"}</span>
                <p className="body-text mb-1">{grok.opinion}</p>
                <p className="caption" style={{ color: "var(--amber)" }}>{grok.caveat}</p>
              </div>
            ) : <button onClick={fetchGrok} disabled={grokLoading} className="py-2 px-4 text-sm font-medium rounded-lg" style={{ background: "var(--surface-hover)", color: "var(--text-secondary)" }}>{grokLoading ? "Asking Grok..." : "Get Grok's take"}</button>}
          </div>

          {/* Manual adjust */}
          {rankedResults.length === 0 && (
            <div>
              <p className="section-label mb-2">Manual adjust</p>
              <div className="flex gap-3 mb-3">
                {[{ l: "Stop %", v: sl, s: setSl, step: 0.5 }, { l: "Target %", v: tp, s: setTp, step: 0.5 }, { l: "Hold (d)", v: hold, s: setHold, step: 1 }].map((p,i) => (
                  <div key={i} className="flex-1"><p className="micro mb-1">{p.l}</p><input type="number" step={p.step} min={p.step} value={p.v} onChange={e => p.s(+e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg" style={{ background: "var(--surface-hover)", color: "var(--text)" }} /></div>
                ))}
              </div>
              <button onClick={() => runBacktest()} className="w-full py-2.5 text-sm font-semibold" style={{ borderRadius: "var(--radius)", background: "var(--surface-hover)", color: "var(--text-secondary)" }}>Re-run</button>
            </div>
          )}

          {/* Finalise (when no ranked results shown) */}
          {rankedResults.length === 0 && !finalised && (
            <button onClick={handleFinalise} className="w-full py-3 text-sm font-semibold" style={{ borderRadius: "var(--radius)", background: "var(--accent)", color: "white" }}>Finalise trade plan</button>
          )}
          {finalised && <div className="text-center py-3 rounded-lg" style={{ background: "var(--green-soft)" }}><p className="text-sm font-semibold" style={{ color: "var(--green)" }}>Trade plan finalised</p><p className="micro">S:{sl}% T:{tp}% H:{hold}d · {s.winRate}% WR · {lev.label} leverage</p></div>}
        </>
      )}
    </div>
  );
}
