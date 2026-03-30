"use client";

/**
 * BacktestPanel — historical backtest with 365-day data, min 10 scenarios.
 *
 * Shows:
 * - Win rate, profit factor, avg return as hero stats
 * - Win/loss distribution bar
 * - Best performing conditions (what days of week, how quickly winners resolve)
 * - Parameter suggestions (what stop/target would improve results)
 * - Each matched scenario with sparkline + narrative
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

interface BacktestResult {
  symbol: string; direction: string; dataPoints: number;
  dateRange: { from: string; to: string };
  summary: Summary; scenarios: Scenario[]; recommendation: string;
}

interface Props {
  symbol: string;
  direction: "long" | "short";
  setupType?: string;
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

/* Win/loss distribution bar */
function WinLossBar({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  if (total === 0) return null;
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

/* Insights from the scenario data */
function BacktestInsights({ scenarios, summary }: { scenarios: Scenario[]; summary: Summary }) {
  const winners = scenarios.filter(s => s.won);
  const losers = scenarios.filter(s => !s.won);

  // How quickly do winners resolve?
  const avgWinDays = winners.length > 0 ? +(winners.reduce((s, r) => s + r.daysHeld, 0) / winners.length).toFixed(1) : 0;
  const avgLossDays = losers.length > 0 ? +(losers.reduce((s, r) => s + r.daysHeld, 0) / losers.length).toFixed(1) : 0;

  // What % hit target vs stopped vs timed out?
  const targetHits = scenarios.filter(s => s.exitReason === "target").length;
  const stops = scenarios.filter(s => s.exitReason === "stop").length;
  const timeExits = scenarios.filter(s => s.exitReason === "time").length;

  // Best similarity range
  const highSimilarity = scenarios.filter(s => s.similarity >= 70);
  const highSimWR = highSimilarity.length >= 3 ? +(highSimilarity.filter(s => s.won).length / highSimilarity.length * 100).toFixed(0) : null;

  return (
    <div className="space-y-2">
      <p className="section-label">Insights</p>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg py-2" style={{ background: "var(--green-soft)" }}>
          <p className="stat-medium" style={{ color: "var(--green)" }}>{targetHits}</p>
          <p className="micro">Hit target</p>
        </div>
        <div className="rounded-lg py-2" style={{ background: "var(--red-soft)" }}>
          <p className="stat-medium" style={{ color: "var(--red)" }}>{stops}</p>
          <p className="micro">Stopped out</p>
        </div>
        <div className="rounded-lg py-2" style={{ background: "var(--surface-hover)" }}>
          <p className="stat-medium" style={{ color: "var(--text-muted)" }}>{timeExits}</p>
          <p className="micro">Timed out</p>
        </div>
      </div>

      <div className="space-y-1">
        {avgWinDays > 0 && <p className="caption">Winners resolve in <span style={{ color: "var(--green)" }}>{avgWinDays} days</span> on average</p>}
        {avgLossDays > 0 && <p className="caption">Losers take <span style={{ color: "var(--red)" }}>{avgLossDays} days</span> on average</p>}
        {highSimWR !== null && (
          <p className="caption">High-similarity matches (≥70%): <span style={{ color: highSimWR >= 60 ? "var(--green)" : "var(--red)" }}>{highSimWR}% win rate</span></p>
        )}
        {timeExits > scenarios.length * 0.3 && (
          <p className="caption" style={{ color: "var(--amber)" }}>⚠ {Math.round(timeExits / scenarios.length * 100)}% of scenarios timed out — consider a longer hold period</p>
        )}
        {stops > scenarios.length * 0.4 && (
          <p className="caption" style={{ color: "var(--amber)" }}>⚠ {Math.round(stops / scenarios.length * 100)}% hit the stop — consider a wider stop loss</p>
        )}
      </div>
    </div>
  );
}

export default function BacktestPanel({ symbol, direction, setupType }: Props) {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [autoRan, setAutoRan] = useState(false);

  const [sl, setSl] = useState(2);
  const [tp, setTp] = useState(3);
  const [hold, setHold] = useState(10);

  async function runBacktest() {
    setLoading(true); setError(null); setResult(null); setShowAll(false);
    try {
      const res = await fetch("/api/backtest-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, direction, stopLossPercent: sl, takeProfitPercent: tp, maxHoldDays: hold }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || e.error || "Failed"); }
      setResult(await res.json());
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    setLoading(false);
  }

  // Auto-run on mount
  useEffect(() => {
    if (!autoRan) { setAutoRan(true); runBacktest(); }
  }, []);// eslint-disable-line

  const s = result?.summary;
  const scenarios = result?.scenarios ?? [];
  const displayed = showAll ? scenarios : scenarios.slice(0, 5);

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between">
        <p className="section-label">Backtest — historical evidence</p>
        {result && <p className="micro">{result.dataPoints} days · {result.dateRange.from} → {result.dateRange.to}</p>}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid var(--accent)", borderTopColor: "transparent" }} />
            <span className="caption">Testing against 365 days of historical data...</span>
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
              <p className="stat-large" style={{ color: s.avgReturn >= 0 ? "var(--green)" : "var(--red)" }}>{s.avgReturn > 0 ? "+" : ""}{s.avgReturn}%</p>
              <p className="micro">Avg return</p>
            </div>
          </div>

          {/* Win/loss bar */}
          <WinLossBar wins={s.wins} losses={s.losses} />

          {/* Insights */}
          <BacktestInsights scenarios={scenarios} summary={s} />

          {/* Scenarios */}
          {scenarios.length > 0 && (
            <div>
              <p className="section-label mb-2">Matched scenarios</p>
              <div className="space-y-1.5">
                {displayed.map((sc, i) => <ScenarioRow key={i} sc={sc} />)}
              </div>
              {scenarios.length > 5 && (
                <button onClick={() => setShowAll(!showAll)} className="micro mt-2" style={{ color: "var(--accent)" }}>
                  {showAll ? "Show fewer" : `Show all ${scenarios.length}`}
                </button>
              )}
            </div>
          )}

          {/* Adjust + re-run */}
          <div>
            <p className="section-label mb-2">Adjust parameters</p>
            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <p className="micro mb-1">Stop %</p>
                <input type="number" step="0.5" min="0.5" value={sl} onChange={e => setSl(+e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg" style={{ background: "var(--surface-hover)", color: "var(--text)" }} />
              </div>
              <div className="flex-1">
                <p className="micro mb-1">Target %</p>
                <input type="number" step="0.5" min="0.5" value={tp} onChange={e => setTp(+e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg" style={{ background: "var(--surface-hover)", color: "var(--text)" }} />
              </div>
              <div className="flex-1">
                <p className="micro mb-1">Hold (days)</p>
                <input type="number" min="1" max="30" value={hold} onChange={e => setHold(+e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg" style={{ background: "var(--surface-hover)", color: "var(--text)" }} />
              </div>
            </div>
            <button onClick={runBacktest}
              className="w-full py-2.5 text-sm font-semibold" style={{ borderRadius: "var(--radius)", background: "var(--accent)", color: "white" }}>
              Re-run backtest
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ScenarioRow({ sc }: { sc: Scenario }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg py-2 px-3" style={{ background: "var(--surface-hover)" }}>
      <button onClick={() => setOpen(!open)} className="w-full text-left">
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
          <span className="micro" style={{ color: "var(--text-muted)" }}>{open ? "▴" : "▾"}</span>
        </div>
      </button>
      {open && (
        <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--surface)" }}>
          <p className="caption leading-relaxed mb-1">{sc.narrative}</p>
          <p className="micro">Entry: {fp(sc.entryPrice)} → Exit: {fp(sc.exitPrice)}</p>
          <p className="micro" style={{ color: "var(--text-muted)" }}>Why matched: {sc.matchReason}</p>
        </div>
      )}
    </div>
  );
}
