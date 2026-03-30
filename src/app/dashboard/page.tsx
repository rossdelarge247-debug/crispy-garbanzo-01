"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { MissionControlData, InstrumentSummary, Setup, InstrumentRegime } from "@/types/mission-control";
import { loadWatchlist, saveWatchlist, ALL_INSTRUMENTS } from "@/lib/watchlist";
import type { WatchedInstrument } from "@/types/mission-control";
import { generateAlerts, getUnreadCount } from "@/lib/alerts";
import { getCurrentSession } from "@/services/session-detector";
import Tip from "@/components/Tip";
import FeedStatus from "@/components/FeedStatus";

/* ================================================================ */

function fp(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

/* ================================================================
   Sparkline — 7d price with direction hint
   ================================================================ */

function Spark({ prices, up }: { prices: number[]; up?: boolean }) {
  if (prices.length < 2) return <div className="w-20 h-10 rounded bg-[--surface]" />;
  const w = 80; const h = 40; const pad = 4;
  const min = Math.min(...prices); const max = Math.max(...prices);
  const range = max - min || 1;
  const pts = prices.map((v, i) => `${pad + (i / (prices.length - 1)) * (w - pad * 2)},${h - pad - ((v - min) / range) * (h - pad * 2)}`).join(" ");
  const last = prices[prices.length - 1];
  const ly = h - pad - ((last - min) / range) * (h - pad * 2);

  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" stroke="var(--text-muted)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
      <circle cx={w - pad} cy={ly} r={3} fill={up ? "var(--green)" : up === false ? "var(--red)" : "var(--text-muted)"} />
    </svg>
  );
}

/* ================================================================
   Market Brief — expandable
   ================================================================ */

/* ================================================================
   Session status line
   ================================================================ */

function SessionLine() {
  const session = getCurrentSession("fx"); // FX sessions cover most markets
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const isOpen = session.state === "london" || session.state === "ny" || session.state === "overlap";
  const dotColor = isOpen ? "var(--green)" : "var(--text-muted)";
  const statusText = isOpen ? "Markets are open" : session.state === "asia" ? "Asia session" : "Markets closed";

  return (
    <p className="caption flex items-center gap-2 mt-1">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
      <span>United Kingdom · {timeStr} · <span style={{ color: dotColor }}>{statusText}</span> ({session.label})</span>
    </p>
  );
}

/* ================================================================
   Market Brief — expandable
   ================================================================ */

function MarketBrief({ brief }: { brief: MissionControlData["aiBrief"] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <button onClick={() => setOpen(!open)} className="w-full text-left">
        <p className="section-label mb-3">Market brief</p>
        <p className="text-base font-medium text-[--text] leading-relaxed">{brief.headline}</p>
        {brief.detail && <p className="body-text mt-1">{brief.detail}</p>}
        {brief.sections.length > 0 && (
          <p className="micro mt-3" style={{ color: "var(--accent)" }}>{open ? "Collapse ▴" : `${brief.sections.length} sections ▾`}</p>
        )}
      </button>
      {open && brief.sections.length > 0 && (
        <div className="mt-4 pt-4 space-y-4" style={{ borderTop: "1px solid var(--surface-hover)" }}>
          {brief.sections.map((s, i) => (
            <div key={i}>
              <p className="micro mb-1">{s.title}</p>
              <p className="caption leading-relaxed" style={{ color: "var(--text-secondary)" }}>{s.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Setup card — large confidence number, sentiment overlay
   ================================================================ */

function SetupCard({ setup }: { setup: Setup }) {
  const isLong = setup.direction === "long";
  return (
    <Link href={`/setup/${setup.id}`} className="card-hover block">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="pill" style={{ background: isLong ? "var(--green-soft)" : "var(--red-soft)", color: isLong ? "var(--green)" : "var(--red)" }}>
              {isLong ? "Long" : "Short"}
            </span>
            <Tip term={setup.type} label={setup.typeLabel} className="micro" />
          </div>
          <p className="text-sm font-medium text-[--text]">{setup.label}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="stat-medium" style={{ color: "var(--text)" }}>{setup.confidence}%</p>
          <Tip term="confidence" label="confidence" className="micro" />
        </div>
      </div>
      <p className="caption leading-relaxed mb-2">{setup.thesis}</p>
      {setup.sentiment && (
        <div className="flex items-center gap-2">
          <span className="pill" style={{
            background: setup.sentiment.score > 15 ? "var(--green-soft)" : setup.sentiment.score < -15 ? "var(--red-soft)" : "var(--surface-hover)",
            color: setup.sentiment.score > 15 ? "var(--green)" : setup.sentiment.score < -15 ? "var(--red)" : "var(--text-muted)",
          }}>
            {setup.sentiment.label}
          </span>
          <span className="micro">{setup.sentiment.alignmentLabel}</span>
        </div>
      )}
      {setup.catalyst && <p className="micro mt-2">Catalyst: {setup.catalyst}</p>}
    </Link>
  );
}

/* ================================================================
   Instrument panel
   ================================================================ */

function InstrumentPanel({ inst }: { inst: InstrumentSummary }) {
  const pct = inst.changePercent24h;
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Spark prices={inst.priceHistory7d} up={pct > 0 ? true : pct < 0 ? false : undefined} />
        <div className="flex-1 min-w-0">
          <p className="text-lg font-medium text-[--text]">{inst.name}</p>
          <div className="flex items-baseline gap-3">
            <span className="stat-large">{fp(inst.currentPrice)}</span>
            <span className={`text-sm font-medium ${pct > 0 ? "price-up" : pct < 0 ? "price-down" : ""}`}>
              {pct > 0 ? "+" : ""}{pct.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Regime pills */}
      <div className="flex flex-wrap gap-2">
        <span className="pill" style={{ background: "var(--surface)", color: inst.regime.trend.includes("up") ? "var(--green)" : inst.regime.trend.includes("down") ? "var(--red)" : "var(--text-muted)" }}>
          <Tip term={inst.regime.trend} label={inst.regime.trendLabel} />
        </span>
        <span className="pill" style={{ background: "var(--surface)", color: "var(--text-muted)" }}>
          <Tip term={inst.regime.volatility} label={inst.regime.volatilityLabel} />
        </span>
        <span className="pill" style={{ background: "var(--surface)", color: "var(--text-muted)" }}>{inst.regime.sessionLabel}</span>
        {inst.regime.eventRisk !== "none" && (
          <span className="pill" style={{ background: inst.regime.eventRisk === "high" ? "var(--red-soft)" : "var(--amber-soft)", color: inst.regime.eventRisk === "high" ? "var(--red)" : "var(--amber)" }}>
            Event: {inst.regime.eventRisk}
          </span>
        )}
      </div>

      {/* Favoured styles */}
      {inst.regime.favouredStyles.length > 0 && (
        <p className="caption">
          Favoured: {inst.regime.favouredStyles.map((s, i) => (
            <span key={i}>{i > 0 && ", "}<Tip term={s} className="text-[--text-secondary] font-medium" /></span>
          ))}
        </p>
      )}

      {/* Setups */}
      {inst.setups.length > 0 ? (
        <div className="space-y-3">
          {inst.setups.slice(0, 3).map(s => <SetupCard key={s.id} setup={s} />)}
        </div>
      ) : (
        <p className="caption">{inst.todayFocus}</p>
      )}
    </div>
  );
}

/* ================================================================
   Skeleton
   ================================================================ */

function Sk({ w = "100%", h = 14 }: { w?: string; h?: number }) {
  return <div className="rounded-lg skeleton" style={{ width: w, height: h }} />;
}

function Loading() {
  const [step, setStep] = useState(0);
  const steps = ["Analysing regimes", "Detecting setups", "Checking calendar", "Computing signals"];
  useEffect(() => { const t = setInterval(() => setStep(s => (s + 1) % steps.length), 2000); return () => clearInterval(t); }, [steps.length]);

  return (
    <div className="space-y-6">
      <p className="caption">{steps[step]}...</p>
      {[1, 2, 3].map(i => (
        <div key={i} className="card space-y-3">
          <div className="flex gap-4"><Sk w="80px" h={40} /><div className="flex-1 space-y-2"><Sk w="40%" h={18} /><Sk w="60%" h={28} /></div></div>
          <div className="flex gap-2"><Sk w="80px" h={24} /><Sk w="100px" h={24} /><Sk w="70px" h={24} /></div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   Instrument picker
   ================================================================ */

function Picker({ current, onSave, onClose }: { current: WatchedInstrument[]; onSave: (i: WatchedInstrument[]) => void; onClose: () => void }) {
  const [sel, setSel] = useState(new Set(current.map(i => i.symbol)));
  const toggle = (inst: WatchedInstrument) => setSel(prev => { const n = new Set(prev); n.has(inst.symbol) ? n.delete(inst.symbol) : n.add(inst.symbol); return n; });
  const groups = ["crypto", "fx", "commodity", "equity"] as const;
  const labels: Record<string, string> = { crypto: "Crypto", fx: "FX", commodity: "Commodities", equity: "Equities" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="card w-80 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <p className="text-base font-medium text-[--text] mb-4">Watchlist</p>
        {groups.map(g => (
          <div key={g} className="mb-4">
            <p className="section-label mb-2">{labels[g]}</p>
            <div className="flex flex-wrap gap-2">
              {ALL_INSTRUMENTS.filter(i => i.assetClass === g).map(inst => (
                <button key={inst.symbol} onClick={() => toggle(inst)}
                  className="pill transition-colors" style={{
                    background: sel.has(inst.symbol) ? "var(--accent)" : "var(--surface-hover)",
                    color: sel.has(inst.symbol) ? "white" : "var(--text-muted)",
                  }}>
                  {inst.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="flex gap-2 mt-4">
          <button onClick={() => { onSave(ALL_INSTRUMENTS.filter(i => sel.has(i.symbol))); onClose(); }}
            className="flex-1 py-2.5 text-xs font-semibold rounded-xl" style={{ background: "var(--accent)", color: "white" }}>Save</button>
          <button onClick={onClose}
            className="flex-1 py-2.5 text-xs font-semibold rounded-xl" style={{ background: "var(--surface-hover)", color: "var(--text-muted)" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Dashboard
   ================================================================ */

export default function MissionControlPage() {
  const [data, setData] = useState<MissionControlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchedInstrument[]>([]);

  const fetchData = useCallback(async (instruments?: WatchedInstrument[]) => {
    setLoading(true);
    const symbols = (instruments ?? watchlist).map(i => i.symbol).join(",");
    try {
      const res = await fetch(`/api/mission-control${symbols ? `?symbols=${symbols}` : ""}`);
      if (!res.ok) throw new Error();
      const result = await res.json();
      setData(result);
      if (result?.instruments) generateAlerts(result.instruments);
    } catch { setData(null); }
    setLoading(false);
  }, [watchlist]);

  useEffect(() => { const wl = loadWatchlist(); setWatchlist(wl); fetchData(wl); }, []);// eslint-disable-line

  function handleSave(instruments: WatchedInstrument[]) {
    setWatchlist(instruments); saveWatchlist(instruments); fetchData(instruments);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Welcome, Guest</h1>
          <SessionLine />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Link href="/alerts" className="micro flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
            Alerts
            {typeof window !== "undefined" && getUnreadCount() > 0 && (
              <span className="pill" style={{ background: "var(--accent)", color: "white", fontSize: 10, padding: "2px 6px" }}>{getUnreadCount()}</span>
            )}
          </Link>
          <Link href="/journal" className="micro" style={{ color: "var(--text-muted)" }}>Journal</Link>
          <button onClick={() => setPicker(true)} className="micro" style={{ color: "var(--accent)" }}>Watchlist</button>
          <span style={{ width: 1, height: 16, background: "var(--surface-hover)" }} />
          <button disabled className="pill" style={{ background: "var(--surface)", color: "var(--text-muted)", opacity: 0.6, cursor: "not-allowed" }}>
            Sign up
          </button>
        </div>
      </div>

      {picker && <Picker current={watchlist} onSave={handleSave} onClose={() => setPicker(false)} />}

      {/* Feed status */}
      <FeedStatus />

      {loading && <Loading />}

      {!loading && data && (
        <div className="space-y-8">
          <MarketBrief brief={data.aiBrief} />

          {/* Instruments */}
          {data.instruments.map(inst => (
            <div key={inst.symbol}>
              <InstrumentPanel inst={inst} />
            </div>
          ))}

          {/* Calendar */}
          {data.calendarHighlights.length > 0 && (
            <div>
              <p className="section-label mb-3">Calendar</p>
              <div className="space-y-2">
                {data.calendarHighlights.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.impact === "high" ? "var(--accent)" : "var(--text-muted)" }} />
                    <span className="text-sm text-[--text]">{e.title}</span>
                    <span className="caption ml-auto">{e.country}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between caption pt-4" style={{ borderTop: "1px solid var(--surface)" }}>
            <span>{data.dataSource} · {new Date(data.updatedAt).toLocaleTimeString()}</span>
            <Link href="/settings" style={{ color: "var(--accent)" }}>Settings</Link>
          </div>
        </div>
      )}

      {!loading && !data && (
        <div className="card text-center">
          <p className="body-text">Failed to load. <button onClick={() => fetchData()} style={{ color: "var(--accent)" }}>Retry</button></p>
        </div>
      )}
    </div>
  );
}
