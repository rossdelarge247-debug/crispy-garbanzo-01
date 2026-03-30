"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { MissionControlData, InstrumentSummary, Setup, InstrumentRegime } from "@/types/mission-control";
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
      <span className={`px-1.5 py-0.5 rounded bg-[--surface-overlay] font-medium ${trendColor}`}>{regime.trendLabel}</span>
      <span className={`px-1.5 py-0.5 rounded bg-[--surface-overlay] font-medium ${volColor}`}>{regime.volatilityLabel}</span>
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
    <div className="rounded-lg bg-[--surface-raised] p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded ${dirBg} ${dirColor}`}>
          {setup.direction === "long" ? "Long" : "Short"}
        </span>
        <span className="text-2xs text-[--text-muted] font-medium">{setup.typeLabel}</span>
        <span className="text-xs font-bold tabular-nums text-[--text-primary] ml-auto">{setup.confidence}%</span>
      </div>
      <p className="text-xs font-semibold text-[--text-primary] mb-0.5">{setup.label}</p>
      <p className="text-2xs text-[--text-secondary] leading-relaxed line-clamp-2">{setup.thesis}</p>
      {setup.catalyst && (
        <p className="text-2xs text-[--text-muted] mt-1">Catalyst: {setup.catalyst}</p>
      )}
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
          Favoured: <span className="text-[--text-secondary]">{inst.regime.favouredStyles.join(", ")}</span>
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mission-control");
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch { setData(null); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-lg font-bold text-[--text-primary]">Mission Control</h1>

      {loading && <LoadingSkeleton />}

      {!loading && data && (
        <div className="space-y-6">
          {/* AI Brief */}
          {data.aiBrief.headline && (
            <p className="text-sm text-[--text-secondary]">{data.aiBrief.headline}</p>
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

          <FeedStatus />
          <div className="flex items-center justify-between text-2xs text-[--text-muted] pt-2">
            <span>{data.dataSource} · {new Date(data.updatedAt).toLocaleTimeString()}</span>
            <Link href="/settings" className="text-[--accent]">Settings</Link>
          </div>
        </div>
      )}

      {!loading && !data && (
        <div className="rounded-lg bg-[--surface-raised] p-5">
          <p className="text-sm text-[--text-secondary]">Failed to load. <button onClick={fetchData} className="text-[--accent]">Retry</button></p>
        </div>
      )}
    </div>
  );
}
