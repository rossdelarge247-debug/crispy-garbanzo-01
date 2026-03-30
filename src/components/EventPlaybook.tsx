"use client";

/**
 * Event Playbook — replaces the backtest panel.
 *
 * Shows: what happened every previous time this event occurred.
 * Beat/miss/inline breakdown, asset reactions, asymmetry flags,
 * sample sizes everywhere, and an optional trade simulator.
 */

import { useState, useEffect } from "react";

interface AssetReaction { symbol: string; name: string; direction: "long"|"short"; move1h: number|null; move4h: number|null; move1d: number|null; won1h: boolean|null; won4h: boolean|null; won1d: boolean|null; }
interface EventInstance { date: string; actual?: string; consensus?: string; surprise: "beat"|"miss"|"inline"|"unknown"; reactions: AssetReaction[]; excluded: boolean; }
interface AssetEventStats { symbol: string; name: string; direction: "long"|"short"; beatAvg4h: number|null; missAvg4h: number|null; inlineAvg4h: number|null; beatWinRate4h: number|null; missWinRate4h: number|null; beatCount: number; missCount: number; inlineCount: number; }
interface PlaybookSummary { eventType: string; totalInstances: number; beats: number; misses: number; inline: number; assetStats: AssetEventStats[]; asymmetryFlag?: string; }
interface PlaybookData { eventType: string; eventTitle: string; summary: PlaybookSummary; instances: EventInstance[]; lookbackYears: number; dataSource: string; }

interface Props { eventTitle: string; }

function pct(v: number | null): string {
  if (v === null) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function surpriseColor(s: string): string {
  switch (s) { case "beat": return "var(--green)"; case "miss": return "var(--red)"; default: return "var(--text-muted)"; }
}

function surpriseBg(s: string): string {
  switch (s) { case "beat": return "var(--green-soft)"; case "miss": return "var(--red-soft)"; default: return "var(--surface-hover)"; }
}

export default function EventPlaybook({ eventTitle }: Props) {
  const [data, setData] = useState<PlaybookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [excludedDates, setExcludedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true); setError(null);
    fetch(`/api/event-playbook?event=${encodeURIComponent(eventTitle)}&months=24`)
      .then(r => { if (!r.ok) throw new Error("Not available"); return r.json(); })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [eventTitle]);

  function toggleExclude(date: string) {
    setExcludedDates(prev => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  }

  // Recalculate summary with exclusions
  const instances = data?.instances ?? [];
  const included = instances.filter(i => !excludedDates.has(i.date));
  const beats = included.filter(i => i.surprise === "beat");
  const misses = included.filter(i => i.surprise === "miss");
  const inlines = included.filter(i => i.surprise === "inline" || i.surprise === "unknown");
  const s = data?.summary;

  if (loading) {
    return (
      <div className="card space-y-4">
        <p className="section-label">Event playbook</p>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid var(--accent)", borderTopColor: "transparent" }} /><span className="caption">Loading historical event data...</span></div>
        {[1,2,3].map(i => <div key={i} className="h-10 rounded-lg skeleton" />)}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card">
        <p className="section-label mb-2">Event playbook</p>
        <p className="caption" style={{ color: "var(--text-muted)" }}>{error ?? "No historical data available for this event type."}</p>
      </div>
    );
  }

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between">
        <p className="section-label">Event playbook</p>
        <span className="micro" style={{ color: "var(--text-muted)" }}>{data.lookbackYears}y lookback · {included.length} instances</span>
      </div>

      {/* Beat / Miss / Inline summary */}
      <div className="flex gap-2">
        <div className="flex-1 text-center rounded-lg py-3" style={{ background: "var(--green-soft)" }}>
          <p className="stat-large" style={{ color: "var(--green)" }}>{beats.length}</p>
          <p className="micro">Beat</p>
        </div>
        <div className="flex-1 text-center rounded-lg py-3" style={{ background: "var(--red-soft)" }}>
          <p className="stat-large" style={{ color: "var(--red)" }}>{misses.length}</p>
          <p className="micro">Miss</p>
        </div>
        <div className="flex-1 text-center rounded-lg py-3" style={{ background: "var(--surface-hover)" }}>
          <p className="stat-large" style={{ color: "var(--text-muted)" }}>{inlines.length}</p>
          <p className="micro">Inline</p>
        </div>
      </div>

      {/* Asset reaction matrix */}
      {s && s.assetStats.length > 0 && (
        <div>
          <p className="section-label mb-2">Average reactions (4h window)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left py-1.5 micro" style={{ color: "var(--text-muted)" }}>Asset</th>
                  <th className="text-center py-1.5 micro" style={{ color: "var(--green)" }}>Beat (n={beats.length})</th>
                  <th className="text-center py-1.5 micro" style={{ color: "var(--red)" }}>Miss (n={misses.length})</th>
                  <th className="text-center py-1.5 micro" style={{ color: "var(--text-muted)" }}>Inline (n={inlines.length})</th>
                  <th className="text-center py-1.5 micro" style={{ color: "var(--text-muted)" }}>Beat WR</th>
                </tr>
              </thead>
              <tbody>
                {s.assetStats.map(stat => (
                  <tr key={stat.symbol} style={{ borderTop: "1px solid var(--surface-hover)" }}>
                    <td className="py-2">
                      <span className="pill" style={{ background: stat.direction === "long" ? "var(--green-soft)" : "var(--red-soft)", color: stat.direction === "long" ? "var(--green)" : "var(--red)" }}>
                        {stat.direction === "long" ? "↑" : "↓"} {stat.name}
                      </span>
                    </td>
                    <td className="text-center font-bold tabular-nums" style={{ color: stat.beatAvg4h !== null && stat.beatAvg4h > 0 ? "var(--green)" : "var(--red)" }}>{pct(stat.beatAvg4h)}</td>
                    <td className="text-center font-bold tabular-nums" style={{ color: stat.missAvg4h !== null && stat.missAvg4h > 0 ? "var(--green)" : "var(--red)" }}>{pct(stat.missAvg4h)}</td>
                    <td className="text-center tabular-nums" style={{ color: "var(--text-muted)" }}>{pct(stat.inlineAvg4h)}</td>
                    <td className="text-center font-bold tabular-nums" style={{ color: (stat.beatWinRate4h ?? 0) >= 60 ? "var(--green)" : "var(--text-muted)" }}>
                      {stat.beatWinRate4h !== null ? `${stat.beatWinRate4h}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Asymmetry flag */}
      {s?.asymmetryFlag && (
        <div className="rounded-lg py-2 px-3" style={{ background: "var(--accent-soft)" }}>
          <p className="micro font-semibold" style={{ color: "var(--accent)" }}>Asymmetry detected</p>
          <p className="caption">{s.asymmetryFlag}</p>
        </div>
      )}

      {/* Reaction table — expandable */}
      <div>
        <button onClick={() => setShowTable(!showTable)} className="flex items-center gap-2">
          <p className="section-label">Historical instances</p>
          <span className="micro" style={{ color: "var(--accent)" }}>{showTable ? "Hide ▴" : "Show all ▾"}</span>
        </button>

        {showTable && (
          <div className="mt-3 space-y-1">
            {instances.map(inst => {
              const isExcluded = excludedDates.has(inst.date);
              const primaryReaction = inst.reactions[0];
              return (
                <div key={inst.date} className="flex items-center gap-3 py-2 px-2 rounded-lg" style={{
                  background: isExcluded ? "transparent" : "var(--surface-hover)",
                  opacity: isExcluded ? 0.4 : 1,
                }}>
                  <button onClick={() => toggleExclude(inst.date)} className="micro shrink-0" style={{ color: isExcluded ? "var(--green)" : "var(--red)", width: 50 }}>
                    {isExcluded ? "Include" : "Exclude"}
                  </button>
                  <span className="micro tabular-nums shrink-0" style={{ color: "var(--text-muted)", width: 80 }}>{inst.date}</span>
                  <span className="pill shrink-0" style={{ background: surpriseBg(inst.surprise), color: surpriseColor(inst.surprise), fontSize: 9 }}>
                    {inst.surprise}
                  </span>
                  {primaryReaction && (
                    <>
                      <span className="micro shrink-0" style={{ color: "var(--text-muted)" }}>{primaryReaction.name}:</span>
                      <span className="micro font-bold tabular-nums" style={{ color: (primaryReaction.move1d ?? 0) > 0 ? "var(--green)" : (primaryReaction.move1d ?? 0) < 0 ? "var(--red)" : "var(--text-muted)" }}>
                        {pct(primaryReaction.move1d)}
                      </span>
                      <span className="micro" style={{ color: primaryReaction.won1d ? "var(--green)" : "var(--red)" }}>
                        {primaryReaction.won1d ? "✓" : "✗"}
                      </span>
                    </>
                  )}
                </div>
              );
            })}

            {excludedDates.size > 0 && (
              <p className="micro mt-2" style={{ color: "var(--text-muted)" }}>
                {excludedDates.size} excluded — summary stats recalculated with {included.length} instances
              </p>
            )}
          </div>
        )}
      </div>

      {/* AI annotation — observational, not prescriptive */}
      {beats.length >= 3 && misses.length >= 2 && (
        <div className="rounded-lg py-2 px-3" style={{ background: "var(--surface-hover)" }}>
          <p className="micro font-semibold mb-0.5" style={{ color: "var(--text-muted)" }}>Observation</p>
          <p className="caption">
            {beats.length > misses.length
              ? `This event has beaten consensus ${beats.length} of ${included.length} times (${(beats.length / included.length * 100).toFixed(0)}%). The recommended direction has historically worked ${s?.assetStats[0]?.beatWinRate4h ?? "—"}% of the time on beats.`
              : `This event has missed consensus ${misses.length} of ${included.length} times (${(misses.length / included.length * 100).toFixed(0)}%). Consider positioning for a miss scenario.`
            }
            {" "}Sample size: n={included.length}. {included.length < 8 ? "Caution: small sample." : ""}
          </p>
        </div>
      )}
    </div>
  );
}
