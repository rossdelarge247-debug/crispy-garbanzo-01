"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { MissionControlData, InstrumentSummary, Setup, InstrumentRegime } from "@/types/mission-control";
import { loadWatchlist, saveWatchlist, ALL_INSTRUMENTS } from "@/lib/watchlist";
import type { WatchedInstrument } from "@/types/mission-control";
import { getOpenPositions, type PaperPosition } from "@/lib/paper-positions";
import { generateAlerts, getUnreadCount } from "@/lib/alerts";
import Tip from "@/components/Tip";
import FeedStatus from "@/components/FeedStatus";

/* ================================================================
   Helpers
   ================================================================ */

function fp(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

/* ================================================================
   Regime pills
   ================================================================ */

function RegimePills({ regime }: { regime: InstrumentRegime }) {
  const trendColor = regime.trend.includes("up") ? "text-[--green]" : regime.trend.includes("down") ? "text-[--red]" : "text-[--text-muted]";
  const volColor = regime.volatility === "extreme" ? "text-[--red]" : regime.volatility === "elevated" ? "text-[--amber]" : regime.volatility === "compressed" ? "text-[--accent]" : "text-[--text-muted]";
  const eventColor = regime.eventRisk === "high" ? "text-[--red]" : regime.eventRisk === "medium" ? "text-[--amber]" : "text-[--text-muted]";

  return (
    <div className="flex flex-wrap gap-1.5 text-2xs">
      <Tip term={regime.trend} label={regime.trendLabel} className={`px-1.5 py-0.5 rounded bg-[--surface-overlay] font-medium ${trendColor}`} />
      <Tip term={regime.volatility} label={regime.volatilityLabel} className={`px-1.5 py-0.5 rounded bg-[--surface-overlay] font-medium ${volColor}`} />
      <span className={`px-1.5 py-0.5 rounded bg-[--surface-overlay] font-medium ${eventColor}`}>{regime.sessionLabel}</span>
      {regime.eventRisk !== "none" && (
        <span className={`px-1.5 py-0.5 rounded bg-[--surface-overlay] font-medium ${eventColor}`}>
          Event risk: {regime.eventRisk}
        </span>
      )}
    </div>
  );
}

/* ================================================================
   Sparkline
   ================================================================ */

function Sparkline({ prices, direction }: { prices: number[]; direction?: string }) {
  if (prices.length < 2) return <div className="w-[80px] h-[32px] bg-[--surface-overlay] rounded" />;
  const w = 80; const h = 32;
  const min = Math.min(...prices); const max = Math.max(...prices);
  const range = max - min || 1;
  const pts = prices.map((v, i) => `${(i / (prices.length - 1)) * w},${h - 2 - ((v - min) / range) * (h - 4)}`).join(" ");
  const last = prices[prices.length - 1];
  const lastY = h - 2 - ((last - min) / range) * (h - 4);
  const isUp = direction === "long" || (prices[prices.length - 1] > prices[0]);

  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" stroke="var(--text-muted)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={lastY} r={2} fill={isUp ? "var(--green)" : "var(--red)"} />
    </svg>
  );
}

/* ================================================================
   Setup card
   ================================================================ */

function SetupCard({ setup }: { setup: Setup }) {
  const dirColor = setup.direction === "long" ? "text-[--green]" : "text-[--red]";
  const dirBg = setup.direction === "long" ? "bg-[--green-bg]" : "bg-[--red-bg]";

  return (
    <Link href={`/setup/${setup.id}`} className="block rounded-lg bg-[--surface-raised] p-3 hover:bg-[--surface-overlay] transition-colors">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded ${dirBg} ${dirColor}`}>
          {setup.direction === "long" ? "Long" : "Short"}
        </span>
        <Tip term={setup.type} label={setup.typeLabel} className="text-2xs text-[--text-muted] font-medium" />
        <Tip term="confidence" label={`${setup.confidence}%`} className="text-xs font-bold tabular-nums text-[--text-primary] ml-auto" />
      </div>
      <p className="text-xs font-semibold text-[--text-primary] mb-0.5">{setup.label}</p>
      <p className="text-2xs text-[--text-secondary] leading-relaxed line-clamp-2">{setup.thesis}</p>
      {setup.catalyst && (
        <p className="text-2xs text-[--text-muted] mt-1">Catalyst: {setup.catalyst}</p>
      )}
    </Link>
  );
}

/* ================================================================
   Instrument picker modal
   ================================================================ */

function InstrumentPicker({ current, onSave, onClose }: {
  current: WatchedInstrument[];
  onSave: (instruments: WatchedInstrument[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(current.map(i => i.symbol)));

  function toggle(inst: WatchedInstrument) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(inst.symbol)) next.delete(inst.symbol);
      else next.add(inst.symbol);
      return next;
    });
  }

  function handleSave() {
    onSave(ALL_INSTRUMENTS.filter(i => selected.has(i.symbol)));
    onClose();
  }

  const groups = ["crypto", "fx", "commodity", "equity"] as const;
  const labels: Record<string, string> = { crypto: "Crypto", fx: "FX", commodity: "Commodities", equity: "Equities & Indices" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[--bg]/80" onClick={onClose}>
      <div className="bg-[--surface-raised] rounded-lg p-4 w-80 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <p className="text-sm font-bold text-[--text-primary] mb-3">Select instruments</p>
        {groups.map(g => (
          <div key={g} className="mb-3">
            <p className="text-2xs font-semibold text-[--text-muted] mb-1">{labels[g]}</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_INSTRUMENTS.filter(i => i.assetClass === g).map(inst => (
                <button
                  key={inst.symbol}
                  onClick={() => toggle(inst)}
                  className={`px-2 py-1 text-2xs font-medium rounded transition-colors ${
                    selected.has(inst.symbol) ? "bg-[--accent] text-white" : "bg-[--surface-overlay] text-[--text-muted]"
                  }`}
                >
                  {inst.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="flex gap-2 mt-3">
          <button onClick={handleSave} className="flex-1 px-3 py-2 text-xs font-semibold rounded bg-[--accent] text-white">Save</button>
          <button onClick={onClose} className="flex-1 px-3 py-2 text-xs font-semibold rounded bg-[--surface-overlay] text-[--text-muted]">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Instrument panel
   ================================================================ */

function InstrumentPanel({ inst }: { inst: InstrumentSummary }) {
  const changePct = inst.changePercent24h;
  const changeColor = changePct > 0 ? "text-[--green]" : changePct < 0 ? "text-[--red]" : "text-[--text-muted]";

  return (
    <div className="space-y-2">
      {/* Header: name + price + sparkline */}
      <div className="flex items-center gap-3">
        <Sparkline prices={inst.priceHistory7d} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[--text-primary]">{inst.name}</span>
            <span className="text-2xs text-[--text-muted]">{inst.symbol}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tabular-nums text-[--text-primary]">{fp(inst.currentPrice)}</span>
            <span className={`text-xs tabular-nums font-medium ${changeColor}`}>
              {changePct > 0 ? "+" : ""}{changePct.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Regime */}
      <RegimePills regime={inst.regime} />

      {/* Favoured / avoid */}
      {inst.regime.favouredStyles.length > 0 && (
        <p className="text-2xs text-[--text-muted]">
          Favoured: {inst.regime.favouredStyles.map((s, i) => (
            <span key={i}>{i > 0 && ", "}<Tip term={s} className="text-[--text-secondary]" /></span>
          ))}
        </p>
      )}

      {/* Setups */}
      {inst.setups.length > 0 ? (
        <div className="space-y-1.5">
          {inst.setups.slice(0, 3).map(s => <SetupCard key={s.id} setup={s} />)}
        </div>
      ) : (
        <p className="text-2xs text-[--text-muted]">No active setups. {inst.todayFocus}</p>
      )}

      {/* Upcoming events */}
      {inst.regime.upcomingEvents.length > 0 && (
        <div className="text-2xs text-[--text-muted]">
          {inst.regime.upcomingEvents.slice(0, 2).map((e, i) => (
            <span key={i} className="mr-2">{e.title} ({e.impact})</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Skeleton loading
   ================================================================ */

function Sk({ w = "100%", h = 10 }: { w?: string; h?: number }) {
  return <div className="rounded bg-[--surface-overlay] animate-pulse" style={{ width: w, height: h }} />;
}

function LoadingSkeleton() {
  const [step, setStep] = useState(0);
  const steps = ["Analysing market regimes", "Detecting setups", "Checking calendar events", "Computing signals"];
  useEffect(() => { const t = setInterval(() => setStep(s => (s + 1) % steps.length), 2000); return () => clearInterval(t); }, [steps.length]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-[--text-muted]">{steps[step]}...</p>
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-2">
          <div className="flex items-center gap-3">
            <Sk w="80px" h={32} />
            <div className="flex-1 space-y-1"><Sk w="40%" h={13} /><Sk w="25%" h={13} /></div>
          </div>
          <div className="flex gap-1.5"><Sk w="60px" h={16} /><Sk w="70px" h={16} /><Sk w="50px" h={16} /></div>
          <div className="rounded-lg bg-[--surface-raised] p-3 space-y-1.5"><Sk w="70%" h={11} /><Sk w="90%" h={10} /></div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   Mission Control
   ================================================================ */

export default function MissionControlPage() {
  const [data, setData] = useState<MissionControlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchedInstrument[]>([]);

  const fetchData = useCallback(async (instruments?: WatchedInstrument[]) => {
    setLoading(true);
    const symbols = (instruments ?? watchlist).map(i => i.symbol).join(",");
    try {
      const res = await fetch(`/api/mission-control${symbols ? `?symbols=${symbols}` : ""}`);
      if (!res.ok) throw new Error();
      const result = await res.json();
      setData(result);
      // Generate alerts from fresh data
      if (result?.instruments) generateAlerts(result.instruments);
    } catch { setData(null); }
    setLoading(false);
  }, [watchlist]);

  useEffect(() => {
    const wl = loadWatchlist();
    setWatchlist(wl);
    fetchData(wl);
  }, []);// eslint-disable-line react-hooks/exhaustive-deps

  function handleSaveWatchlist(instruments: WatchedInstrument[]) {
    setWatchlist(instruments);
    saveWatchlist(instruments);
    fetchData(instruments);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-[--text-primary]">Mission Control</h1>
        <div className="flex gap-3">
          <Link href="/alerts" className="text-xs text-[--text-muted] hover:text-[--text-primary] transition-colors flex items-center gap-1">
            Alerts
            {typeof window !== "undefined" && getUnreadCount() > 0 && (
              <span className="text-2xs font-bold bg-[--accent] text-white px-1 py-0.5 rounded">{getUnreadCount()}</span>
            )}
          </Link>
          <Link href="/journal" className="text-xs text-[--text-muted] hover:text-[--text-primary] transition-colors">Journal</Link>
          <button onClick={() => setShowPicker(true)} className="text-xs text-[--accent]">Watchlist</button>
        </div>
      </div>

      {showPicker && (
        <InstrumentPicker current={watchlist} onSave={handleSaveWatchlist} onClose={() => setShowPicker(false)} />
      )}

      {/* Data feed connectivity — prominent, at top */}
      <FeedStatus />

      {loading && <LoadingSkeleton />}

      {!loading && data && (
        <div className="space-y-6">
          {/* AI Market Brief */}
          {data.aiBrief.headline && (
            <div className="rounded-lg bg-[--surface-raised] p-3">
              <p className="text-2xs font-semibold text-[--text-muted] mb-1">Market brief — what matters this week</p>
              <p className="text-sm text-[--text-primary] leading-relaxed">{data.aiBrief.headline}</p>
              {data.aiBrief.detail && <p className="text-xs text-[--text-secondary] mt-1">{data.aiBrief.detail}</p>}
            </div>
          )}

          {/* Instruments */}
          {data.instruments.map(inst => (
            <div key={inst.symbol} className="pb-5 border-b border-[--surface-overlay] last:border-0">
              <InstrumentPanel inst={inst} />
            </div>
          ))}

          {/* Calendar strip */}
          {data.calendarHighlights.length > 0 && (
            <div>
              <p className="text-2xs font-semibold text-[--text-muted] mb-1.5">Calendar</p>
              <div className="space-y-0.5">
                {data.calendarHighlights.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-2xs">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.impact === "high" ? "bg-[--accent]" : "bg-[--text-muted]"}`} />
                    <span className="text-[--text-primary]">{e.title}</span>
                    <span className="text-[--text-muted]">{e.country}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-2xs text-[--text-muted] pt-2">
            <span>{data.dataSource} · {new Date(data.updatedAt).toLocaleTimeString()}</span>
            <Link href="/settings" className="text-[--accent]">Settings</Link>
          </div>
        </div>
      )}

      {!loading && !data && (
        <div className="rounded-lg bg-[--surface-raised] p-5">
          <p className="text-sm text-[--text-secondary]">Failed to load. <button onClick={() => fetchData()} className="text-[--accent]">Retry</button></p>
        </div>
      )}
    </div>
  );
}
