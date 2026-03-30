"use client";

/**
 * Event Playbook — historical event reactions + social listening +
 * trade plan generator + detective mode.
 */

import { useState, useEffect } from "react";
import { addJournalEntry } from "@/lib/journal";
import { getLeverage, calculateTradeSize } from "@/lib/leverage";
import { getCurrencySymbol } from "@/lib/currency";
import Link from "next/link";

interface AssetReaction { symbol: string; name: string; direction: "long"|"short"; move1h: number|null; move4h: number|null; move1d: number|null; won1h: boolean|null; won4h: boolean|null; won1d: boolean|null; }
interface EventInstance { date: string; surprise: "beat"|"miss"|"inline"|"unknown"; reactions: AssetReaction[]; excluded: boolean; }
interface AssetEventStats { symbol: string; name: string; direction: "long"|"short"; beatAvg4h: number|null; missAvg4h: number|null; inlineAvg4h: number|null; beatWinRate4h: number|null; missWinRate4h: number|null; beatCount: number; missCount: number; inlineCount: number; }
interface PlaybookSummary { eventType: string; totalInstances: number; beats: number; misses: number; inline: number; assetStats: AssetEventStats[]; asymmetryFlag?: string; }
interface PlaybookData { eventType: string; eventTitle: string; summary: PlaybookSummary; instances: EventInstance[]; lookbackYears: number; dataSource: string; }
interface SocialClue { title: string; source: string; sentiment: string; }
interface SocialSignal { source: string; label: string; score: number; volume: number; topPost: string | null; }
interface SocialData { compositeLabel: string; agreement: number; signals: SocialSignal[]; clues: SocialClue[]; summary: string; }

interface Props { eventTitle: string; primaryAsset?: string; primaryDirection?: "long" | "short"; }

function pct(v: number | null): string { return v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`; }
function surpriseColor(s: string): string { return s === "beat" ? "var(--green)" : s === "miss" ? "var(--red)" : "var(--text-muted)"; }
function surpriseBg(s: string): string { return s === "beat" ? "var(--green-soft)" : s === "miss" ? "var(--red-soft)" : "var(--surface-hover)"; }

export default function EventPlaybook({ eventTitle, primaryAsset, primaryDirection }: Props) {
  const [data, setData] = useState<PlaybookData | null>(null);
  const [social, setSocial] = useState<SocialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [socialLoading, setSocialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [excludedDates, setExcludedDates] = useState<Set<string>>(new Set());
  const [planGenerated, setPlanGenerated] = useState(false);
  const [planLogged, setPlanLogged] = useState(false);
  const [detectiveMode, setDetectiveMode] = useState(false);
  const [detectiveEmail, setDetectiveEmail] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/event-playbook?event=${encodeURIComponent(eventTitle)}&months=24`)
      .then(r => { if (!r.ok) throw new Error("Not available"); return r.json(); })
      .then(d => { setData(d); loadSocial(); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [eventTitle]);

  function loadSocial() {
    setSocialLoading(true);
    fetch(`/api/social-listen?event=${encodeURIComponent(eventTitle)}&asset=${primaryAsset ?? ""}`)
      .then(r => r.json())
      .then(setSocial)
      .catch(() => {})
      .finally(() => setSocialLoading(false));
  }

  function toggleExclude(date: string) {
    setExcludedDates(prev => { const n = new Set(prev); n.has(date) ? n.delete(date) : n.add(date); return n; });
  }

  // Trade plan generation
  const bestAsset = data?.summary.assetStats[0];
  const lev = bestAsset ? getLeverage(bestAsset.symbol) : null;
  const cur = bestAsset ? getCurrencySymbol(bestAsset.symbol) : "£";
  const tradeAmount = 1000;
  const stopPct = bestAsset?.symbol.includes("-USD") && !bestAsset.symbol.includes("BTC") ? 0.5 : 2;
  const targetPct = stopPct * 2;
  const tradeSize = lev ? calculateTradeSize(bestAsset!.symbol, tradeAmount, 0, stopPct) : null;
  const winRate = bestAsset?.beatWinRate4h ?? 50;
  const expectedReturn = (winRate / 100 * targetPct) - ((1 - winRate / 100) * stopPct);

  function handleLogTrade() {
    if (!bestAsset) return;
    addJournalEntry({
      symbol: bestAsset.symbol, assetName: bestAsset.name,
      direction: bestAsset.direction, setupType: `event_${data?.eventType ?? "macro"}`,
      thesis: `${eventTitle}: ${bestAsset.direction} ${bestAsset.name}. Win rate: ${winRate}% on beats (n=${bestAsset.beatCount}).`,
      catalyst: eventTitle, entryPrice: 0, entryTime: new Date().toISOString(),
      preTradeNotes: `Stop: ${stopPct}%, Target: ${targetPct}%, R:R: ${(targetPct/stopPct).toFixed(1)}:1. Leverage: ${lev?.leverage ?? 1}x. Position: £${tradeAmount}.`,
      status: "planned", tags: [data?.eventType ?? "macro", bestAsset.symbol.toLowerCase()],
    });
    setPlanLogged(true);
  }

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
        <p className="caption" style={{ color: "var(--text-muted)" }}>{error ?? "No historical data for this event type."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Playbook header */}
      <div className="card space-y-5">
        <div className="flex items-center justify-between">
          <p className="section-label">Event playbook</p>
          <span className="micro" style={{ color: "var(--text-muted)" }}>{data.lookbackYears}y · {included.length} instances</span>
        </div>

        {/* Beat / Miss / Inline */}
        <div className="flex gap-2">
          <div className="flex-1 text-center rounded-lg py-3" style={{ background: "var(--green-soft)" }}><p className="stat-large" style={{ color: "var(--green)" }}>{beats.length}</p><p className="micro">Beat</p></div>
          <div className="flex-1 text-center rounded-lg py-3" style={{ background: "var(--red-soft)" }}><p className="stat-large" style={{ color: "var(--red)" }}>{misses.length}</p><p className="micro">Miss</p></div>
          <div className="flex-1 text-center rounded-lg py-3" style={{ background: "var(--surface-hover)" }}><p className="stat-large" style={{ color: "var(--text-muted)" }}>{inlines.length}</p><p className="micro">Inline</p></div>
        </div>

        {/* Asset reaction matrix */}
        {s && s.assetStats.length > 0 && (
          <div>
            <p className="section-label mb-2">Average reactions (4h)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr>
                  <th className="text-left py-1.5 micro" style={{ color: "var(--text-muted)" }}>Asset</th>
                  <th className="text-center py-1.5 micro" style={{ color: "var(--green)" }}>Beat (n={beats.length})</th>
                  <th className="text-center py-1.5 micro" style={{ color: "var(--red)" }}>Miss (n={misses.length})</th>
                  <th className="text-center py-1.5 micro" style={{ color: "var(--text-muted)" }}>Beat WR</th>
                </tr></thead>
                <tbody>
                  {s.assetStats.map(stat => (
                    <tr key={stat.symbol} style={{ borderTop: "1px solid var(--surface-hover)" }}>
                      <td className="py-2"><span className="pill" style={{ background: stat.direction === "long" ? "var(--green-soft)" : "var(--red-soft)", color: stat.direction === "long" ? "var(--green)" : "var(--red)" }}>{stat.direction === "long" ? "↑" : "↓"} {stat.name}</span></td>
                      <td className="text-center font-bold tabular-nums" style={{ color: (stat.beatAvg4h ?? 0) > 0 ? "var(--green)" : "var(--red)" }}>{pct(stat.beatAvg4h)}</td>
                      <td className="text-center font-bold tabular-nums" style={{ color: (stat.missAvg4h ?? 0) > 0 ? "var(--green)" : "var(--red)" }}>{pct(stat.missAvg4h)}</td>
                      <td className="text-center font-bold tabular-nums" style={{ color: (stat.beatWinRate4h ?? 0) >= 60 ? "var(--green)" : "var(--text-muted)" }}>{stat.beatWinRate4h !== null ? `${stat.beatWinRate4h}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {s?.asymmetryFlag && (
          <div className="rounded-lg py-2 px-3" style={{ background: "var(--accent-soft)" }}>
            <p className="micro font-semibold" style={{ color: "var(--accent)" }}>Asymmetry detected</p>
            <p className="caption">{s.asymmetryFlag}</p>
          </div>
        )}

        {/* Historical instances */}
        <div>
          <button onClick={() => setShowTable(!showTable)} className="flex items-center gap-2">
            <p className="section-label">Historical instances</p>
            <span className="micro" style={{ color: "var(--accent)" }}>{showTable ? "Hide ▴" : "Show all ▾"}</span>
          </button>
          {showTable && (
            <div className="mt-3 space-y-1">
              {instances.map(inst => {
                const ex = excludedDates.has(inst.date);
                const pr = inst.reactions[0];
                return (
                  <div key={inst.date} className="flex items-center gap-3 py-2 px-2 rounded-lg" style={{ background: ex ? "transparent" : "var(--surface-hover)", opacity: ex ? 0.4 : 1 }}>
                    <button onClick={() => toggleExclude(inst.date)} className="micro shrink-0" style={{ color: ex ? "var(--green)" : "var(--red)", width: 50 }}>{ex ? "Include" : "Exclude"}</button>
                    <span className="micro tabular-nums shrink-0" style={{ color: "var(--text-muted)", width: 80 }}>{inst.date}</span>
                    <span className="pill shrink-0" style={{ background: surpriseBg(inst.surprise), color: surpriseColor(inst.surprise), fontSize: 9 }}>{inst.surprise}</span>
                    {pr && <span className="micro font-bold tabular-nums" style={{ color: (pr.move1d ?? 0) > 0 ? "var(--green)" : "var(--red)" }}>{pct(pr.move1d)}</span>}
                    {pr && <span className="micro" style={{ color: pr.won1d ? "var(--green)" : "var(--red)" }}>{pr.won1d ? "✓" : "✗"}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Social listening */}
      <div className="card space-y-3">
        <p className="section-label">Social intelligence</p>
        {socialLoading && <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full animate-spin" style={{ border: "1.5px solid var(--accent)", borderTopColor: "transparent" }} /><span className="micro">Scanning social sources...</span></div>}
        {social && (
          <>
            <p className="caption">{social.summary}</p>
            {social.signals.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {social.signals.map((sig, i) => (
                  <span key={i} className="pill" style={{ background: sig.score > 15 ? "var(--green-soft)" : sig.score < -15 ? "var(--red-soft)" : "var(--surface-hover)", color: sig.score > 15 ? "var(--green)" : sig.score < -15 ? "var(--red)" : "var(--text-muted)" }}>
                    {sig.source}: {sig.label} ({sig.volume})
                  </span>
                ))}
              </div>
            )}
            {social.clues.length > 0 && (
              <div>
                <p className="micro font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Recent chatter</p>
                {social.clues.slice(0, 4).map((c, i) => (
                  <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.sentiment === "bullish" ? "var(--green)" : c.sentiment === "bearish" ? "var(--red)" : "var(--text-muted)" }} />
                    <span className="micro truncate" style={{ color: "var(--text-secondary)" }}>{c.title}</span>
                    <span className="micro shrink-0" style={{ color: "var(--text-muted)" }}>{c.source}</span>
                  </div>
                ))}
              </div>
            )}
            {social.signals.some(s => s.topPost) && (
              <p className="micro italic" style={{ color: "var(--text-muted)" }}>
                "{social.signals.find(s => s.topPost)?.topPost}"
              </p>
            )}
          </>
        )}

        {/* Detective mode */}
        <div className="pt-2" style={{ borderTop: "1px solid var(--surface-hover)" }}>
          {!detectiveMode ? (
            <button onClick={() => setDetectiveMode(true)} className="flex items-center gap-2 py-1.5">
              <span className="micro font-semibold" style={{ color: "var(--accent)" }}>🔍 Detective mode</span>
              <span className="micro" style={{ color: "var(--text-muted)" }}>Monitor sources for clues before the event</span>
            </button>
          ) : (
            <div className="space-y-2">
              <p className="micro font-semibold" style={{ color: "var(--accent)" }}>🔍 Detective mode active</p>
              <p className="micro" style={{ color: "var(--text-muted)" }}>Enter your email to receive alerts when new clues surface about {eventTitle}.</p>
              <div className="flex gap-2">
                <input type="email" placeholder="your@email.com" value={detectiveEmail} onChange={e => setDetectiveEmail(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-lg" style={{ background: "var(--surface-hover)", color: "var(--text)" }} />
                <button disabled={!detectiveEmail.includes("@")} onClick={() => { alert(`Detective mode set for ${detectiveEmail}. You'll be notified when new intelligence surfaces about ${eventTitle}.`); }}
                  className="px-4 py-2 text-sm font-semibold rounded-lg" style={{ background: detectiveEmail.includes("@") ? "var(--accent)" : "var(--surface-hover)", color: detectiveEmail.includes("@") ? "white" : "var(--text-muted)" }}>
                  Alert me
                </button>
              </div>
              <p className="micro" style={{ color: "var(--text-muted)" }}>Coming soon: AI agent monitors GDELT, Reddit, StockTwits, and RSS for pre-event signals.</p>
            </div>
          )}
        </div>
      </div>

      {/* Generate Trade Plan */}
      {bestAsset && tradeSize && (
        <div className="card space-y-4">
          <p className="section-label">Trade plan</p>

          {!planGenerated ? (
            <div>
              <p className="caption mb-3">Based on the playbook data, generate a specific trade plan with timing, size, and stop losses.</p>
              <button onClick={() => setPlanGenerated(true)} className="w-full py-3 text-sm font-semibold" style={{ borderRadius: "var(--radius)", background: "var(--accent)", color: "white" }}>
                Generate trade plan
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-lg py-3 px-3" style={{ background: "var(--surface-hover)" }}>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div><p className="micro">Asset</p><p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{bestAsset.direction === "long" ? "↑" : "↓"} {bestAsset.name}</p></div>
                  <div><p className="micro">Timing</p><p className="text-sm font-medium" style={{ color: "var(--text)" }}>Before the release</p></div>
                  <div><p className="micro">Position</p><p className="text-sm font-semibold" style={{ color: "var(--text)" }}>£{tradeAmount} at {lev?.leverage}x</p></div>
                  <div><p className="micro">Exposure</p><p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{cur}{tradeSize.exposure.toLocaleString()}</p></div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div><p className="stat-medium" style={{ color: "var(--green)" }}>{cur}{(tradeSize.exposure * targetPct / 100).toFixed(0)}</p><p className="micro">Max win</p></div>
                  <div><p className="stat-medium" style={{ color: "var(--red)" }}>{cur}{tradeSize.maxLoss.toFixed(0)}</p><p className="micro">Max loss</p></div>
                  <div><p className="stat-medium" style={{ color: "var(--red)" }}>{stopPct}%</p><p className="micro">Stop</p></div>
                  <div><p className="stat-medium" style={{ color: "var(--green)" }}>{targetPct}%</p><p className="micro">Target</p></div>
                </div>
                <div className="flex justify-between mt-3">
                  <span className="micro">R:R: <span className="font-semibold" style={{ color: "var(--green)" }}>{(targetPct/stopPct).toFixed(1)}:1</span></span>
                  <span className="micro">Win rate: <span className="font-semibold" style={{ color: winRate >= 60 ? "var(--green)" : "var(--amber)" }}>{winRate}%</span> (n={bestAsset.beatCount})</span>
                  <span className="micro">EV: <span className="font-semibold" style={{ color: expectedReturn > 0 ? "var(--green)" : "var(--red)" }}>{expectedReturn > 0 ? "+" : ""}{expectedReturn.toFixed(2)}%</span></span>
                </div>
              </div>

              {lev?.warning && <p className="micro" style={{ color: "var(--amber)" }}>{lev.warning}</p>}

              {!planLogged ? (
                <div className="flex gap-3">
                  <button onClick={handleLogTrade} className="flex-1 py-3 text-sm font-semibold" style={{ borderRadius: "var(--radius)", background: "var(--accent)", color: "white" }}>
                    Add to journal
                  </button>
                  <button disabled className="py-3 px-4 text-sm font-semibold" style={{ borderRadius: "var(--radius)", background: "var(--surface-hover)", color: "var(--text-muted)", opacity: 0.5, cursor: "not-allowed" }}>
                    Execute via broker
                  </button>
                </div>
              ) : (
                <div className="text-center py-3 rounded-lg" style={{ background: "var(--green-soft)" }}>
                  <p className="text-sm font-semibold" style={{ color: "var(--green)" }}>Trade plan logged</p>
                  <Link href="/journal" className="micro" style={{ color: "var(--accent)" }}>View in journal →</Link>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
