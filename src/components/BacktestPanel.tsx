"use client";

/**
 * BacktestPanel — runs and displays a historical backtest for a setup.
 * Shows: win rate, profit factor, each matched scenario with sparkline + narrative.
 */

import { useState } from "react";

interface BacktestScenario {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  exitReason: "target" | "stop" | "time";
  returnPercent: number;
  daysHeld: number;
  won: boolean;
  similarity: number;
  matchReason: string;
  narrative: string;
  pricePathPercent: number[];
}

interface BacktestSummary {
  scenarioCount: number;
  wins: number;
  losses: number;
  winRate: number;
  avgReturn: number;
  avgDaysHeld: number;
  bestReturn: number;
  worstReturn: number;
  profitFactor: number;
}

interface BacktestResult {
  symbol: string;
  direction: string;
  dataPoints: number;
  dateRange: { from: string; to: string };
  summary: BacktestSummary;
  scenarios: BacktestScenario[];
  recommendation: string;
}

interface Props {
  symbol: string;
  direction: "long" | "short";
  stopLoss?: number;
  takeProfit?: number;
  maxHoldDays?: number;
}

function fp(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

function MiniPath({ path, won }: { path: number[]; won: boolean }) {
  if (path.length < 2) return null;
  const w = 72; const h = 24;
  const min = Math.min(...path); const max = Math.max(...path);
  const range = max - min || 1;
  const pts = path.map((v, i) => `${(i / (path.length - 1)) * w},${h - 2 - ((v - min) / range) * (h - 4)}`).join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" stroke={won ? "var(--green)" : "var(--red)"} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export default function BacktestPanel({ symbol, direction, stopLoss = 2, takeProfit = 3, maxHoldDays = 10 }: Props) {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Adjustable params
  const [sl, setSl] = useState(stopLoss);
  const [tp, setTp] = useState(takeProfit);
  const [hold, setHold] = useState(maxHoldDays);

  async function runBacktest() {
    setLoading(true);
    setError(null);
    setResult(null);
    setShowAll(false);
    try {
      const res = await fetch("/api/backtest-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, direction, stopLossPercent: sl, takeProfitPercent: tp, maxHoldDays: hold }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || e.error || "Failed"); }
      setResult(await res.json());
    } catch (e) { setError(e instanceof Error ? e.message : "Backtest failed"); }
    setLoading(false);
  }

  const s = result?.summary;
  const scenarios = result?.scenarios ?? [];
  const displayed = showAll ? scenarios : scenarios.slice(0, 5);

  return (
    <div className="card space-y-4">
      <p className="section-label">Backtest</p>

      {/* Config */}
      {!result && !loading && (
        <>
          <p className="caption">
            Test this {direction} setup against {symbol} historical data. Find every time similar conditions existed and see what happened.
          </p>
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="micro mb-1">Stop loss %</p>
              <input type="number" step="0.5" min="0.5" value={sl} onChange={e => setSl(+e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg" style={{ background: "var(--surface-hover)", color: "var(--text)" }} />
            </div>
            <div className="flex-1">
              <p className="micro mb-1">Target %</p>
              <input type="number" step="0.5" min="0.5" value={tp} onChange={e => setTp(+e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg" style={{ background: "var(--surface-hover)", color: "var(--text)" }} />
            </div>
            <div className="flex-1">
              <p className="micro mb-1">Max hold (days)</p>
              <input type="number" min="1" max="30" value={hold} onChange={e => setHold(+e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg" style={{ background: "var(--surface-hover)", color: "var(--text)" }} />
            </div>
          </div>
          <button onClick={runBacktest}
            className="w-full py-3 text-sm font-semibold" style={{ borderRadius: "var(--radius)", background: "var(--accent)", color: "white" }}>
            Run backtest
          </button>
        </>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid var(--accent)", borderTopColor: "transparent" }} />
            <span className="caption">Testing against historical data...</span>
          </div>
          <div className="h-10 rounded-lg skeleton" />
          <div className="h-10 rounded-lg skeleton" />
          <div className="h-10 rounded-lg skeleton" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="py-3 px-4 rounded-lg" style={{ background: "var(--red-soft)" }}>
          <p className="caption" style={{ color: "var(--red)" }}>{error}</p>
        </div>
      )}

      {/* Results */}
      {s && (
        <>
          {/* Data range */}
          <p className="micro">
            {result.dataPoints} trading days · {result.dateRange.from} to {result.dateRange.to}
          </p>

          {/* Hero stats */}
          <div className="flex gap-4">
            <div className="flex-1 text-center">
              <p className="stat-large" style={{ color: s.winRate >= 55 ? "var(--green)" : s.winRate >= 45 ? "var(--amber)" : "var(--red)" }}>{s.winRate}%</p>
              <p className="micro">Win rate</p>
            </div>
            <div className="flex-1 text-center">
              <p className="stat-large" style={{ color: "var(--text)" }}>{s.scenarioCount}</p>
              <p className="micro">Scenarios</p>
            </div>
            <div className="flex-1 text-center">
              <p className="stat-large" style={{ color: "var(--text)" }}>{s.profitFactor}:1</p>
              <p className="micro">Profit factor</p>
            </div>
            <div className="flex-1 text-center">
              <p className="stat-large" style={{ color: "var(--text)" }}>{s.avgDaysHeld}d</p>
              <p className="micro">Avg hold</p>
            </div>
          </div>

          {/* Secondary stats */}
          <div className="flex gap-4 justify-center">
            <span className="caption">Avg return: <span style={{ color: s.avgReturn >= 0 ? "var(--green)" : "var(--red)" }}>{s.avgReturn > 0 ? "+" : ""}{s.avgReturn}%</span></span>
            <span className="caption">Best: <span style={{ color: "var(--green)" }}>+{s.bestReturn}%</span></span>
            <span className="caption">Worst: <span style={{ color: "var(--red)" }}>{s.worstReturn}%</span></span>
          </div>

          {/* Scenario list */}
          {scenarios.length > 0 && (
            <div>
              <p className="section-label mb-2">Historical scenarios</p>
              <div className="space-y-2">
                {displayed.map((sc, i) => (
                  <ScenarioRow key={i} sc={sc} />
                ))}
              </div>
              {scenarios.length > 5 && (
                <button onClick={() => setShowAll(!showAll)} className="micro mt-2" style={{ color: "var(--accent)" }}>
                  {showAll ? "Show fewer" : `Show all ${scenarios.length}`}
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={runBacktest} className="flex-1 py-2.5 text-sm font-semibold" style={{ borderRadius: "var(--radius)", background: "var(--surface-hover)", color: "var(--text-secondary)" }}>
              Re-run
            </button>
            <button onClick={() => { setResult(null); setShowAll(false); }} className="flex-1 py-2.5 text-sm font-semibold" style={{ borderRadius: "var(--radius)", background: "var(--surface-hover)", color: "var(--text-secondary)" }}>
              Adjust parameters
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ScenarioRow({ sc }: { sc: BacktestScenario }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg py-2 px-3" style={{ background: "var(--surface-hover)" }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <div className="flex items-center gap-3">
          <MiniPath path={sc.pricePathPercent} won={sc.won} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="caption font-medium" style={{ color: "var(--text)" }}>{sc.entryDate} → {sc.exitDate}</span>
              <span className="caption font-bold" style={{ color: sc.won ? "var(--green)" : "var(--red)" }}>
                {sc.returnPercent >= 0 ? "+" : ""}{sc.returnPercent}%
              </span>
              <span className="micro" style={{ color: sc.exitReason === "target" ? "var(--green)" : sc.exitReason === "stop" ? "var(--red)" : "var(--text-muted)" }}>
                {sc.exitReason === "target" ? "Target" : sc.exitReason === "stop" ? "Stopped" : "Time"}
              </span>
            </div>
            <p className="micro">{sc.similarity}% match · {sc.daysHeld}d held</p>
          </div>
          <span className="micro" style={{ color: "var(--text-muted)" }}>{expanded ? "▴" : "▾"}</span>
        </div>
      </button>
      {expanded && (
        <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--surface)" }}>
          <p className="caption leading-relaxed mb-1">{sc.narrative}</p>
          <p className="micro">Entry: {fp(sc.entryPrice)} → Exit: {fp(sc.exitPrice)}</p>
          <p className="micro" style={{ color: "var(--text-muted)" }}>Why matched: {sc.matchReason}</p>
        </div>
      )}
    </div>
  );
}
